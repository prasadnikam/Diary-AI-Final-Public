"""
Pydantic models for the AI Task Engine.
Provides strict typing and validation for task processing.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


class TaskContext(str, Enum):
    """Context classification for tasks"""
    PERSONAL = "PERSONAL"
    PROFESSIONAL = "PROFESSIONAL"
    MIXED = "MIXED"


class EnergyLevel(str, Enum):
    """Energy level required for task completion"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Priority(str, Enum):
    """Task priority levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SubTask(BaseModel):
    """Individual subtask within a larger task"""
    id: Optional[str] = None
    title: str = Field(..., description="Clear, actionable subtask description")
    completed: bool = False
    estimated_minutes: Optional[int] = Field(None, description="Estimated time to complete in minutes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Book flight tickets",
                "completed": False,
                "estimated_minutes": 30
            }
        }


class ProcessedTask(BaseModel):
    """
    Complete task object with AI-generated metadata.
    This is the output of the Task Engine processing.
    """
    title: str = Field(..., description="Main task title")
    subtasks: List[SubTask] = Field(default_factory=list, description="Decomposed actionable subtasks")
    tags: List[str] = Field(default_factory=list, description="Auto-generated tags for categorization")
    context: TaskContext = Field(..., description="Personal, Professional, or Mixed context")
    energy_level: EnergyLevel = Field(..., description="Required energy level")
    context_score: int = Field(default=50, ge=0, le=100, description="Relevance score for smart feed (0-100)")
    external_link: Optional[str] = Field(None, description="Link to Jira ticket, Slack thread, etc.")
    category: str = Field(..., description="Task category (e.g., Travel, Feature Development, Bug Fix)")
    estimated_duration_minutes: Optional[int] = Field(None, description="Total estimated duration")
    priority: Priority = Field(default=Priority.MEDIUM, description="Task priority")
    due_date: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Plan trip to Japan",
                "subtasks": [
                    {"title": "Book flights", "estimated_minutes": 45},
                    {"title": "Reserve hotels", "estimated_minutes": 60}
                ],
                "tags": ["travel", "japan", "vacation"],
                "context": "PERSONAL",
                "energy_level": "MEDIUM",
                "context_score": 75,
                "category": "Travel Planning",
                "estimated_duration_minutes": 300
            }
        }


class TaskProcessingRequest(BaseModel):
    """Request model for task processing API"""
    user_input: str = Field(..., description="Natural language task description")
    current_context: Optional[dict] = Field(
        default_factory=dict,
        description="Current user context (time, location, recent mood, etc.)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_input": "I need to build a login feature for the app",
                "current_context": {
                    "time_of_day": "morning",
                    "day_of_week": "monday",
                    "recent_mood": "GOOD"
                }
            }
        }


class TaskProcessingResponse(BaseModel):
    """Response model for task processing API"""
    success: bool
    tasks: List[ProcessedTask] = Field(default_factory=list)
    message: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "tasks": [
                    {
                        "title": "Build login feature",
                        "context": "PROFESSIONAL",
                        "category": "Feature Development"
                    }
                ],
                "message": "Successfully processed 1 task"
            }
        }


class UserEnergyContext(BaseModel):
    """User's current energy level derived from recent journal entries"""
    energy_level: EnergyLevel
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in energy assessment (0-1)")
    based_on_entries: int = Field(description="Number of recent entries analyzed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "energy_level": "HIGH",
                "confidence": 0.85,
                "based_on_entries": 3
            }
        }
