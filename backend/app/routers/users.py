from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import psycopg
from ..database import get_db
from ..auth.security import get_password_hash

router = APIRouter(prefix="/users", tags=["User Management"])

def parse_user_row(row: dict) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "name": d["name"],
        "email": d["email"],
        "role": d["role"],
        "assignedHubId": d.get("assigned_hub_id"),
        "assignedHubName": d.get("assigned_hub_name"),
        "status": d.get("status", "active"),
        "lastActive": d.get("last_active", "Just now"),
        "avatarUrl": d.get("avatar_url")
    }

@router.get("")
def list_users(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM users ORDER BY name ASC")
        rows = cur.fetchall()
        return [parse_user_row(r) for r in rows]

class UserCreate(BaseModel):
    id: Optional[str] = None
    name: str
    email: EmailStr
    role: str
    password: Optional[str] = "password123"
    assignedHubId: Optional[str] = None
    assignedHubName: Optional[str] = None
    status: Optional[str] = "active"

@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(req: UserCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    uid = req.id or f"u-{req.email.split('@')[0]}"
    pw_hash = get_password_hash(req.password or "password123")

    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO users (id, name, email, password_hash, role, assigned_hub_id, assigned_hub_name, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (uid, req.name, str(req.email), pw_hash, req.role, req.assignedHubId, req.assignedHubName, req.status))
        row = cur.fetchone()
        db.commit()
        return parse_user_row(row)

@router.patch("/{user_id}")
def update_user(user_id: str, updates: dict, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        field_map = {
            "name": "name", "email": "email", "role": "role",
            "assignedHubId": "assigned_hub_id", "assignedHubName": "assigned_hub_name",
            "status": "status", "lastActive": "last_active"
        }
        for k, col in field_map.items():
            if k in updates:
                cur.execute(f"UPDATE users SET {col} = %s WHERE id = %s", (updates[k], user_id))

        cur.execute("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *", (user_id,))
        row = cur.fetchone()
        db.commit()
        return parse_user_row(row)
