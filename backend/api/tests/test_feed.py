from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from api.models import JournalEntry, FeedItem, FeedSettings
from unittest.mock import patch, MagicMock
import json

class FeedEngineTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Mock the API key header
        self.client.credentials(HTTP_X_GEMINI_API_KEY='fake_key')
        
    @patch('api.feed_engine.genai.GenerativeModel')
    @patch('api.feed_engine.genai.configure')
    def test_create_entry_generates_feed_item(self, mock_configure, mock_model_class):
        # Setup Mock
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance
        
        mock_response = MagicMock()
        mock_response.text = "This is a generated tweet about the diary entry."
        mock_model_instance.generate_content.return_value = mock_response

        # Create a Journal Entry
        entry_data = {
            'content': "Today was a great day. I learned a lot about coding.",
            'mood': 'GREAT',
            'date': '2023-10-27T10:00:00Z',
            'includeInFeed': True
        }
        
        response = self.client.post('/api/journal-entries/', entry_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check if FeedItem was created
        feed_items = FeedItem.objects.filter(source_type='DIARY')
        self.assertTrue(feed_items.exists())
        self.assertEqual(feed_items.first().content, "This is a generated tweet about the diary entry.")

    @patch('api.feed_engine.genai.GenerativeModel')
    @patch('api.feed_engine.genai.configure')
    def test_generate_system_content(self, mock_configure, mock_model_class):
        # Setup Mock
        mock_model_instance = MagicMock()
        mock_model_class.return_value = mock_model_instance
        
        mock_response = MagicMock()
        mock_response.text = "Stay motivated and keep coding!"
        mock_model_instance.generate_content.return_value = mock_response

        # Call the endpoint
        response = self.client.post('/api/feed-items/generate_system_content/')
        
        if response.status_code != status.HTTP_200_OK:
            print(f"Error response: {response.data}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['content'], "Stay motivated and keep coding!")
        self.assertEqual(response.data['sourceType'], 'SYSTEM')

    def test_feed_settings_filter(self):
        # Create items
        FeedItem.objects.create(source_type='DIARY', content="Diary post")
        FeedItem.objects.create(source_type='SYSTEM', content="System post")
        
        # Default settings (all true)
        response = self.client.get('/api/feed-items/')
        self.assertEqual(len(response.data), 2)
        
        # Update settings to hide SYSTEM
        settings_data = {
            'showDiaryEntries': True,
            'showMemories': True,
            'showSystemContent': False
        }
        self.client.post('/api/feed-settings/', settings_data, format='json')
        
        response = self.client.get('/api/feed-items/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sourceType'], 'DIARY')
