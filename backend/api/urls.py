from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JournalEntryViewSet, TaskViewSet, FriendProfileViewSet, 
    FeedPostViewSet, ContentConfigViewSet,
    GenerateStudyPlanView, AnalyzeJournalEntryView, 
    GenerateFeedPostView, ChatResponseView, RegisterView,
    ProcessTaskView, SmartFeedView, DecomposeTaskView,
    EntityViewSet, EntityTimelineView, TranscribeAudioView,
    FeedItemViewSet, FeedSettingsView
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'journal-entries', JournalEntryViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'friend-profiles', FriendProfileViewSet)
router.register(r'feed-posts', FeedPostViewSet)
router.register(r'content-config', ContentConfigViewSet)
router.register(r'entities', EntityViewSet)
router.register(r'feed-items', FeedItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # AI Endpoints
    path('generate_study_plan/', GenerateStudyPlanView.as_view()),
    path('analyze_journal_entry/', AnalyzeJournalEntryView.as_view()),
    path('generate_feed_post_from_entry/', GenerateFeedPostView.as_view()),
    path('chat_response/', ChatResponseView.as_view()),
    path('transcribe/', TranscribeAudioView.as_view()),
    
    # Auth Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # AI Task Engine Endpoints
    path('process-task/', ProcessTaskView.as_view(), name='process_task'),
    path('smart-feed/', SmartFeedView.as_view(), name='smart_feed'),
    path('decompose-task/', DecomposeTaskView.as_view(), name='decompose_task'),
    
    # Entity Engine Endpoints
    path('entities/<int:entity_id>/timeline/', EntityTimelineView.as_view(), name='entity_timeline'),
    
    # New Feed Endpoints
    path('feed-settings/', FeedSettingsView.as_view(), name='feed_settings'),
]