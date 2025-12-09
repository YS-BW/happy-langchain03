"""Chat domain models."""
from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Chat request model."""
    question: str
