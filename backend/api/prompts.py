"""
AI Prompt templates for the Task Engine.
These prompts ensure consistent, structured responses from Google Gemini.
"""

TASK_CLASSIFICATION_PROMPT = """
You are an expert task classifier for a Life Operating System.

Analyze the following user input and classify it:

User Input: "{user_input}"

Current Context:
- Time of Day: {time_of_day}
- Day of Week: {day_of_week}
- Recent Mood: {recent_mood}

Return ONLY a raw JSON object (no markdown, no code blocks) with:
{{
  "context": "PERSONAL" | "PROFESSIONAL" | "MIXED",
  "category": "string (e.g., Travel, Feature Development, Bug Fix, Study, Health)",
  "energy_level": "LOW" | "MEDIUM" | "HIGH",
  "reasoning": "brief explanation of classification"
}}

Classification Guidelines:
- PERSONAL: Travel, hobbies, health, personal goals, shopping, entertainment
- PROFESSIONAL: Product management, coding, meetings, PRDs, Jira tickets, stakeholder communication
- MIXED: Tasks that span both contexts
- Energy LOW: Simple, routine tasks (book ticket, send email)
- Energy MEDIUM: Planning, research, writing
- Energy HIGH: Complex problem-solving, creative work, strategic thinking
"""

TASK_DECOMPOSITION_PROMPT = """
You are an expert task decomposer for a Life Operating System.

Break down this task into granular, actionable subtasks:

Main Task: "{task_title}"
Context: {context}
Category: {category}

Return ONLY a raw JSON object (no markdown, no code blocks) with:
{{
  "subtasks": [
    {{
      "title": "Clear, actionable subtask",
      "estimated_minutes": number
    }}
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_total_minutes": number,
  "priority": "LOW" | "MEDIUM" | "HIGH"
}}

Guidelines:
- Each subtask should be completable in one sitting
- Estimate realistic time (in minutes)
- Include 5-10 relevant tags
- Order subtasks logically (dependencies first)
- Be specific and actionable
"""

PROFESSIONAL_PM_PROMPT = """
You are a Senior Product Manager breaking down a professional task.

Task: "{task_title}"

This is a PROFESSIONAL Product Management task. Generate subtasks that follow PM best practices:

Return ONLY a raw JSON object (no markdown, no code blocks) with:
{{
  "subtasks": [
    {{
      "title": "Actionable PM subtask",
      "estimated_minutes": number
    }}
  ],
  "tags": ["product", "relevant tags"],
  "estimated_total_minutes": number,
  "priority": "HIGH",
  "suggested_jira_format": {{
    "epic_name": "string",
    "user_stories": ["As a user, I want..."]
  }}
}}

Include subtasks like:
- Research existing solutions
- Draft PRD sections (Problem, Solution, Success Metrics)
- Create user stories
- Design API/data models
- Identify stakeholders
- Schedule review meetings
- Create Jira epic/tickets
- Document technical requirements
"""

PERSONAL_TRIP_PROMPT = """
You are an expert travel planner breaking down a trip planning task.

Task: "{task_title}"
Destination: {destination}
Duration: {duration}

This is a PERSONAL travel planning task. Generate comprehensive subtasks:

Return ONLY a raw JSON object (no markdown, no code blocks) with:
{{
  "subtasks": [
    {{
      "title": "Specific travel planning action",
      "estimated_minutes": number
    }}
  ],
  "tags": ["travel", "destination", "relevant tags"],
  "estimated_total_minutes": number,
  "priority": "MEDIUM"
}}

Include subtasks like:
- Check passport/visa requirements
- Research flights and book tickets
- Reserve accommodations (hotels, Airbnb)
- Plan daily itinerary
- Research local transportation (trains, metro passes)
- Book key attractions/tours
- Research restaurants and food
- Check weather and pack accordingly
- Arrange travel insurance
- Notify bank of travel
- Download offline maps
- Learn basic local phrases
"""

ENERGY_ASSESSMENT_PROMPT = """
You are analyzing a user's recent journal entries to assess their current energy level.

Recent Journal Entries:
{journal_entries}

Analyze the mood, tone, and content to determine the user's current energy level.

Return ONLY a raw JSON object (no markdown, no code blocks) with:
{{
  "energy_level": "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}}

Guidelines:
- LOW: Tired, stressed, overwhelmed, sad, anxious
- MEDIUM: Neutral, calm, content, stable
- HIGH: Energized, motivated, happy, excited, productive
- Confidence: How certain you are based on the entries (0.0 = uncertain, 1.0 = very certain)
"""

CONTEXT_MATCH_PROMPT = """
You are scoring how well a task matches the current user context.

Task: "{task_title}"
Task Context: {task_context}
Task Energy Required: {task_energy}

Current User Context:
- Time: {current_time}
- Day: {current_day}
- User Energy: {user_energy}
- Location: {location}

Return ONLY a raw JSON object (no markdown, no code blocks) with:
{{
  "context_match_score": 0 to 100,
  "reasoning": "brief explanation"
}}

Scoring Guidelines:
- High score (80-100): Perfect match (e.g., personal task on weekend, professional task during work hours)
- Medium score (40-79): Acceptable match
- Low score (0-39): Poor match (e.g., high-energy task when user is tired)

Consider:
- Work tasks score higher during weekdays 9am-6pm
- Personal tasks score higher on weekends
- High-energy tasks score lower when user energy is LOW
- Time-sensitive tasks score higher as deadline approaches
"""
