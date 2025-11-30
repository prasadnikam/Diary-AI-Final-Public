from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Entity, EntityInteraction, JournalEntry
from django.utils import timezone

class EntityViewTest(APITestCase):
    def setUp(self):
        self.entity = Entity.objects.create(name='Test Person', type='PERSON')
        self.entry = JournalEntry.objects.create(
            content='Test', date=timezone.now(), mood='GOOD'
        )
        self.interaction = EntityInteraction.objects.create(
            entity=self.entity, journal_entry=self.entry, interaction_snippet='Test', sentiment_score=0.5
        )

    def test_get_entities(self):
        url = reverse('entity-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_timeline(self):
        url = reverse('entity_timeline', args=[self.entity.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
