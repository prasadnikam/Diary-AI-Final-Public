from django.test import TestCase
from unittest.mock import patch, MagicMock
from api.extractor import EntityExtractor
from api.entity_models import ExtractionResult

class ExtractorTest(TestCase):
    @patch('google.generativeai.GenerativeModel')
    def test_extract_entities(self, MockModel):
        # Mock response
        mock_response = MagicMock()
        mock_response.text = '{"people": [{"name": "Rishi", "relationship": "Friend", "sentiment": "Positive", "context": "Met for coffee"}], "events": [], "feelings": []}'
        
        mock_model_instance = MockModel.return_value
        mock_model_instance.generate_content.return_value = mock_response
        
        extractor = EntityExtractor(api_key='dummy')
        result = extractor.extract_entities("Met Rishi for coffee")
        
        self.assertIsInstance(result, ExtractionResult)
        self.assertEqual(len(result.people), 1)
        self.assertEqual(result.people[0].name, "Rishi")
        self.assertEqual(result.people[0].sentiment, "Positive")

    @patch('google.generativeai.GenerativeModel')
    def test_extract_entities_failure(self, MockModel):
        # Mock failure response
        mock_response = MagicMock()
        mock_response.text = 'Invalid JSON'
        
        mock_model_instance = MockModel.return_value
        mock_model_instance.generate_content.return_value = mock_response
        
        extractor = EntityExtractor(api_key='dummy')
        result = extractor.extract_entities("Bad text")
        
        self.assertIsInstance(result, ExtractionResult)
        self.assertEqual(len(result.people), 0)
