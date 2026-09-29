from fastapi import FastAPI

from app.database import test_connection

app = FastAPI(title="BazarLens API")


@app.get("/")
def root():
    return {"status": "ok", "message": "BazarLens API is running"}


@app.get("/health")
def health():
    try:
        return {"status": "ok", "database": test_connection()}
    except Exception as exc:  # pragma: no cover - defensive runtime check
        return {"status": "error", "database": str(exc)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)