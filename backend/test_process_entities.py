#!/usr/bin/env python
"""
Test script to reproduce the process_entities error
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mindful_backend.settings')
django.setup()

from api.models import JournalEntry
from api.extractor import EntityExtractor

def test_process_entities():
    # Get the first journal entry
    entries = JournalEntry.objects.all().order_by('-id')
    
    if not entries:
        print("No journal entries found!")
        return
    
    entry = entries[0]
    print(f"Testing with entry ID: {entry.id}")
    print(f"Content preview: {entry.content[:100]}...")
    
    # Get API key from environment
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set in environment!")
        print("Please set it with: export GEMINI_API_KEY='your-key-here'")
        return
    
    print(f"API Key found: {api_key[:10]}...")
    
    try:
        # Initialize extractor
        print("\nInitializing EntityExtractor...")
        extractor = EntityExtractor(api_key)
        
        # Extract entities
        print("Extracting entities...")
        extraction = extractor.extract_entities(entry.content)
        
        print(f"\nExtraction successful!")
        print(f"People: {len(extraction.people)}")
        print(f"Events: {len(extraction.events)}")
        print(f"Feelings: {len(extraction.feelings)}")
        
        # Process and save
        print("\nProcessing and saving entities...")
        extractor.process_and_save(entry, extraction)
        
        print("\nSUCCESS! Entities processed and saved.")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_process_entities()
