"""Chat domain models."""
from typing import Dict, List, Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Chat request model."""
    question: str
