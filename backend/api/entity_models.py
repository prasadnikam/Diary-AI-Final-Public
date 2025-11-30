from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractedPerson(BaseModel):
    name: str
    relationship: str = Field(description="Inferred relationship to the user")
    sentiment: str = Field(description="Sentiment towards this person: Positive, Neutral, Negative")
    context: str = Field(description="Summary of the interaction context")

class ExtractedEvent(BaseModel):
    name: str
    category: str
    date: Optional[str] = None
    context: str

class ExtractedFeeling(BaseModel):
    name: str
    intensity: int = Field(description="1-10 scale")
    root_cause: str

class ExtractionResult(BaseModel):
    people: List[ExtractedPerson] = Field(default_factory=list)
    events: List[ExtractedEvent] = Field(default_factory=list)
    feelings: List[ExtractedFeeling] = Field(default_factory=list)
