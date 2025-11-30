import os
import sys
import django

sys.path.append('/Users/prasad/Diary-AI-Final/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mindful_backend.settings')
django.setup()

from api.models import JournalEntry, Entity, EntityInteraction
from django.utils import timezone

# Check existing data
print("=== EXISTING DATA ===")
print(f"Journal Entries: {JournalEntry.objects.count()}")
print(f"Entities: {Entity.objects.count()}")
print(f"Entity Interactions: {EntityInteraction.objects.count()}")

# List all entities
print("\n=== ENTITIES ===")
for entity in Entity.objects.all():
    print(f"- {entity.name} ({entity.type})")
    print(f"  Context: {entity.accumulated_context}")
    print(f"  Interactions: {entity.interactions.count()}")

# Check if API key is set
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    print(f"\n✓ API Key is set: {api_key[:10]}...")
    
    # Test extraction on first entry
    entries = JournalEntry.objects.all()
    if entries.exists():
        print(f"\n=== TESTING EXTRACTION ===")
        entry = entries.first()
        print(f"Entry ID: {entry.id}")
        print(f"Content: {entry.content[:100]}...")
        
        try:
            from api.extractor import EntityExtractor
            extractor = EntityExtractor(api_key)
            extraction = extractor.extract_entities(entry.content)
            
            print(f"\nExtraction Result:")
            print(f"- People: {len(extraction.people)}")
            for p in extraction.people:
                print(f"  * {p.name} ({p.relationship})")
            print(f"- Events: {len(extraction.events)}")
            for e in extraction.events:
                print(f"  * {e.name}")
            print(f"- Feelings: {len(extraction.feelings)}")
            for f in extraction.feelings:
                print(f"  * {f.name}")
                
            # Try to save
            print("\n=== SAVING TO DATABASE ===")
            extractor.process_and_save(entry, extraction)
            print("✓ Saved successfully!")
            
            # Check if entities were created
            print(f"\nEntities after save: {Entity.objects.count()}")
            
        except Exception as e:
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("\n✗ No journal entries found")
else:
    print("\n✗ API Key is NOT set in environment")
