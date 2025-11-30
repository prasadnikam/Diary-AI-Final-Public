"""
Core Task Engine - AI-powered task processing using Google Gemini.
Handles intent classification, task decomposition, and smart tagging.
"""
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import google.generativeai as genai

from .engine_models import (
    ProcessedTask,
    TaskContext,
    EnergyLevel,
    Priority,
    SubTask,
    TaskProcessingRequest,
    TaskProcessingResponse
)
from .prompts import (
    TASK_CLASSIFICATION_PROMPT,
    TASK_DECOMPOSITION_PROMPT,
    PROFESSIONAL_PM_PROMPT,
    PERSONAL_TRIP_PROMPT
)


class TaskEngine:
    """
    Main Task Engine for processing user input into structured tasks.
    Uses Google Gemini for AI-powered task analysis and decomposition.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Task Engine with Gemini API.
        
        Args:
            api_key: Google Gemini API key (optional, can use env var)
        """
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model = None
    
    def _configure_model(self, api_key: Optional[str] = None):
        """Configure Gemini model with provided or stored API key"""
        if api_key:
            genai.configure(api_key=api_key)
        elif self.api_key:
            genai.configure(api_key=self.api_key)
        else:
            raise ValueError("No API key provided. Set GEMINI_API_KEY or pass api_key parameter.")
        
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def _clean_json_response(self, response_text: str) -> str:
        """Remove markdown code blocks from AI response"""
        cleaned = response_text.strip()
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        return cleaned
    
    def classify_intent(
        self,
        user_input: str,
        current_context: Dict[str, Any],
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classify user input to determine context and category.
        
        Args:
            user_input: Natural language task description
            current_context: Current user context (time, mood, etc.)
            api_key: Optional API key for this request
            
        Returns:
            Dictionary with context, category, energy_level, reasoning
        """
        self._configure_model(api_key)
        
        # Extract context values with defaults
        time_of_day = current_context.get('time_of_day', 'unknown')
        day_of_week = current_context.get('day_of_week', 'unknown')
        recent_mood = current_context.get('recent_mood', 'NEUTRAL')
        
        prompt = TASK_CLASSIFICATION_PROMPT.format(
            user_input=user_input,
            time_of_day=time_of_day,
            day_of_week=day_of_week,
            recent_mood=recent_mood
        )
        
        response = self.model.generate_content(prompt)
        cleaned = self._clean_json_response(response.text)
        
        try:
            result = json.loads(cleaned)
            return result
        except json.JSONDecodeError as e:
            print(f"JSON decode error in classify_intent: {e}")
            print(f"Response text: {cleaned}")
            # Return default classification
            return {
                "context": "PERSONAL",
                "category": "General",
                "energy_level": "MEDIUM",
                "reasoning": "Failed to parse AI response, using defaults"
            }
    
    def decompose_task(
        self,
        task_title: str,
        context: str,
        category: str,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Decompose a task into subtasks with time estimates.
        
        Args:
            task_title: Main task title
            context: Task context (PERSONAL/PROFESSIONAL/MIXED)
            category: Task category
            api_key: Optional API key for this request
            
        Returns:
            Dictionary with subtasks, tags, estimated_total_minutes, priority
        """
        self._configure_model(api_key)
        
        # Choose specialized prompt based on context and category
        if context == "PROFESSIONAL" and any(keyword in category.lower() for keyword in ['feature', 'product', 'prd', 'development']):
            prompt = PROFESSIONAL_PM_PROMPT.format(task_title=task_title)
        elif context == "PERSONAL" and 'travel' in category.lower():
            # Try to extract destination and duration from title
            prompt = PERSONAL_TRIP_PROMPT.format(
                task_title=task_title,
                destination="destination",  # Could be enhanced with NER
                duration="duration"
            )
        else:
            # Use generic decomposition
            prompt = TASK_DECOMPOSITION_PROMPT.format(
                task_title=task_title,
                context=context,
                category=category
            )
        
        response = self.model.generate_content(prompt)
        cleaned = self._clean_json_response(response.text)
        
        try:
            result = json.loads(cleaned)
            return result
        except json.JSONDecodeError as e:
            print(f"JSON decode error in decompose_task: {e}")
            print(f"Response text: {cleaned}")
            # Return minimal decomposition
            return {
                "subtasks": [{"title": task_title, "estimated_minutes": 30}],
                "tags": [category.lower()],
                "estimated_total_minutes": 30,
                "priority": "MEDIUM"
            }
    
    def process_input(
        self,
        user_input: str,
        current_context: Optional[Dict[str, Any]] = None,
        api_key: Optional[str] = None
    ) -> List[ProcessedTask]:
        """
        Main processing pipeline: classify → decompose → structure.
        
        Args:
            user_input: Natural language task description
            current_context: Optional context dictionary
            api_key: Optional API key for this request
            
        Returns:
            List of ProcessedTask objects
        """
        if current_context is None:
            current_context = self._get_default_context()
        
        # Step 1: Classify the intent
        classification = self.classify_intent(user_input, current_context, api_key)
        
        # Step 2: Decompose into subtasks
        decomposition = self.decompose_task(
            task_title=user_input,
            context=classification['context'],
            category=classification['category'],
            api_key=api_key
        )
        
        # Step 3: Build ProcessedTask object
        subtasks = [
            SubTask(
                title=st['title'],
                estimated_minutes=st.get('estimated_minutes', 30)
            )
            for st in decomposition.get('subtasks', [])
        ]
        
        processed_task = ProcessedTask(
            title=user_input,
            subtasks=subtasks,
            tags=decomposition.get('tags', []),
            context=TaskContext(classification['context']),
            energy_level=EnergyLevel(classification['energy_level']),
            category=classification['category'],
            estimated_duration_minutes=decomposition.get('estimated_total_minutes'),
            priority=Priority(decomposition.get('priority', 'MEDIUM')),
            context_score=50  # Default, will be calculated by feed algorithm
        )
        
        return [processed_task]
    
    def _get_default_context(self) -> Dict[str, Any]:
        """Get default context based on current time"""
        now = datetime.now()
        
        # Determine time of day
        hour = now.hour
        if 5 <= hour < 12:
            time_of_day = "morning"
        elif 12 <= hour < 17:
            time_of_day = "afternoon"
        elif 17 <= hour < 21:
            time_of_day = "evening"
        else:
            time_of_day = "night"
        
        # Day of week
        day_of_week = now.strftime("%A").lower()
        
        return {
            'time_of_day': time_of_day,
            'day_of_week': day_of_week,
            'recent_mood': 'NEUTRAL'
        }
    
    def batch_process(
        self,
        inputs: List[str],
        current_context: Optional[Dict[str, Any]] = None,
        api_key: Optional[str] = None
    ) -> List[ProcessedTask]:
        """
        Process multiple task inputs in batch.
        
        Args:
            inputs: List of natural language task descriptions
            current_context: Optional context dictionary
            api_key: Optional API key for this request
            
        Returns:
            List of all ProcessedTask objects
        """
        all_tasks = []
        for user_input in inputs:
            tasks = self.process_input(user_input, current_context, api_key)
            all_tasks.extend(tasks)
        return all_tasks
