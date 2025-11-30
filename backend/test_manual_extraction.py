import os
import sys
import django

sys.path.append('/Users/prasad/Diary-AI-Final/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mindful_backend.settings')
django.setup()

from api.models import JournalEntry, Entity, EntityInteraction
from api.entity_models import ExtractionResult, ExtractedPerson, ExtractedEvent, ExtractedFeeling
from django.utils import timezone

# Create a test journal entry
print("=== Creating Test Journal Entry ===")
test_content = """
Today I had lunch with Sarah at the new Italian restaurant downtown. 
She told me about her new job and we discussed our upcoming trip to Paris.
I felt really excited about the travel plans. Later, I went to the gym 
and felt energized after the workout.
"""

entry = JournalEntry.objects.create(
    content=test_content,
    date=timezone.now(),
    mood='GOOD'
)
print(f"Created entry {entry.id}")

# Manually create extraction result (simulating what Gemini would return)
print("\n=== Creating Mock Extraction ===")
extraction = ExtractionResult(
    people=[
        ExtractedPerson(
            name="Sarah",
            relationship="Friend",
            sentiment="Positive",
            context="Had lunch and discussed new job and Paris trip"
        )
    ],
    events=[
        ExtractedEvent(
            name="Lunch at Italian Restaurant",
            category="Social",
            context="Went to new Italian restaurant downtown"
        ),
        ExtractedEvent(
            name="Gym Workout",
            category="Fitness",
            context="Went to the gym"
        )
    ],
    feelings=[
        ExtractedFeeling(
            name="Excited",
            intensity=8,
            root_cause="Upcoming trip to Paris"
        ),
        ExtractedFeeling(
            name="Energized",
            intensity=7,
            root_cause="After gym workout"
        )
    ]
)

print(f"Mock extraction: {len(extraction.people)} people, {len(extraction.events)} events, {len(extraction.feelings)} feelings")

# Process and save using the actual extractor logic
print("\n=== Processing with Extractor ===")
from api.extractor import EntityExtractor

# Create a mock extractor (we'll call process_and_save directly)
class MockExtractor:
    def _sentiment_to_score(self, sentiment: str) -> float:
        s = sentiment.lower()
        if 'positive' in s: return 1.0
        if 'negative' in s: return 0.0
        return 0.5

mock = MockExtractor()

# Import the actual process_and_save method
from api.extractor import EntityExtractor
# We need an API key but we're only testing process_and_save
# So we'll just call the method directly with a mock instance

print("\n=== Manual Processing ===")
# Process People
for person in extraction.people:
    print(f"Processing person: {person.name}")
    existing = Entity.objects.filter(name__iexact=person.name, type='PERSON').first()
    
    if existing:
        entity = existing
        created = False
    else:
        entity = Entity.objects.create(
            name=person.name,
            type='PERSON',
            accumulated_context=f"Relationship: {person.relationship}"
        )
        created = True
        print(f"  Created: {entity.name}")
    
    EntityInteraction.objects.create(
        entity=entity,
        journal_entry=entry,
        interaction_snippet=person.context,
        sentiment_score=1.0 if person.sentiment == "Positive" else 0.5
    )

# Process Events
for event in extraction.events:
    print(f"Processing event: {event.name}")
    existing = Entity.objects.filter(name__iexact=event.name, type='EVENT').first()
    
    if existing:
        entity = existing
    else:
        entity = Entity.objects.create(
            name=event.name,
            type='EVENT',
            accumulated_context=f"Category: {event.category}"
        )
        print(f"  Created: {entity.name}")
    
    EntityInteraction.objects.create(
        entity=entity,
        journal_entry=entry,
        interaction_snippet=event.context
    )

# Process Feelings
for feeling in extraction.feelings:
    print(f"Processing feeling: {feeling.name}")
    existing = Entity.objects.filter(name__iexact=feeling.name, type='FEELING').first()
    
    if existing:
        entity = existing
    else:
        entity = Entity.objects.create(
            name=feeling.name,
            type='FEELING'
        )
        print(f"  Created: {entity.name}")
    
    EntityInteraction.objects.create(
        entity=entity,
        journal_entry=entry,
        interaction_snippet=feeling.root_cause,
        sentiment_score=feeling.intensity / 10.0
    )

print("\n=== RESULTS ===")
print(f"Total Entities: {Entity.objects.count()}")
print(f"Total Interactions: {EntityInteraction.objects.count()}")

print("\n=== Entities Created ===")
for entity in Entity.objects.all():
    print(f"- {entity.name} ({entity.type})")
    print(f"  Interactions: {entity.interactions.count()}")
