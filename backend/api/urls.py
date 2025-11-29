from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JournalEntryViewSet, TaskViewSet, FriendProfileViewSet, 
    FeedPostViewSet, ContentConfigViewSet,
    GenerateStudyPlanView, AnalyzeJournalEntryView, 
    GenerateFeedPostView, ChatResponseView, RegisterView
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

urlpatterns = [
    path('', include(router.urls)),
    # AI Endpoints
    path('generate_study_plan/', GenerateStudyPlanView.as_view()),
    path('analyze_journal_entry/', AnalyzeJournalEntryView.as_view()),
    path('generate_feed_post_from_entry/', GenerateFeedPostView.as_view()),
    path('chat_response/', ChatResponseView.as_view()),
    
    # Auth Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]