from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import jwt
from datetime import datetime, timedelta

router = APIRouter()
security = HTTPBearer()

# Simple in-memory user store (in production, use proper database)
users_db = {
    "demo@example.com": {
        "email": "demo@example.com",
        "name": "Demo User",
        "hashed_password": "demo_password_hash"  # In production, use proper hashing
    }
}

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    email: str
    name: str
    access_token: str

class UserProfile(BaseModel):
    email: str
    name: str
    preferences: Optional[dict] = None

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

@router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    """
    Login user and return access token
    """
    # For demo purposes, accept any email/password combination
    # In production, verify against proper user database with hashed passwords
    
    user = users_db.get(user_data.email)
    if not user and user_data.email == "demo@example.com":
        # Create demo user
        user = {
            "email": user_data.email,
            "name": "Demo User",
            "hashed_password": "demo_hash"
        }
        users_db[user_data.email] = user
    elif not user:
        # For demo, create any user
        user = {
            "email": user_data.email,
            "name": user_data.email.split("@")[0].title(),
            "hashed_password": "demo_hash"
        }
        users_db[user_data.email] = user
    
    # Create access token
    access_token = create_access_token(data={"sub": user["email"]})
    
    return UserResponse(
        email=user["email"],
        name=user["name"],
        access_token=access_token
    )

@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: str = Depends(verify_token)):
    """
    Get current user profile
    """
    user = users_db.get(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        email=user["email"],
        name=user["name"],
        preferences=user.get("preferences", {})
    )

@router.put("/profile")
async def update_profile(profile_data: dict, current_user: str = Depends(verify_token)):
    """
    Update user profile and preferences
    """
    user = users_db.get(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user data
    if "name" in profile_data:
        user["name"] = profile_data["name"]
    
    if "preferences" in profile_data:
        user["preferences"] = profile_data["preferences"]
    
    users_db[current_user] = user
    
    return {"message": "Profile updated successfully"}

@router.post("/demo-login", response_model=UserResponse)
async def demo_login():
    """
    Quick demo login without credentials
    """
    demo_user = {
        "email": "demo@portfolioopt.com",
        "name": "Demo User",
        "hashed_password": "demo_hash"
    }
    
    users_db[demo_user["email"]] = demo_user
    access_token = create_access_token(data={"sub": demo_user["email"]})
    
    return UserResponse(
        email=demo_user["email"],
        name=demo_user["name"],
        access_token=access_token
    )

@router.post("/logout")
async def logout(current_user: str = Depends(verify_token)):
    """
    Logout user (in a real app, you'd invalidate the token)
    """
    return {"message": "Successfully logged out"}