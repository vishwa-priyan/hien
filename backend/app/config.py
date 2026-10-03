import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "HIEN Backend & ML API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/hien_db")
    
    # JWT Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "hien-super-secret-key-production-change-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Paths to ML Artifacts
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    CNN_MODEL_PATH: str = os.path.join(BASE_DIR, "models", "cnn", "mug_condition_classifier.keras")
    RF_MODEL_PATH: str = os.path.join(BASE_DIR, "models", "hien_artifacts random forest", "return_classifier.joblib")
    RF_MAPPING_PATH: str = os.path.join(BASE_DIR, "models", "hien_artifacts random forest", "class_mapping.json")
    RF_METADATA_PATH: str = os.path.join(BASE_DIR, "models", "hien_artifacts random forest", "model_metadata.json")
    HIST_MODEL_PATH: str = os.path.join(BASE_DIR, "models", "hist model", "model.joblib")
    HIST_ENCODER_PATH: str = os.path.join(BASE_DIR, "models", "hist model", "encoder.joblib")
    HIST_DATASET_PATH: str = os.path.join(BASE_DIR, "models", "hist model", "hien_demand_forecasting_dataset.csv")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Uploads
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "backend", "uploads")

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
