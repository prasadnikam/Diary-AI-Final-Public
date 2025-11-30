"""
Smart Feed Algorithm - Contextual relevance scoring for tasks.
Implements the formula: Relevance = (Urgency × 0.4) + (ContextMatch × 0.4) + (UserEnergy × 0.2)
"""
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import google.generativeai as genai

from .models import Task, JournalEntry
from .engine_models import EnergyLevel, UserEnergyContext
from .prompts import ENERGY_ASSESSMENT_PROMPT, CONTEXT_MATCH_PROMPT


class FeedAlgorithm:
    """
    Calculates contextual relevance scores for tasks.
    Sorts tasks by how well they match the user's current state.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize with optional API key for AI-based assessments"""
        self.api_key = api_key
        if api_key:
            genai.configure(api_key=api_key)
    
    def _clean_json_response(self, response_text: str) -> str:
        """Remove markdown code blocks from AI response"""
        cleaned = response_text.strip()
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        return cleaned
    
    def get_user_energy(
        self,
        recent_entries: List[JournalEntry],
        api_key: Optional[str] = None
    ) -> UserEnergyContext:
        """
        Analyze recent journal entries to assess user's current energy level.
        
        Args:
            recent_entries: List of recent JournalEntry objects (last 3-5)
            api_key: Optional API key for this request
            
        Returns:
            UserEnergyContext with energy level and confidence
        """
        if not recent_entries:
            return UserEnergyContext(
                energy_level=EnergyLevel.MEDIUM,
                confidence=0.0,
                based_on_entries=0
            )
        
        # If we have API key, use AI analysis
        if api_key or self.api_key:
            if api_key:
                genai.configure(api_key=api_key)
            
            # Format entries for AI
            entries_text = "\n\n".join([
                f"Date: {entry.date}\nMood: {entry.mood}\nContent: {entry.content[:200]}..."
                for entry in recent_entries[:5]
            ])
            
            prompt = ENERGY_ASSESSMENT_PROMPT.format(journal_entries=entries_text)
            
            try:
                model = genai.GenerativeModel('gemini-2.0-flash-exp')
                response = model.generate_content(prompt)
                cleaned = self._clean_json_response(response.text)
                result = json.loads(cleaned)
                
                return UserEnergyContext(
                    energy_level=EnergyLevel(result['energy_level']),
                    confidence=result['confidence'],
                    based_on_entries=len(recent_entries)
                )
            except Exception as e:
                print(f"Error in AI energy assessment: {e}")
                # Fall through to simple mood-based assessment
        
        # Simple mood-based energy assessment (fallback)
        mood_to_energy = {
            'GREAT': EnergyLevel.HIGH,
            'GOOD': EnergyLevel.MEDIUM,
            'NEUTRAL': EnergyLevel.MEDIUM,
            'STRESSED': EnergyLevel.LOW,
            'BAD': EnergyLevel.LOW
        }
        
        # Get most recent mood
        latest_mood = recent_entries[0].mood
        energy = mood_to_energy.get(latest_mood, EnergyLevel.MEDIUM)
        
        return UserEnergyContext(
            energy_level=energy,
            confidence=0.6,
            based_on_entries=len(recent_entries)
        )
    
    def calculate_urgency(self, task: Task) -> float:
        """
        Calculate urgency score (0-100) based on due date and priority.
        
        Args:
            task: Task object
            
        Returns:
            Urgency score from 0 to 100
        """
        score = 0.0
        
        # Priority contributes 40 points
        priority_scores = {
            'HIGH': 40,
            'MEDIUM': 25,
            'LOW': 10
        }
        score += priority_scores.get(task.priority, 25)
        
        # Due date contributes up to 60 points
        if task.due_date:
            now = datetime.now()
            # Make due_date timezone-aware if it isn't already
            due_date = task.due_date
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=now.tzinfo)
            
            days_until_due = (due_date - now).days
            
            if days_until_due < 0:
                # Overdue - maximum urgency
                score += 60
            elif days_until_due == 0:
                # Due today
                score += 55
            elif days_until_due == 1:
                # Due tomorrow
                score += 45
            elif days_until_due <= 3:
                # Due within 3 days
                score += 35
            elif days_until_due <= 7:
                # Due within a week
                score += 25
            else:
                # More than a week away
                score += 10
        else:
            # No due date - medium urgency
            score += 20
        
        return min(score, 100)
    
    def calculate_context_match(
        self,
        task: Task,
        current_context: Dict[str, Any],
        api_key: Optional[str] = None
    ) -> float:
        """
        Calculate how well task matches current context (0-100).
        
        Args:
            task: Task object with context and energy_level
            current_context: Current time, day, location, user energy
            api_key: Optional API key for AI-based matching
            
        Returns:
            Context match score from 0 to 100
        """
        # If we have API key and task has enough metadata, use AI
        if (api_key or self.api_key) and hasattr(task, 'context') and hasattr(task, 'energy_level'):
            try:
                if api_key:
                    genai.configure(api_key=api_key)
                
                # Get task context safely
                task_context = getattr(task, 'context', 'PERSONAL')
                task_energy = getattr(task, 'energy_level', 'MEDIUM')
                
                prompt = CONTEXT_MATCH_PROMPT.format(
                    task_title=task.title,
                    task_context=task_context,
                    task_energy=task_energy,
                    current_time=current_context.get('time_of_day', 'unknown'),
                    current_day=current_context.get('day_of_week', 'unknown'),
                    user_energy=current_context.get('user_energy', 'MEDIUM'),
                    location=current_context.get('location', 'unknown')
                )
                
                model = genai.GenerativeModel('gemini-2.0-flash-exp')
                response = model.generate_content(prompt)
                cleaned = self._clean_json_response(response.text)
                result = json.loads(cleaned)
                
                return float(result['context_match_score'])
            except Exception as e:
                print(f"Error in AI context matching: {e}")
                # Fall through to rule-based matching
        
        # Rule-based context matching (fallback)
        score = 50.0  # Base score
        
        # Get current time info
        now = datetime.now()
        hour = now.hour
        day_of_week = now.strftime("%A").lower()
        is_weekend = day_of_week in ['saturday', 'sunday']
        is_work_hours = 9 <= hour < 18
        
        # Check task context if available
        task_context = getattr(task, 'context', None)
        if task_context:
            if task_context == 'PROFESSIONAL':
                # Professional tasks score higher during work hours on weekdays
                if is_work_hours and not is_weekend:
                    score += 30
                elif is_weekend:
                    score -= 20
            elif task_context == 'PERSONAL':
                # Personal tasks score higher on weekends and outside work hours
                if is_weekend or not is_work_hours:
                    score += 30
                elif is_work_hours:
                    score -= 10
        
        # Check energy match
        task_energy = getattr(task, 'energy_level', None)
        user_energy = current_context.get('user_energy', 'MEDIUM')
        
        if task_energy and user_energy:
            energy_values = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
            task_energy_val = energy_values.get(task_energy, 2)
            user_energy_val = energy_values.get(user_energy, 2)
            
            # Penalize high-energy tasks when user energy is low
            if task_energy_val > user_energy_val:
                score -= 20
            elif task_energy_val == user_energy_val:
                score += 10
        
        return max(0, min(score, 100))
    
    def calculate_user_energy_score(self, user_energy: str) -> float:
        """
        Convert user energy level to score (0-100).
        
        Args:
            user_energy: Energy level (LOW/MEDIUM/HIGH)
            
        Returns:
            Score from 0 to 100
        """
        energy_scores = {
            'LOW': 30,
            'MEDIUM': 60,
            'HIGH': 90
        }
        return energy_scores.get(user_energy, 60)
    
    def calculate_relevance_score(
        self,
        task: Task,
        current_context: Dict[str, Any],
        api_key: Optional[str] = None
    ) -> float:
        """
        Calculate overall relevance score using weighted formula.
        Formula: Relevance = (Urgency × 0.4) + (ContextMatch × 0.4) + (UserEnergy × 0.2)
        
        Args:
            task: Task object
            current_context: Current user context
            api_key: Optional API key for AI-based calculations
            
        Returns:
            Relevance score from 0 to 100
        """
        urgency = self.calculate_urgency(task)
        context_match = self.calculate_context_match(task, current_context, api_key)
        user_energy_score = self.calculate_user_energy_score(
            current_context.get('user_energy', 'MEDIUM')
        )
        
        relevance = (urgency * 0.4) + (context_match * 0.4) + (user_energy_score * 0.2)
        
        return round(relevance, 2)
    
    def sort_tasks_by_relevance(
        self,
        tasks: List[Task],
        current_context: Dict[str, Any],
        recent_entries: Optional[List[JournalEntry]] = None,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Sort tasks by relevance score and return with scores.
        
        Args:
            tasks: List of Task objects
            current_context: Current user context
            recent_entries: Optional recent journal entries for energy assessment
            api_key: Optional API key for AI-based calculations
            
        Returns:
            List of dictionaries with task and relevance_score, sorted by score (descending)
        """
        # Get user energy from journal entries if provided
        if recent_entries:
            user_energy_context = self.get_user_energy(recent_entries, api_key)
            current_context['user_energy'] = user_energy_context.energy_level.value
        
        # Calculate relevance for each task
        tasks_with_scores = []
        for task in tasks:
            score = self.calculate_relevance_score(task, current_context, api_key)
            tasks_with_scores.append({
                'task': task,
                'relevance_score': score
            })
        
        # Sort by relevance score (descending)
        tasks_with_scores.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return tasks_with_scores
