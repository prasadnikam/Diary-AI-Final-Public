#!/usr/bin/env python
"""
Test script to debug entity extraction
Run this from the backend directory: python test_entity_extraction.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mindful_backend.settings')
django.setup()

from api.extractor import EntityExtractor
from api.models import JournalEntry

# Test text
test_text = "Had lunch with Sarah at the new cafe. Felt really happy about the promotion."

print("=" * 60)
print("Testing Entity Extraction")
print("=" * 60)

# Check for API key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in environment variables")
    print("Please set it with: export GEMINI_API_KEY='your-key-here'")
    sys.exit(1)

print(f"API Key found: {api_key[:10]}...")
print(f"\nTest text: {test_text}")
print("\n" + "=" * 60)

try:
    extractor = EntityExtractor(api_key)
    print("EntityExtractor initialized successfully")
    
    print("\nExtracting entities...")
    result = extractor.extract_entities(test_text)
    
    print("\n" + "=" * 60)
    print("EXTRACTION RESULTS:")
    print("=" * 60)
    print(f"People found: {len(result.people)}")
    for person in result.people:
        print(f"  - {person.name} ({person.relationship}): {person.context}")
    
    print(f"\nEvents found: {len(result.events)}")
    for event in result.events:
        print(f"  - {event.name} ({event.category}): {event.context}")
    
    print(f"\nFeelings found: {len(result.feelings)}")
    for feeling in result.feelings:
        print(f"  - {feeling.name} (intensity: {feeling.intensity}): {feeling.root_cause}")
    
    print("\n" + "=" * 60)
    print("SUCCESS: Entity extraction completed!")
    print("=" * 60)
    
except Exception as e:
    print("\n" + "=" * 60)
    print("ERROR during extraction:")
    print("=" * 60)
    print(str(e))
    import traceback
    traceback.print_exc()
    sys.exit(1)
