from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import psycopg
from ..database import get_db
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[psycopg.Connection, Depends(get_db)]
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    with db.cursor() as cur:
        cur.execute("""
            SELECT id, name, email, role, assigned_hub_id, assigned_hub_name,
                   status, last_active, avatar_url
            FROM users WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()
        if user is None:
            raise credentials_exception
        if user["status"] != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
        return user

def require_role(*allowed_roles: str):
    def role_checker(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user['role']}'"
            )
        return current_user
    return role_checker
