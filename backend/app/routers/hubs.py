from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import json
import psycopg
from ..database import get_db

router = APIRouter(prefix="/hubs", tags=["Hubs"])

def parse_hub_row(row: dict) -> dict:
    d = dict(row)
    for col in ["supported_categories", "handling_capabilities"]:
        if col in d and isinstance(d[col], str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                d[col] = []
    # Map snake_case to camelCase for frontend matching
    return {
        "id": d["id"],
        "name": d["name"],
        "type": d["type"],
        "address": d["address"],
        "city": d["city"],
        "state": d["state"],
        "zip": d["zip"],
        "lat": float(d["lat"]),
        "lng": float(d["lng"]),
        "capacity": d["capacity"],
        "currentOccupancy": d["current_occupancy"],
        "operatingStatus": d["operating_status"],
        "supportedCategories": d.get("supported_categories", []),
        "handlingCapabilities": d.get("handling_capabilities", []),
        "contactPerson": d["contact_person"],
        "contactPhone": d["contact_phone"],
        "contactEmail": d["contact_email"],
    }

@router.get("")
def list_hubs(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM hubs ORDER BY name ASC")
        rows = cur.fetchall()
        return [parse_hub_row(r) for r in rows]

@router.get("/{hub_id}")
def get_hub(hub_id: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM hubs WHERE id = %s", (hub_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hub not found")
        return parse_hub_row(row)

class HubCreate(BaseModel):
    id: str
    name: str
    type: str
    address: str
    city: str
    state: str
    zip: str
    lat: float
    lng: float
    capacity: int = 1000
    currentOccupancy: int = 0
    operatingStatus: str = "active"
    supportedCategories: list[str] = []
    handlingCapabilities: list[str] = []
    contactPerson: str
    contactPhone: str
    contactEmail: str

@router.post("", status_code=status.HTTP_201_CREATED)
def create_hub(hub: HubCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO hubs (
                id, name, type, address, city, state, zip, lat, lng,
                capacity, current_occupancy, operating_status,
                supported_categories, handling_capabilities,
                contact_person, contact_phone, contact_email
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            hub.id, hub.name, hub.type, hub.address, hub.city, hub.state, hub.zip,
            hub.lat, hub.lng, hub.capacity, hub.currentOccupancy, hub.operatingStatus,
            json.dumps(hub.supportedCategories), json.dumps(hub.handlingCapabilities),
            hub.contactPerson, hub.contactPhone, hub.contactEmail
        ))
        row = cur.fetchone()
        db.commit()
        return parse_hub_row(row)

@router.patch("/{hub_id}")
@router.put("/{hub_id}")
def update_hub(hub_id: str, updates: dict, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM hubs WHERE id = %s", (hub_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Hub not found")

        # Map camelCase to snake_case
        field_map = {
            "name": "name", "type": "type", "address": "address",
            "city": "city", "state": "state", "zip": "zip",
            "lat": "lat", "lng": "lng", "capacity": "capacity",
            "currentOccupancy": "current_occupancy",
            "operatingStatus": "operating_status",
            "contactPerson": "contact_person",
            "contactPhone": "contact_phone",
            "contactEmail": "contact_email"
        }
        for k, col in field_map.items():
            if k in updates:
                cur.execute(f"UPDATE hubs SET {col} = %s WHERE id = %s", (updates[k], hub_id))

        if "supportedCategories" in updates:
            cur.execute("UPDATE hubs SET supported_categories = %s WHERE id = %s", (json.dumps(updates["supportedCategories"]), hub_id))
        if "handlingCapabilities" in updates:
            cur.execute("UPDATE hubs SET handling_capabilities = %s WHERE id = %s", (json.dumps(updates["handlingCapabilities"]), hub_id))

        cur.execute("UPDATE hubs SET updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *", (hub_id,))
        row = cur.fetchone()
        db.commit()
        return parse_hub_row(row)
