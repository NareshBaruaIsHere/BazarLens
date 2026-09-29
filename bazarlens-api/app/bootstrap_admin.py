"""Create the initial administrator once, from a trusted terminal."""

from getpass import getpass

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import User, UserSettings
from app.security import hash_password


def main() -> None:
    name = input("Admin full name: ").strip()
    email = input("Admin email: ").strip().lower()
    city = input("City: ").strip()
    thana = input("Thana: ").strip()
    password = getpass("Password (12+ characters): ")
    if len(password) < 12:
        raise SystemExit("Use a password with at least 12 characters.")

    with SessionLocal() as db:
        existing_admin = db.scalar(select(func.count()).select_from(User).where(User.role == "admin"))
        if existing_admin:
            raise SystemExit("An administrator already exists; bootstrap is disabled.")
        user = User(
            name=name, email=email, city=city, thana=thana, role="admin",
            status="active", password_hash=hash_password(password),
        )
        db.add(user)
        db.flush()
        db.add(UserSettings(user_id=user.id))
        db.commit()
    print("Initial administrator created.")


if __name__ == "__main__":
    main()
