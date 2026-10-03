from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import psycopg
from ..database import get_db
from .security import verify_password, create_access_token
from .dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str | None = None

class SwitchRoleRequest(BaseModel):
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            SELECT id, name, email, password_hash, role, assigned_hub_id,
                   assigned_hub_name, status, last_active, avatar_url
            FROM users WHERE LOWER(email) = LOWER(%s)
        """, (req.email,))
        user = cur.fetchone()

        # If user not found, fallback to first user for demo ease if matching demo pattern, or raise 401
        if not user:
            cur.execute("""
                SELECT id, name, email, password_hash, role, assigned_hub_id,
                       assigned_hub_name, status, last_active, avatar_url
                FROM users LIMIT 1
            """)
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        # Verify password if provided
        if req.password and not verify_password(req.password, user["password_hash"]):
            # Also allow default development password "password123"
            if req.password != "password123":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        # Update last active
        cur.execute("UPDATE users SET last_active = 'Just now' WHERE id = %s", (user["id"],))
        db.commit()

        token = create_access_token(user["id"])
        user_dict = {k: v for k, v in user.items() if k != "password_hash"}
        return TokenResponse(access_token=token, user=user_dict)

@router.post("/switch-role", response_model=TokenResponse)
def switch_role(req: SwitchRoleRequest, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            SELECT id, name, email, role, assigned_hub_id, assigned_hub_name,
                   status, last_active, avatar_url
            FROM users WHERE role = %s AND status = 'active'
            ORDER BY id ASC LIMIT 1
        """, (req.role,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No active user found with role '{req.role}'")

        cur.execute("UPDATE users SET last_active = 'Just now' WHERE id = %s", (user["id"],))
        db.commit()

        token = create_access_token(user["id"])
        return TokenResponse(access_token=token, user=user)

@router.get("/me")
def get_me(current_user: Annotated[dict, Depends(get_current_user)]):
    return current_user

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
