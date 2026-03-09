from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db.mongodb import connect_to_mongo, close_mongo_connection
from services.ws_manager import manager as ws_manager
from routes import feedback, tickets, patients, dashboard, reports, departments, managers
import json


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Sentiment-Driven Service Recovery Agent",
    description="AI-powered hospital patient feedback system with real-time alerts",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])
app.include_router(tickets.router, prefix="/api", tags=["Tickets"])
app.include_router(patients.router, prefix="/api", tags=["Patients"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(departments.router, prefix="/api", tags=["Departments"])
app.include_router(managers.router, prefix="/api", tags=["Managers"])


@app.get("/")
async def root():
    return {
        "message": "Sentiment-Driven Service Recovery Agent API",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "event_type": "connected",
            "data": {"message": "Connected to Sentiment Recovery Agent real-time feed"},
        }))
        while True:
            # Keep connection alive and listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"event_type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
