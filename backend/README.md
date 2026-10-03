# HIEN (Hyperlocal Inventory Exchange Network) — Backend & ML Integration

HIEN is an intelligent reverse-logistics optimization and hyperlocal fulfillment platform that reduces return costs and carbon emissions by assessing returned products, forecasting local SKU demand, balancing inventory across nearby hubs, and fulfilling orders locally.

---

## 1. System Architecture

```
┌────────────────────────────────┐
│   React 19 Frontend (:5173)    │
└───────────────┬────────────────┘
                │ JWT REST API /api
┌───────────────▼────────────────────────────────────────────┐
│              FastAPI Backend Application (:8000)            │
│  - Authentication & RBAC        - Hub & Product Management │
│  - Returns Lifecycle QA         - Hyperlocal Transfers     │
│  - Orders & Inventory Reserves  - Sustainability Analytics │
└───────────────┬───────────────────────────────┬────────────┘
                │                               │
┌───────────────▼─────────────────┐   ┌─────────▼────────────────────┐
│   PostgreSQL 18 Database        │   │    Loaded ML Inference Models│
│   (hien_db on port 5432)        │   │  1. MobileNetV2 CNN (.keras) │
│  - Users, Hubs, Products        │   │  2. Random Forest (.joblib)  │
│  - Returns, Images, Assessments │   │  3. HistGradientBoosting Reg │
│  - Inventory, Transfers, Orders │   └──────────────────────────────┘
└─────────────────────────────────┘
```

---

## 2. Integrated Machine Learning Models

### 1. MobileNetV2 CNN Image Condition Classifier
- **Model Path**: `models/cnn/mug_condition_classifier.keras`
- **Engine**: Keras 3 with PyTorch backend (`KERAS_BACKEND=torch`)
- **Input**: RGB Image Tensor `(1, 224, 224, 3)`, float32 normalized `[0, 1]`
- **Output**: Class probabilities for `defective` (index 0) and `good` (index 1)
- **Endpoint**: `POST /api/assessments/predict-condition`

### 2. Random Forest Return Eligibility & Disposition Classifier
- **Model Path**: `models/hien_artifacts random forest/return_classifier.joblib`
- **Engine**: scikit-learn 1.6.1 + joblib
- **Feature Space**: 16 numeric features + 11 categorical features
- **Output**: Predicted disposition (`approved_resale`, `refurbishment_required`, `not_suitable`), class probabilities, and review recommendation flag (`confidence < 0.65`)
- **Endpoint**: `POST /api/assessments/predict-disposition`

### 3. HistGradientBoosting Demand Forecaster
- **Model Path**: `models/hist model/model.joblib` & `encoder.joblib`
- **Engine**: scikit-learn 1.6.1 + OrdinalEncoder + Pandas
- **Features**: Lag 1 & 2 features, 3-day rolling window mean & standard deviation, calendar cycles
- **Output**: Non-negative 7-day predicted demand trajectory with upper & lower confidence intervals
- **Endpoint**: `POST /api/forecasts/run`

---

## 3. Quickstart & Running Instructions

### 1. Virtual Environment & Dependencies
```bash
# Activated virtual environment is in .venv
.venv\Scripts\activate
```

### 2. Database Setup & Seeding
```bash
# Schema migration
psql -U postgres -h localhost -p 5432 -d hien_db -f database/schema.sql

# Seed data from frontend initial state
python database/seed.py
```

### 3. Start Backend Server
```bash
.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI Swagger docs available at: `http://localhost:8000/docs`

### 4. Start Frontend
```bash
cd Frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

### 5. Running Tests
```bash
# Backend & ML test suite
.venv\Scripts\python.exe backend/test_api.py

# Frontend vitest suite
npm --prefix Frontend test

# Frontend production build validation
npm --prefix Frontend run build
```
