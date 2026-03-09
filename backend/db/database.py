from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    MONGO_URI: str
    MONGO_DB_NAME: str
    GEMINI_API_KEY: str

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings() # type: ignore

client: AsyncIOMotorClient = None # type: ignore

async def connect_db():
    global client
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGO_URI)
    print(f"✅ Connected to MongoDB: {settings.MONGO_DB_NAME}")

async def close_db():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")

def get_db():
    settings = get_settings()
    return client[settings.MONGO_DB_NAME]