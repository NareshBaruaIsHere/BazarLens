import os
import statistics
from datetime import date, datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import engine, get_db
from app.security import digest_token, hash_password, new_session_token, verify_password

API_PREFIX = "/api"
SESSION_COOKIE = "bazarlens_session"
SESSION_DAYS = 30
FRONTEND_ORIGINS = [x.strip() for x in os.getenv("FRONTEND_ORIGIN", "").split(",") if x.strip()]
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"

app = FastAPI(title="BazarLens API", version="1.0.0")
if FRONTEND_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=FRONTEND_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )


@app.exception_handler(HTTPException)
async def http_error_response(request: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request could not be completed."
    return JSONResponse(status_code=exc.status_code, content={"message": message})


@app.exception_handler(RequestValidationError)
async def validation_error_response(request: Request, exc: RequestValidationError):
    fields = {}
    for error in exc.errors():
        field = ".".join(str(part) for part in error.get("loc", ()) if part != "body") or "request"
        fields.setdefault(field, []).append(error.get("msg", "Invalid value."))
    return JSONResponse(status_code=422, content={
        "message": "Please check the submitted fields.", "code": "VALIDATION_ERROR", "errors": fields,
    })


@app.middleware("http")
async def enforce_origin_for_mutations(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and origin:
        if FRONTEND_ORIGINS and origin not in FRONTEND_ORIGINS:
            return Response(status_code=403, content='{"detail":"Origin is not allowed."}', media_type="application/json")
    return await call_next(request)


def user_json(user: models.User) -> dict:
    return {
        "id": str(user.id), "name": user.name, "email": user.email,
        "role": user.role, "status": user.status, "city": user.city,
        # Keep area as a compatibility alias for the frontend versions that
        # used that profile field before the database adopted thana.
        "thana": user.thana, "area": user.thana, "avatarUrl": user.avatar_url or "",
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> models.User:
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in.")
    session = db.scalar(
        select(models.AuthSession).where(
            models.AuthSession.token_hash == digest_token(token),
            models.AuthSession.expires_at > datetime.now(timezone.utc),
        )
    )
    user = db.get(models.User, session.user_id) if session else None
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Please sign in with an active account.")
    return user


CurrentUser = Annotated[models.User, Depends(get_current_user)]
Db = Annotated[Session, Depends(get_db)]


def require_admin(user: CurrentUser) -> models.User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    return user


def record_activity(db: Session, user_id: UUID, message: str) -> None:
    db.add(models.Activity(user_id=user_id, message=message))


def screen_agent_submission(db: Session, user: models.User, product_id: UUID, market_id: UUID,
                           unit: str, price: float, observed_on: date) -> dict:
    if user.role != "agent":
        return {"status": "pending", "flagged": False, "screening": None, "automatic": False}
    automatic_review = select(models.SubmissionReview.id).where(
        models.SubmissionReview.submission_id == models.Submission.id,
        models.SubmissionReview.source == "automatic",
    ).exists()
    history = db.execute(
        select(models.Submission.observed_on, func.avg(models.Submission.price))
        .where(
            models.Submission.product_id == product_id,
            models.Submission.market_id == market_id,
            models.Submission.unit == unit,
            models.Submission.status == "verified",
            models.Submission.user_id != user.id,
            models.Submission.observed_on >= observed_on - timedelta(days=30),
            models.Submission.observed_on <= observed_on,
            ~automatic_review,
        )
        .group_by(models.Submission.observed_on)
    ).all()
    daily_values = [float(avg) for _, avg in history]
    baseline = statistics.median(daily_values) if daily_values else None
    deviation = abs(price - baseline) / baseline * 100 if baseline and baseline > 0 else None
    normal = baseline is not None and len(daily_values) >= 3 and deviation is not None and deviation <= 25
    unusual = baseline is not None and len(daily_values) >= 3 and deviation is not None and deviation > 25
    decision = "auto-approved" if normal else "unusual" if unusual else "insufficient-data"
    reason = (
        "Price is within the 25% screening threshold."
        if normal else
        "Price differs from the baseline by more than 25%."
        if unusual else
        "At least three independent verified observation dates are required."
    )
    return {
        "status": "verified" if normal else "pending",
        "flagged": not normal,
        "automatic": normal,
        "screening": {
            "policy": "market-median-v1", "thresholdPercent": 25,
            "sampleDays": len(daily_values), "baseline": baseline,
            "deviationPercent": deviation, "checkedAt": datetime.now(timezone.utc).isoformat(),
            "decision": decision, "reason": reason,
        },
    }


def safe_commit(db: Session, message: str = "The record conflicts with existing data.") -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=message) from exc


def submission_json(db: Session, row: models.Submission) -> dict:
    product = db.get(models.Product, row.product_id)
    market = db.get(models.Market, row.market_id)
    user = db.get(models.User, row.user_id)
    reviews = db.scalars(
        select(models.SubmissionReview)
        .where(models.SubmissionReview.submission_id == row.id)
        .order_by(models.SubmissionReview.created_at)
    ).all()
    return {
        "id": str(row.id), "userId": str(row.user_id), "productId": str(row.product_id),
        "marketId": str(row.market_id), "area": market.area if market else "",
        "unit": row.unit, "quality": row.quality, "price": float(row.price), "date": row.observed_on.isoformat(),
        "note": row.note or "", "evidenceUrl": row.evidence_url or "",
        "status": row.status, "rejectionReason": row.rejection_reason or "",
        "flagged": row.flagged, "screening": row.screening,
        "createdAt": row.created_at.isoformat(), "updatedAt": row.updated_at.isoformat(),
        "product": product.name if product else "", "category": product.category if product else "",
        "market": market.name if market else "", "user": user.name if user else "",
        "history": [{
            "status": review.status, "reviewerId": str(review.reviewer_id) if review.reviewer_id else None,
            "source": review.source, "reason": review.reason or "", "at": review.created_at.isoformat(),
        } for review in reviews],
    }


def filtered_submissions(db: Session, filters: dict, user: models.User | None = None):
    query = select(models.Submission)
    if user and user.role != "admin":
        query = query.where(models.Submission.user_id == user.id)
    for key, column in (
        ("productId", models.Submission.product_id), ("marketId", models.Submission.market_id),
        ("status", models.Submission.status),
    ):
        if filters.get(key):
            query = query.where(column == filters[key])
    if filters.get("from"):
        query = query.where(models.Submission.observed_on >= filters["from"])
    if filters.get("to"):
        query = query.where(models.Submission.observed_on <= filters["to"])
    return db.scalars(query.order_by(models.Submission.created_at.desc())).all()


@app.get("/")
def root():
    return {"status": "ok", "service": "BazarLens API"}


@app.get("/health")
@app.get("/api/health")
def health(db: Db):
    try:
        db.execute(select(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable.") from exc


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.SignupInput, db: Db):
    if not payload.agreeTerms:
        raise HTTPException(400, "You must agree to the terms.")
    if payload.password != payload.confirmPassword:
        raise HTTPException(400, "Passwords do not match.")
    email = str(payload.email).lower()
    if db.scalar(select(models.User.id).where(func.lower(models.User.email) == email)):
        raise HTTPException(409, "An account with this email already exists.")
    user = models.User(
        name=payload.name.strip(), email=email, password_hash=hash_password(payload.password),
        role="user", status="active", city=payload.city.strip(), thana=payload.thana.strip(),
    )
    db.add(user)
    db.flush()
    db.add(models.UserSettings(user_id=user.id))
    record_activity(db, user.id, "Created an account")
    safe_commit(db)
    return user_json(user)


@app.post("/api/auth/login")
def login(payload: schemas.LoginInput, response: Response, db: Db):
    email = str(payload.email).lower()
    user = db.scalar(select(models.User).where(func.lower(models.User.email) == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")
    if user.status != "active":
        raise HTTPException(403, "This account is blocked. Contact an administrator.")
    token = new_session_token()
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS if payload.remember else 1)
    db.add(models.AuthSession(user_id=user.id, token_hash=digest_token(token), expires_at=expires))
    safe_commit(db)
    response.set_cookie(
        SESSION_COOKIE, token, httponly=True, secure=COOKIE_SECURE,
        samesite="none" if COOKIE_SECURE else "lax", max_age=int((expires - datetime.now(timezone.utc)).total_seconds()),
        path="/",
    )
    return user_json(user)


@app.get("/api/auth/session")
def session(user: CurrentUser):
    return user_json(user)


@app.post("/api/auth/logout")
def logout(response: Response, db: Db, token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None):
    if token:
        row = db.scalar(select(models.AuthSession).where(models.AuthSession.token_hash == digest_token(token)))
        if row:
            db.delete(row)
            db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/", secure=COOKIE_SECURE, httponly=True,
                           samesite="none" if COOKIE_SECURE else "lax")
    return {"success": True}


@app.post("/api/auth/forgot-password")
def forgot_password():
    # Intentionally generic until a verified email delivery provider is configured.
    return {"success": True, "message": "If the account exists, password reset instructions will be sent."}


@app.put("/api/users/me")
def update_profile(payload: schemas.ProfileInput, user: CurrentUser, db: Db):
    email = str(payload.email).lower()
    duplicate = db.scalar(select(models.User.id).where(func.lower(models.User.email) == email, models.User.id != user.id))
    if duplicate:
        raise HTTPException(409, "An account with this email already exists.")
    user.name, user.email = payload.name.strip(), email
    user.city, user.thana, user.avatar_url = payload.city.strip(), payload.thana.strip(), payload.avatarUrl
    user.updated_at = datetime.now(timezone.utc)
    record_activity(db, user.id, "Updated profile")
    safe_commit(db)
    return user_json(user)


@app.post("/api/auth/change-password")
def change_password(payload: schemas.ChangePasswordInput, user: CurrentUser, db: Db):
    if not verify_password(payload.currentPassword, user.password_hash):
        raise HTTPException(400, "Current password is incorrect.")
    if payload.password != payload.confirmPassword:
        raise HTTPException(400, "Passwords do not match.")
    user.password_hash = hash_password(payload.password)
    db.query(models.AuthSession).filter(models.AuthSession.user_id == user.id).delete()
    record_activity(db, user.id, "Changed password")
    safe_commit(db)
    return {"success": True}


@app.get("/api/products")
def list_products(user: CurrentUser, db: Db):
    return [product_json(p) for p in db.scalars(select(models.Product).order_by(models.Product.name)).all()]


@app.get("/api/markets")
def list_markets(user: CurrentUser, db: Db):
    return [market_json(m) for m in db.scalars(select(models.Market).order_by(models.Market.division, models.Market.district, models.Market.area)).all()]


def product_json(row: models.Product) -> dict:
    return {"id": str(row.id), "name": row.name, "category": row.category, "unit": row.unit,
            "active": row.active, "createdAt": row.created_at.isoformat() if row.created_at else None}


def market_json(row: models.Market) -> dict:
    return {"id": str(row.id), "name": row.name, "area": row.area, "district": row.district,
            "division": row.division, "active": row.active,
            "createdAt": row.created_at.isoformat() if row.created_at else None}


@app.post("/api/products", status_code=201)
def create_product(payload: schemas.ProductInput, user: CurrentUser, db: Db):
    require_admin(user)
    row = models.Product(**payload.model_dump())
    db.add(row)
    record_activity(db, user.id, f"Saved product {row.name}")
    safe_commit(db)
    return product_json(row)


@app.put("/api/products/{product_id}")
def update_product(product_id: UUID, payload: schemas.ProductInput, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.get(models.Product, product_id)
    if not row:
        raise HTTPException(404, "Product not found.")
    if row.unit != payload.unit and db.scalar(select(models.Submission.id).where(models.Submission.product_id == row.id)):
        raise HTTPException(409, "Units on referenced products cannot change.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    safe_commit(db)
    return product_json(row)


@app.delete("/api/products/{product_id}")
def delete_product(product_id: UUID, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.get(models.Product, product_id)
    if not row:
        raise HTTPException(404, "Product not found.")
    if db.scalar(select(models.Submission.id).where(models.Submission.product_id == row.id)) or db.scalar(select(models.PriceAlert.id).where(models.PriceAlert.product_id == row.id)):
        raise HTTPException(409, "This product is referenced. Deactivate it instead.")
    db.delete(row)
    db.commit()
    return {"success": True}


@app.post("/api/markets", status_code=201)
def create_market(payload: schemas.MarketInput, user: CurrentUser, db: Db):
    require_admin(user)
    row = models.Market(**payload.model_dump())
    db.add(row)
    record_activity(db, user.id, f"Saved market {row.name}")
    safe_commit(db)
    return market_json(row)


@app.put("/api/markets/{market_id}")
def update_market(market_id: UUID, payload: schemas.MarketInput, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.get(models.Market, market_id)
    if not row:
        raise HTTPException(404, "Market not found.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    safe_commit(db)
    return market_json(row)


@app.delete("/api/markets/{market_id}")
def delete_market(market_id: UUID, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.get(models.Market, market_id)
    if not row:
        raise HTTPException(404, "Market not found.")
    if db.scalar(select(models.Submission.id).where(models.Submission.market_id == row.id)):
        raise HTTPException(409, "This market has submissions. Deactivate it instead.")
    db.delete(row)
    db.commit()
    return {"success": True}


@app.get("/api/submissions")
def list_submissions(
    user: CurrentUser, db: Db,
    productId: UUID | None = None, marketId: UUID | None = None,
    status: str | None = None, from_: date | None = Query(default=None, alias="from"),
    to: date | None = None,
):
    rows = filtered_submissions(db, {"productId": productId, "marketId": marketId, "status": status, "from": from_, "to": to}, user)
    return [submission_json(db, row) for row in rows]


@app.post("/api/submissions", status_code=201)
def create_submission(payload: schemas.SubmissionInput, user: CurrentUser, db: Db):
    if payload.date > date.today():
        raise HTTPException(400, "Submission date cannot be in the future.")
    product, market = db.get(models.Product, payload.productId), db.get(models.Market, payload.marketId)
    if not product or not market or not product.active or not market.active:
        raise HTTPException(400, "Choose an active product and market.")
    if payload.unit != product.unit:
        raise HTTPException(400, "Submission unit does not match the product.")
    screening = screen_agent_submission(db, user, product.id, market.id, product.unit, payload.price, payload.date)
    row = models.Submission(
        user_id=user.id, product_id=product.id, market_id=market.id, unit=product.unit,
        price=payload.price, observed_on=payload.date, quality=payload.quality,
        note=payload.note,
        evidence_url=payload.evidenceUrl, status=screening["status"],
        flagged=screening["flagged"], screening=screening["screening"],
    )
    db.add(row)
    db.flush()
    if screening["automatic"]:
        db.add(models.SubmissionReview(
            submission_id=row.id, status="verified", reviewer_id=None,
            source="automatic", reason=screening["screening"]["reason"],
        ))
    record_activity(db, user.id, "Submitted a market price")
    safe_commit(db)
    return submission_json(db, row)


@app.put("/api/submissions/{submission_id}")
def update_submission(submission_id: UUID, payload: schemas.SubmissionInput, user: CurrentUser, db: Db):
    row = db.get(models.Submission, submission_id)
    if not row:
        raise HTTPException(404, "Submission not found.")
    if row.user_id != user.id or row.status != "pending":
        raise HTTPException(403, "Only your own pending submissions can be edited.")
    product, market = db.get(models.Product, payload.productId), db.get(models.Market, payload.marketId)
    if not product or not market or not product.active or not market.active or product.unit != payload.unit:
        raise HTTPException(400, "Choose an active product and market with the matching unit.")
    if payload.date > date.today():
        raise HTTPException(400, "Submission date cannot be in the future.")
    screening = screen_agent_submission(db, user, product.id, market.id, product.unit, payload.price, payload.date)
    row.product_id, row.market_id, row.unit = product.id, market.id, product.unit
    row.price, row.observed_on, row.quality = payload.price, payload.date, payload.quality
    row.note, row.evidence_url = payload.note, payload.evidenceUrl
    row.updated_at = datetime.now(timezone.utc)
    row.status, row.flagged, row.screening = screening["status"], screening["flagged"], screening["screening"]
    row.rejection_reason = ""
    if screening["automatic"]:
        db.add(models.SubmissionReview(
            submission_id=row.id, status="verified", reviewer_id=None,
            source="automatic", reason=screening["screening"]["reason"],
        ))
    safe_commit(db)
    return submission_json(db, row)


@app.delete("/api/submissions/{submission_id}")
def delete_submission(submission_id: UUID, user: CurrentUser, db: Db):
    row = db.get(models.Submission, submission_id)
    if not row:
        raise HTTPException(404, "Submission not found.")
    if row.user_id != user.id or row.status != "pending":
        raise HTTPException(403, "Only your own pending submissions can be deleted.")
    db.delete(row)
    db.commit()
    return {"success": True}


@app.post("/api/submissions/{submission_id}/review")
def review_submission(submission_id: UUID, payload: schemas.ReviewInput, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.scalar(
        select(models.Submission).where(models.Submission.id == submission_id).with_for_update()
    )
    if not row:
        raise HTTPException(404, "Submission not found.")
    if row.status != "pending":
        raise HTTPException(409, "This submission has already been reviewed.")
    reason = payload.reason.strip()
    if payload.status == "rejected" and not reason:
        raise HTTPException(400, "A rejection reason is required.")
    row.status = payload.status
    row.rejection_reason = reason if payload.status == "rejected" else ""
    row.updated_at = datetime.now(timezone.utc)
    db.add(models.SubmissionReview(
        submission_id=row.id, status=payload.status, reviewer_id=user.id,
        source="manual", reason=reason,
    ))
    record_activity(db, user.id, f"{payload.status} a submission")
    safe_commit(db)
    return submission_json(db, row)


def prices_query(db: Session, product_id: UUID | None = None, area: str | None = None):
    latest = select(
        models.Submission.product_id.label("pid"), models.Submission.market_id.label("mid"),
        models.Submission.unit.label("unit"), func.max(models.Submission.observed_on).label("day"),
    ).where(models.Submission.status == "verified").group_by(
        models.Submission.product_id, models.Submission.market_id, models.Submission.unit
    ).subquery()
    query = (
        select(
            models.Product.id.label("productId"), models.Product.name.label("product"),
            models.Product.category.label("category"), models.Market.id.label("marketId"),
            models.Market.name.label("market"), models.Market.area.label("area"),
            models.Submission.unit.label("unit"), models.Submission.observed_on.label("date"),
            func.avg(models.Submission.price).label("average"),
            func.min(models.Submission.price).label("lowest"), func.max(models.Submission.price).label("highest"),
        )
        .join(latest, (models.Submission.product_id == latest.c.pid) & (models.Submission.market_id == latest.c.mid) &
              (models.Submission.unit == latest.c.unit) & (models.Submission.observed_on == latest.c.day))
        .join(models.Product, models.Product.id == models.Submission.product_id)
        .join(models.Market, models.Market.id == models.Submission.market_id)
        .where(models.Submission.status == "verified")
    )
    if product_id:
        query = query.where(models.Product.id == product_id)
    if area:
        query = query.where(models.Market.area == area)
    rows = db.execute(query.group_by(
        models.Product.id, models.Product.name, models.Product.category,
        models.Market.id, models.Market.name, models.Market.area,
        models.Submission.unit, models.Submission.observed_on,
    )).all()
    result = [{
        "id": f"{r.productId}:{r.marketId}:{r.unit}", "productId": str(r.productId),
        "product": r.product, "category": r.category, "marketId": str(r.marketId),
        "market": r.market, "area": r.area, "unit": r.unit, "date": r.date.isoformat(),
        "average": float(r.average), "lowest": float(r.lowest), "highest": float(r.highest),
    } for r in rows]
    if result:
        history_query = select(models.Submission).join(
            models.Market, models.Market.id == models.Submission.market_id
        ).where(models.Submission.status == "verified")
        if product_id:
            history_query = history_query.where(models.Submission.product_id == product_id)
        if area:
            history_query = history_query.where(models.Market.area == area)
        history_rows = db.scalars(history_query.order_by(models.Submission.observed_on)).all()
        product_by_id = {p.id: p for p in db.scalars(select(models.Product)).all()}
        market_by_id = {m.id: m for m in db.scalars(select(models.Market)).all()}
        user_by_id = {u.id: u for u in db.scalars(select(models.User)).all()}
        grouped_history = {}
        for row in history_rows:
            key = f"{row.product_id}:{row.market_id}:{row.unit}"
            product, market, contributor = product_by_id.get(row.product_id), market_by_id.get(row.market_id), user_by_id.get(row.user_id)
            grouped_history.setdefault(key, []).append({
                "id": str(row.id), "userId": str(row.user_id), "productId": str(row.product_id),
                "marketId": str(row.market_id), "area": market.area if market else "",
                "unit": row.unit, "quality": row.quality, "price": float(row.price),
                "date": row.observed_on.isoformat(),
                "note": row.note or "", "evidenceUrl": row.evidence_url or "",
                "status": row.status, "rejectionReason": row.rejection_reason or "",
                "createdAt": row.created_at.isoformat(), "updatedAt": row.updated_at.isoformat(),
                "product": product.name if product else "", "category": product.category if product else "",
                "market": market.name if market else "", "user": contributor.name if contributor else "",
            })
        for price in result:
            price["history"] = grouped_history.get(price["id"], [])
    return result


@app.get("/api/prices")
def get_prices(user: CurrentUser, db: Db, productId: UUID | None = None, area: str | None = None):
    return prices_query(db, productId, area)


@app.get("/api/statistics")
def get_public_statistics(db: Db, productId: UUID | None = None, area: str | None = None):
    products = db.scalars(select(models.Product).where(models.Product.active.is_(True)).order_by(models.Product.name)).all()
    selected = productId or (products[0].id if products else None)
    trend_rows = []
    if selected:
        trend_query = select(models.Submission.observed_on, func.avg(models.Submission.price)).join(
            models.Market, models.Market.id == models.Submission.market_id
        ).where(models.Submission.status == "verified", models.Submission.product_id == selected)
        if area:
            trend_query = trend_query.where(models.Market.area == area)
        trend_rows = db.execute(trend_query.group_by(models.Submission.observed_on).order_by(models.Submission.observed_on)).all()
    public_fields = ("id", "productId", "product", "category", "marketId", "market", "area",
                     "unit", "date", "average", "lowest", "highest")
    public_prices = [{key: row[key] for key in public_fields} for row in prices_query(db, productId, area)]
    return {
        "prices": public_prices,
        "trend": [{"date": d.isoformat(), "value": float(v)} for d, v in trend_rows],
        "products": [{"id": str(p.id), "name": p.name, "unit": p.unit} for p in products],
        "areas": db.scalars(select(models.Market.area).distinct().order_by(models.Market.area)).all(),
    }


@app.get("/api/trends")
def get_trends(user: CurrentUser, db: Db, productId: UUID | None = None, area: str | None = None,
               from_: date | None = Query(default=None, alias="from"), to: date | None = None):
    query = select(models.Submission.observed_on, func.avg(models.Submission.price)).join(
        models.Market, models.Market.id == models.Submission.market_id
    ).where(models.Submission.status == "verified")
    if productId:
        query = query.where(models.Submission.product_id == productId)
    if area:
        query = query.where(models.Market.area == area)
    if from_:
        query = query.where(models.Submission.observed_on >= from_)
    if to:
        query = query.where(models.Submission.observed_on <= to)
    rows = db.execute(query.group_by(models.Submission.observed_on).order_by(models.Submission.observed_on)).all()
    return [{"date": d.isoformat(), "value": float(v)} for d, v in rows]


@app.get("/api/alerts")
def list_alerts(user: CurrentUser, db: Db):
    rows = db.scalars(select(models.PriceAlert).where(models.PriceAlert.user_id == user.id).order_by(models.PriceAlert.created_at.desc())).all()
    products = {p.id: p for p in db.scalars(select(models.Product)).all()}
    return [{**{k: getattr(a, k) for k in ("id", "area", "direction", "enabled", "created_at")},
             "id": str(a.id), "userId": str(a.user_id), "productId": str(a.product_id),
             "targetPrice": float(a.target_price), "createdAt": a.created_at.isoformat(),
             "product": products[a.product_id].name, "unit": products[a.product_id].unit}
            for a in rows if a.product_id in products]


@app.post("/api/alerts", status_code=201)
def create_alert(payload: schemas.AlertInput, user: CurrentUser, db: Db):
    product = db.get(models.Product, payload.productId)
    if not product or not product.active:
        raise HTTPException(400, "Choose an active product.")
    if payload.area and not db.scalar(select(models.Market.id).where(models.Market.area == payload.area)):
        raise HTTPException(400, "Choose a known area.")
    row = models.PriceAlert(user_id=user.id, product_id=product.id, area=payload.area,
                            direction=payload.direction, target_price=payload.targetPrice, enabled=payload.enabled)
    db.add(row)
    safe_commit(db)
    return {"id": str(row.id), "userId": str(row.user_id), "productId": str(row.product_id),
            "area": row.area, "direction": row.direction, "targetPrice": float(row.target_price),
            "enabled": row.enabled, "createdAt": row.created_at.isoformat()}


@app.put("/api/alerts/{alert_id}")
def update_alert(alert_id: UUID, payload: schemas.AlertInput, user: CurrentUser, db: Db):
    row = db.get(models.PriceAlert, alert_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Alert not found.")
    product = db.get(models.Product, payload.productId)
    if not product or not product.active:
        raise HTTPException(400, "Choose an active product.")
    row.product_id, row.area = product.id, payload.area
    row.direction, row.target_price, row.enabled = payload.direction, payload.targetPrice, payload.enabled
    row.updated_at = datetime.now(timezone.utc)
    safe_commit(db)
    return {"id": str(row.id), "userId": str(row.user_id), "productId": str(row.product_id),
            "area": row.area, "direction": row.direction, "targetPrice": float(row.target_price),
            "enabled": row.enabled, "createdAt": row.created_at.isoformat()}


@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: UUID, user: CurrentUser, db: Db):
    row = db.get(models.PriceAlert, alert_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Alert not found.")
    db.delete(row)
    db.commit()
    return {"success": True}


@app.get("/api/settings")
def get_settings(user: CurrentUser, db: Db):
    row = db.get(models.UserSettings, user.id)
    return {"defaultArea": row.default_area if row else "", "emailAlerts": row.email_alerts if row else False,
            "inAppNotifications": row.in_app_notifications if row else True,
            "compactTables": row.compact_tables if row else False}


@app.put("/api/settings")
def save_settings(payload: schemas.SettingsInput, user: CurrentUser, db: Db):
    if payload.defaultArea and not db.scalar(select(models.Market.id).where(models.Market.area == payload.defaultArea)):
        raise HTTPException(400, "Choose a known area.")
    row = db.get(models.UserSettings, user.id)
    if not row:
        row = models.UserSettings(user_id=user.id)
        db.add(row)
    row.default_area = payload.defaultArea
    row.email_alerts = payload.emailAlerts
    row.in_app_notifications = payload.inAppNotifications
    row.compact_tables = payload.compactTables
    row.updated_at = datetime.now(timezone.utc)
    safe_commit(db)
    return get_settings(user, db)


@app.post("/api/settings/reset")
def reset_settings(user: CurrentUser, db: Db):
    row = db.get(models.UserSettings, user.id)
    if row:
        row.default_area = ""
        row.email_alerts = False
        row.in_app_notifications = True
        row.compact_tables = False
        row.updated_at = datetime.now(timezone.utc)
    else:
        db.add(models.UserSettings(user_id=user.id))
    db.commit()
    return get_settings(user, db)


@app.get("/api/notifications")
def notifications(user: CurrentUser, db: Db):
    settings_row = db.get(models.UserSettings, user.id)
    if settings_row and not settings_row.in_app_notifications:
        return []
    result = []
    for alert in db.scalars(select(models.PriceAlert).where(models.PriceAlert.user_id == user.id, models.PriceAlert.enabled.is_(True))):
        product = db.get(models.Product, alert.product_id)
        for price in prices_query(db, alert.product_id, alert.area or None):
            crossed = price["average"] > float(alert.target_price) if alert.direction == "above" else price["average"] < float(alert.target_price)
            if crossed:
                result.append({"id": f"{alert.id}-{price['id']}",
                               "message": f"{price['product']} is ৳{price['average']:.2f}/{price['unit']} in {price['area']}, {alert.direction} your ৳{float(alert.target_price):g} target.",
                               "emailPreview": bool(settings_row and settings_row.email_alerts)})
    return result


@app.get("/api/summary")
def summary(user: CurrentUser, db: Db):
    query = select(models.Submission)
    if user.role != "admin":
        query = query.where(models.Submission.user_id == user.id)
    rows = db.scalars(query.order_by(models.Submission.created_at.desc())).all()
    counts = {name: sum(1 for row in rows if row.status == name) for name in ("pending", "verified", "rejected")}
    result = {"total": len(rows), **counts,
              "products": db.scalar(select(func.count()).select_from(models.Product)) or 0,
              "markets": db.scalar(select(func.count()).select_from(models.Market)) or 0,
              "prices": prices_query(db), "notifications": notifications(user, db),
              "recent": [submission_json(db, row) for row in rows[:6]]}
    if user.role == "admin":
        all_users = db.scalars(select(models.User)).all()
        result.update(users=len(all_users), activeUsers=sum(u.status == "active" for u in all_users),
                      blockedUsers=sum(u.status == "blocked" for u in all_users))
    return result


@app.get("/api/analytics")
def analytics(user: CurrentUser, db: Db):
    query = select(models.Submission)
    if user.role != "admin":
        query = query.where(models.Submission.user_id == user.id)
    rows = db.scalars(query.order_by(models.Submission.created_at.desc())).all()
    product_names = {p.id: p.name for p in db.scalars(select(models.Product)).all()}
    market_areas = {m.id: m.area for m in db.scalars(select(models.Market)).all()}
    user_names = {u.id: u.name for u in db.scalars(select(models.User)).all()}

    def grouped(pairs):
        counts = {}
        for label, _ in pairs:
            counts[label] = counts.get(label, 0) + 1
        return [{"label": label, "value": value} for label, value in counts.items()]

    statuses = grouped((r.status, 1) for r in rows)
    by_product = grouped((product_names.get(r.product_id, "Unknown"), 1) for r in rows)
    by_area = grouped((market_areas.get(r.market_id, "Unknown"), 1) for r in rows)
    by_month = grouped(((r.observed_on.strftime("%Y-%m")), 1) for r in rows)
    contributors = grouped((user_names.get(r.user_id, "Unknown"), 1) for r in rows)
    contributors.sort(key=lambda item: item["value"], reverse=True)
    user_growth = []
    if user.role == "admin":
        users = db.scalars(select(models.User)).all()
        user_growth = grouped((u.created_at.strftime("%Y-%m"), 1) for u in users if u.created_at)
    activities_query = select(models.Activity).order_by(models.Activity.created_at.desc()).limit(20)
    if user.role != "admin":
        activities_query = activities_query.where(models.Activity.user_id == user.id)
    activity_rows = db.scalars(activities_query).all()
    total = len(rows)
    return {
        "total": total,
        "verifiedRate": round(sum(r.status == "verified" for r in rows) / total * 100) if total else 0,
        "pending": sum(r.status == "pending" for r in rows),
        "byStatus": statuses, "byProduct": by_product, "byArea": by_area,
        "byMonth": sorted(by_month, key=lambda item: item["label"]),
        "contributors": contributors,
        "userGrowth": sorted(user_growth, key=lambda item: item["label"]),
        "prices": prices_query(db),
        "rejected": [submission_json(db, r) for r in rows if r.status == "rejected"],
        "flagged": [submission_json(db, r) for r in rows if r.flagged and r.status == "pending"],
        "activity": [{"id": str(a.id), "userId": str(a.user_id), "message": a.message,
                      "createdAt": a.created_at.isoformat()} for a in activity_rows],
    }


@app.get("/api/database/stats")
def database_stats(user: CurrentUser, db: Db):
    require_admin(user)
    counts = {}
    for name, model in (
        ("users", models.User), ("products", models.Product), ("markets", models.Market),
        ("submissions", models.Submission), ("alerts", models.PriceAlert), ("activity", models.Activity),
    ):
        counts[name] = db.scalar(select(func.count()).select_from(model)) or 0
    return counts


@app.get("/api/users")
def list_users(user: CurrentUser, db: Db):
    require_admin(user)
    users = db.scalars(select(models.User).order_by(models.User.created_at.desc())).all()
    result = []
    for row in users:
        data = user_json(row)
        data["contributions"] = db.scalar(select(func.count()).select_from(models.Submission).where(models.Submission.user_id == row.id)) or 0
        result.append(data)
    return result


@app.post("/api/users", status_code=201)
def create_user(payload: schemas.UserCreateInput, user: CurrentUser, db: Db):
    require_admin(user)
    data = payload.model_dump()
    password = data.pop("password")
    data["avatar_url"] = data.pop("avatarUrl")
    data["password_hash"] = hash_password(password)
    row = models.User(**data)
    db.add(row)
    db.flush()
    db.add(models.UserSettings(user_id=row.id))
    record_activity(db, user.id, f"Added user {row.name}")
    safe_commit(db, "An account with this email already exists.")
    return user_json(row)


@app.put("/api/users/{user_id}")
def update_user(user_id: UUID, payload: schemas.UserUpdateInput, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.get(models.User, user_id)
    if not row:
        raise HTTPException(404, "User not found.")
    if row.id == user.id and payload.status == "blocked":
        raise HTTPException(400, "You cannot block yourself.")
    if row.role == "admin" and row.status == "active" and (payload.role != "admin" or payload.status != "active"):
        remaining = db.scalar(select(func.count()).select_from(models.User).where(
            models.User.id != row.id, models.User.role == "admin", models.User.status == "active"))
        if not remaining:
            raise HTTPException(409, "Keep at least one active administrator.")
    values = payload.model_dump()
    row.name, row.email, row.city, row.thana = values["name"], str(values["email"]).lower(), values["city"], values["thana"]
    row.avatar_url, row.role, row.status = values["avatarUrl"], values["role"], values["status"]
    row.updated_at = datetime.now(timezone.utc)
    safe_commit(db, "An account with this email already exists.")
    return user_json(row)


@app.delete("/api/users/{user_id}")
def delete_user(user_id: UUID, user: CurrentUser, db: Db):
    require_admin(user)
    row = db.get(models.User, user_id)
    if not row:
        raise HTTPException(404, "User not found.")
    if row.id == user.id:
        raise HTTPException(400, "You cannot delete yourself.")
    if row.role == "admin" and row.status == "active":
        remaining = db.scalar(select(func.count()).select_from(models.User).where(
            models.User.id != row.id, models.User.role == "admin", models.User.status == "active"))
        if not remaining:
            raise HTTPException(409, "Keep at least one active administrator.")
    if db.scalar(select(models.Submission.id).where(models.Submission.user_id == row.id)) or db.scalar(
        select(models.SubmissionReview.id).where(models.SubmissionReview.reviewer_id == row.id)
    ):
        raise HTTPException(409, "This user has submission history. Block the account instead.")
    db.query(models.Activity).filter(models.Activity.user_id == row.id).delete(synchronize_session=False)
    db.delete(row)
    db.commit()
    return {"success": True}


@app.on_event("startup")
def verify_database_configuration():
    # Do not create tables here: schema changes are applied explicitly in Neon.
    if os.getenv("CHECK_DATABASE_ON_STARTUP", "true").lower() == "true":
        with engine.connect() as connection:
            connection.execute(select(1))
