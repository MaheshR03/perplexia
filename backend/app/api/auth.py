from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import db_models
from clerk import Client as ClerkClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

clerk_client = ClerkClient(settings.CLERK_SECRET_KEY) # Initialize Clerk client
router = APIRouter()

async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> db_models.User:
    """Authenticates user using Clerk JWT from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        token = authorization.split(" ")[1] # Assuming "Bearer <token>" format
        jwt_payload = clerk_client.verify_token(token) # Verify JWT with Clerk

        clerk_user_id = jwt_payload.get('sub') # Clerk user ID is typically in 'sub'

        user = db.query(db_models.User).filter(db_models.User.clerk_user_id == clerk_user_id).first()
        if not user:
            # If user doesn't exist in your DB, create one (basic example, expand as needed)
            user_info = clerk_client.users.retrieve(clerk_user_id) # Get user info from Clerk
            user = db_models.User(clerk_user_id=clerk_user_id, username=user_info.username, email=user_info.email_addresses[0].email_address if user_info.email_addresses else None) # Basic user creation
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception as e: # Catch JWT verification errors or Clerk API errors
        logger.error(f"Authentication error: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.get("/me")
async def get_me(current_user: db_models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username
    }