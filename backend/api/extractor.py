import google.generativeai as genai
import json
from .models import Entity, EntityInteraction, JournalEntry
from .entity_models import ExtractionResult

class EntityExtractor:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def extract_entities(self, text: str) -> ExtractionResult:
        prompt = """
        You are an expert Psychologist and Data Scientist. Analyze the following diary entry. 
        Extract unique entities into JSON format. 
        For 'People', infer the relationship, sentiment (Positive/Neutral/Negative), and summarize interaction context.
        For 'Feelings', rate intensity 1-10 and identify root cause.
        For 'Events', categorize them and identify date/time if possible.
        
        Return ONLY a raw JSON object with keys: 'people', 'events', 'feelings'.
        Each key should be an array. If no entities of a type are found, return an empty array.
        Do not use markdown.
        
        Example format:
        {
          "people": [{"name": "Sarah", "relationship": "friend", "sentiment": "Positive", "context": "Had lunch together"}],
          "events": [{"name": "Lunch at cafe", "category": "social", "date": null, "context": "New cafe downtown"}],
          "feelings": [{"name": "happiness", "intensity": 8, "root_cause": "Good conversation with friend"}]
        }
        
        Entry:
        """
        
        try:
            print(f"DEBUG: Sending request to Gemini for text: {text[:100]}...")
            response = self.model.generate_content(prompt + text)
            print(f"DEBUG: Raw Gemini Response: {response.text}")
            
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            
            # Robust JSON extraction using regex
            import re
            json_match = re.search(r'\{.*\}', clean_text, re.DOTALL)
            if json_match:
                clean_text = json_match.group(0)
            
            print(f"DEBUG: Cleaned JSON: {clean_text}")
            
            data = json.loads(clean_text)
            
            # Validate that required keys exist
            if 'people' not in data:
                print("WARNING: 'people' key not in response, adding empty array")
                data['people'] = []
            if 'events' not in data:
                print("WARNING: 'events' key not in response, adding empty array")
                data['events'] = []
            if 'feelings' not in data:
                print("WARNING: 'feelings' key not in response, adding empty array")
                data['feelings'] = []
            
            print(f"DEBUG: Parsed data - People: {len(data.get('people', []))}, Events: {len(data.get('events', []))}, Feelings: {len(data.get('feelings', []))}")
            
            return ExtractionResult(**data)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Failed to parse: {clean_text if 'clean_text' in locals() else 'N/A'}")
            import traceback
            traceback.print_exc()
            return ExtractionResult()
        except Exception as e:
            print(f"Extraction Error: {e}")
            import traceback
            traceback.print_exc()
            return ExtractionResult()

    def process_and_save(self, journal_entry: JournalEntry, extraction: ExtractionResult):
        """
        Process extracted entities and save them to the database.
        Uses atomic transactions to ensure all entities are saved or none are saved.
        """
        from django.db import transaction
        
        print(f"[Extractor] Processing {len(extraction.people)} people, {len(extraction.events)} events, {len(extraction.feelings)} feelings")
        
        # Use atomic transaction to ensure all-or-nothing save
        try:
            with transaction.atomic():
                # Process People
                for person in extraction.people:
                    print(f"[Extractor] Processing person: {person.name}")
                    # Deduplication - filter first, then get_or_create
                    existing = Entity.objects.filter(name__iexact=person.name, type='PERSON').first()
                    
                    if existing:
                        entity = existing
                        created = False
                        print(f"[Extractor] Found existing person: {entity.name}")
                    else:
                        entity = Entity.objects.create(
                            name=person.name,
                            type='PERSON',
                            accumulated_context=f"Relationship: {person.relationship}"
                        )
                        created = True
                        print(f"[Extractor] Created new person: {entity.name}")
                    
                    # Update accumulated context
                    if not created:
                        entity.accumulated_context += f"\n- {person.context} ({journal_entry.date.strftime('%Y-%m-%d')})"
                        entity.save()
                    
                    # Create Interaction
                    interaction = EntityInteraction.objects.create(
                        entity=entity,
                        journal_entry=journal_entry,
                        interaction_snippet=person.context,
                        sentiment_score=self._sentiment_to_score(person.sentiment)
                    )
                    print(f"[Extractor] Created interaction {interaction.id} for {person.name}")

                # Process Events
                for event in extraction.events:
                    print(f"[Extractor] Processing event: {event.name}")
                    existing = Entity.objects.filter(name__iexact=event.name, type='EVENT').first()
                    
                    if existing:
                        entity = existing
                        created = False
                        print(f"[Extractor] Found existing event: {entity.name}")
                    else:
                        entity = Entity.objects.create(
                            name=event.name,
                            type='EVENT',
                            accumulated_context=f"Category: {event.category}"
                        )
                        created = True
                        print(f"[Extractor] Created new event: {entity.name}")
                    
                    if not created:
                        entity.accumulated_context += f"\n- {event.context} ({journal_entry.date.strftime('%Y-%m-%d')})"
                        entity.save()
                        
                    interaction = EntityInteraction.objects.create(
                        entity=entity,
                        journal_entry=journal_entry,
                        interaction_snippet=event.context
                    )
                    print(f"[Extractor] Created interaction {interaction.id} for {event.name}")

                # Process Feelings
                for feeling in extraction.feelings:
                    print(f"[Extractor] Processing feeling: {feeling.name}")
                    existing = Entity.objects.filter(name__iexact=feeling.name, type='FEELING').first()
                    
                    if existing:
                        entity = existing
                        print(f"[Extractor] Found existing feeling: {entity.name}")
                    else:
                        entity = Entity.objects.create(
                            name=feeling.name,
                            type='FEELING'
                        )
                        print(f"[Extractor] Created new feeling: {entity.name}")
                    
                    interaction = EntityInteraction.objects.create(
                        entity=entity,
                        journal_entry=journal_entry,
                        interaction_snippet=feeling.root_cause,
                        sentiment_score=feeling.intensity / 10.0
                    )
                    print(f"[Extractor] Created interaction {interaction.id} for {feeling.name}")
                
                print(f"[Extractor] Transaction committed. Total entities in DB: {Entity.objects.count()}")
                
        except Exception as e:
            print(f"[Extractor] Transaction failed and rolled back: {e}")
            import traceback
            traceback.print_exc()
            raise  # Re-raise to be caught by the view

    def _sentiment_to_score(self, sentiment: str) -> float:
        s = sentiment.lower()
        if 'positive' in s: return 1.0
        if 'negative' in s: return 0.0
        return 0.5
