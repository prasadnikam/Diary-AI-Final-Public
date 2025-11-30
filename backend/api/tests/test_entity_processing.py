from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from api.models import JournalEntry
import json
from unittest.mock import patch, MagicMock

class EntityProcessingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.entry = JournalEntry.objects.create(
            content="I met Sarah today and we had a great lunch. I felt really happy.",
            mood="GOOD",
            date="2023-01-01T12:00:00Z"
        )
        self.url = reverse('journalentry-process-entities', args=[self.entry.id])

    def test_missing_api_key(self):
        """Test that request without API key returns 401"""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
        self.assertIn('API Key is missing', response.data['error'])

    @patch('api.views.configure_genai')
    def test_short_content(self, mock_configure):
        """Test that short content returns 400"""
        # Mock API key validation to pass
        mock_configure.return_value = "fake_key"
        
        short_entry = JournalEntry.objects.create(
            content="Hi",
            mood="NEUTRAL",
            date="2023-01-02T12:00:00Z"
        )
        url = reverse('journalentry-process-entities', args=[short_entry.id])
        
        # Add header
        self.client.credentials(HTTP_X_GEMINI_API_KEY='fake_key')
        
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('too short', response.data['error'])

    @patch('api.views.configure_genai')
    @patch('api.extractor.EntityExtractor.extract_entities')
    @patch('api.extractor.EntityExtractor.process_and_save')
    def test_successful_processing(self, mock_save, mock_extract, mock_configure):
        """Test successful entity processing"""
        mock_configure.return_value = "fake_key"
        
        # Mock extraction result
        mock_result = MagicMock()
        mock_result.people = [MagicMock()]
        mock_result.events = []
        mock_result.feelings = []
        mock_extract.return_value = mock_result
        
        self.client.credentials(HTTP_X_GEMINI_API_KEY='fake_key')
        
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['entities']['people'], 1)
        
        # Verify mocks were called
        mock_extract.assert_called_once()
        mock_save.assert_called_once()

    @patch('api.views.configure_genai')
    @patch('api.extractor.EntityExtractor.extract_entities')
    def test_extraction_failure(self, mock_extract, mock_configure):
        """Test handling of extraction failure"""
        mock_configure.return_value = "fake_key"
        
        # Mock extraction raising exception
        mock_extract.side_effect = Exception("AI Error")
        
        self.client.credentials(HTTP_X_GEMINI_API_KEY='fake_key')
        
        response = self.client.post(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('Failed to extract entities', response.data['error'])
