from django.test import TestCase
from api.models import Entity, EntityInteraction, JournalEntry
from django.utils import timezone

class EntityModelTest(TestCase):
    def test_create_entity(self):
        entity = Entity.objects.create(
            type='PERSON',
            name='Rishikesh',
            accumulated_context='Colleague'
        )
        self.assertEqual(entity.name, 'Rishikesh')
        self.assertEqual(entity.type, 'PERSON')
        self.assertEqual(str(entity), 'Rishikesh (PERSON)')

    def test_entity_interaction(self):
        entity = Entity.objects.create(name='Test Event', type='EVENT')
        entry = JournalEntry.objects.create(
            content='Test content',
            date=timezone.now(),
            mood='GOOD'
        )
        interaction = EntityInteraction.objects.create(
            entity=entity,
            journal_entry=entry,
            interaction_snippet='Snippet',
            sentiment_score=0.8
        )
        self.assertEqual(interaction.entity, entity)
        self.assertEqual(interaction.journal_entry, entry)
        self.assertEqual(interaction.sentiment_score, 0.8)
