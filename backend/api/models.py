from django.db import models
import json

class JournalEntry(models.Model):
    MOOD_CHOICES = [
        ('GREAT', 'Great'),
        ('GOOD', 'Good'),
        ('NEUTRAL', 'Neutral'),
        ('STRESSED', 'Stressed'),
        ('BAD', 'Bad'),
    ]

    date = models.DateTimeField()
    content = models.TextField()
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    ai_reflection = models.TextField(blank=True, null=True)
    
    # Added blank=True to make these optional in the Admin panel
    tags = models.JSONField(default=list, blank=True) 
    attachments = models.JSONField(default=list, blank=True) 
    
    type = models.CharField(max_length=20, default='text')
    include_in_feed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} - {self.mood}"

class Entity(models.Model):
    ENTITY_TYPES = [
        ('PERSON', 'Person'),
        ('EVENT', 'Event'),
        ('FEELING', 'Feeling'),
    ]
    
    type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    name = models.CharField(max_length=255)
    media_url = models.URLField(max_length=500, blank=True, null=True)
    accumulated_context = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.type})"

class EntityInteraction(models.Model):
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='interactions')
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='entity_interactions')
    interaction_snippet = models.TextField()
    sentiment_score = models.FloatField(default=0.0) # 0.0 to 1.0 (normalized)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.entity.name} in {self.journal_entry.date}"

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]
    
    CONTEXT_CHOICES = [
        ('PERSONAL', 'Personal'),
        ('PROFESSIONAL', 'Professional'),
        ('MIXED', 'Mixed'),
    ]
    
    ENERGY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    # Original fields
    title = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    due_date = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    subject = models.CharField(max_length=100, blank=True)
    
    # New AI Task Engine fields
    subtasks = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    context = models.CharField(max_length=20, choices=CONTEXT_CHOICES, default='PERSONAL', blank=True)
    energy_level = models.CharField(max_length=10, choices=ENERGY_CHOICES, default='MEDIUM', blank=True)
    context_score = models.IntegerField(default=50, blank=True)  # 0-100 relevance score
    external_link = models.URLField(max_length=500, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True)
    estimated_duration_minutes = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.title

class FriendProfile(models.Model):
    name = models.CharField(max_length=100)
    personality = models.TextField()
    context = models.TextField()
    voice_name = models.CharField(max_length=50)
    avatar_url = models.URLField(max_length=500, blank=True)

    def __str__(self):
        return self.name

class FeedPost(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='posts')
    image_url = models.TextField(blank=True) # Using TextField for long data URLs
    video_url = models.TextField(blank=True)
    caption = models.TextField()
    likes = models.IntegerField(default=0)
    is_liked = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    mood_tag = models.CharField(max_length=20)
    audio_data = models.TextField(blank=True, null=True) # Base64 audio

    def __str__(self):
        return f"Post for {self.entry.id}"

class ContentConfig(models.Model):
    # Singleton-like model for user settings
    art_style = models.CharField(max_length=100, default="Abstract & Dreamy")
    caption_tone = models.CharField(max_length=100, default="Reflective & Poetic")
    include_audio = models.BooleanField(default=True)
    output_format = models.CharField(max_length=20, default='IMAGE')