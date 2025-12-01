import google.generativeai as genai
import json
from .models import FeedItem, JournalEntry, Entity, FeedSettings
import random

class FeedEngine:
    def __init__(self, api_key):
        self.api_key = api_key
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.model = None
            # We don't raise here to allow initialization, but methods will fail gracefully or return None

    def generate_from_entry(self, entry: JournalEntry):
        """
        Generates a feed item from a journal entry.
        """
        if not self.model:
            return None

        try:
            prompt = f"""
            You are a social media manager for a personal diary app.
            Create a short, engaging, Twitter-style post (max 280 chars) based on this diary entry.
            The post should be reflective, poetic, or summarizing.
            Do not use hashtags.
            
            Diary Entry: "{entry.content}"
            """
            
            response = self.model.generate_content(prompt)
            content = response.text.strip()
            
            # Create FeedItem
            item = FeedItem.objects.create(
                source_type='DIARY',
                source_id=str(entry.id),
                content=content,
                meta_data={
                    'mood': entry.mood,
                    'date': str(entry.date)
                }
            )
            return item
        except Exception as e:
            print(f"Error generating feed from entry: {e}")
            return None

    def generate_from_memory(self, entity: Entity):
        """
        Generates a feed item from a new memory (entity).
        """
        if not self.model:
            return None

        try:
            prompt = f"""
            You are a social media manager.
            Create a short, engaging, Twitter-style post (max 280 chars) about a new memory formed about: {entity.name} ({entity.type}).
            Context: {entity.accumulated_context}
            Make it sound like a realization or a cherished moment.
            """
            
            response = self.model.generate_content(prompt)
            content = response.text.strip()
            
            item = FeedItem.objects.create(
                source_type='MEMORY',
                source_id=str(entity.id),
                content=content,
                meta_data={
                    'entity_name': entity.name,
                    'entity_type': entity.type
                }
            )
            return item
        except Exception as e:
            print(f"Error generating feed from memory: {e}")
            return None

    def generate_system_content(self):
        """
        Generates engaging system content (motivational, learning, etc.).
        """
        if not self.model:
            return None

        try:
            # Randomly choose a topic
            topics = ['motivation', 'mindfulness', 'learning', 'productivity', 'stoicism']
            topic = random.choice(topics)
            
            prompt = f"""
            Create a short, engaging, Twitter-style post (max 280 chars) about {topic}.
            It should be insightful and valuable to the reader.
            """
            
            response = self.model.generate_content(prompt)
            content = response.text.strip()
            
            item = FeedItem.objects.create(
                source_type='SYSTEM',
                content=content,
                meta_data={
                    'topic': topic
                }
            )
            return item
        except Exception as e:
            print(f"Error generating system content: {e}")
            return None

    def refresh_feed(self):
        """
        Ensures the feed has fresh content.
        """
        # Check if we need more system content
        recent_system = FeedItem.objects.filter(source_type='SYSTEM').order_by('-created_at')[:1]
        if not recent_system:
            self.generate_system_content()
