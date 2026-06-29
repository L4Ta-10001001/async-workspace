from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

app = FastAPI(title="Webhooks PoC - ATS Integration")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WebhookEvent(BaseModel):
    event_type: str
    payload: dict
    timestamp: Optional[str] = None
    event_id: Optional[str] = None

class WebhookSubscription(BaseModel):
    url: str
    events: List[str]

webhook_events: List[WebhookEvent] = []
webhook_subscriptions: List[WebhookSubscription] = []

@app.get("/")
def read_root():
    return {"message": "Webhooks PoC API", "status": "running"}

@app.post("/api/webhooks/trigger")
async def trigger_webhook(event: WebhookEvent):
    """Simulates an external system triggering a webhook event."""
    event.event_id = str(uuid.uuid4())
    event.timestamp = datetime.now().isoformat()
    webhook_events.append(event)
    return {"status": "success", "event_id": event.event_id}

@app.get("/api/webhooks/events")
async def get_events():
    """Returns all webhook events received."""
    return {"events": webhook_events}

@app.post("/api/webhooks/subscribe")
async def subscribe_to_webhooks(subscription: WebhookSubscription):
    """Registers a webhook subscription (simulated)."""
    webhook_subscriptions.append(subscription)
    return {"status": "subscribed", "subscription": subscription}

@app.get("/api/webhooks/subscriptions")
async def get_subscriptions():
    """Returns all webhook subscriptions."""
    return {"subscriptions": webhook_subscriptions}

@app.post("/api/webhooks/ats/candidate-update")
async def candidate_update_webhook(event: WebhookEvent):
    """ATS-specific webhook: Candidate status update."""
    event.event_type = "candidate.status.updated"
    event.event_id = str(uuid.uuid4())
    event.timestamp = datetime.now().isoformat()
    webhook_events.append(event)
    return {"status": "processed", "event_id": event.event_id}

@app.delete("/api/webhooks/events/clear")
async def clear_events():
    """Clears all webhook events (for testing)."""
    webhook_events.clear()
    return {"status": "cleared"}
