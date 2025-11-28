from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JournalEntryViewSet, 
    TaskViewSet, 
    FriendProfileViewSet, 
    FeedPostViewSet, 
    ContentConfigViewSet,
    GenerateStudyPlanView,
    AnalyzeJournalEntryView
)

router = DefaultRouter()
router.register(r'entries', JournalEntryViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'friends', FriendProfileViewSet)
router.register(r'posts', FeedPostViewSet)
router.register(r'config', ContentConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('generate_study_plan/', GenerateStudyPlanView.as_view(), name='generate_study_plan'),
    path('analyze_entry/', AnalyzeJournalEntryView.as_view(), name='analyze_entry'),
]