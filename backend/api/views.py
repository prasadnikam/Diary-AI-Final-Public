import os
import json
import google.generativeai as genai
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from .models import JournalEntry, Task, FriendProfile, FeedPost, ContentConfig
from .serializers import (
    JournalEntrySerializer, 
    TaskSerializer, 
    FriendProfileSerializer, 
    FeedPostSerializer,
    ContentConfigSerializer
)

# Configure Gemini
# Ensure you set GEMINI_API_KEY in your environment or os.environ
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all().order_by('-date')
    serializer_class = JournalEntrySerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-id')
    serializer_class = TaskSerializer

class FriendProfileViewSet(viewsets.ModelViewSet):
    queryset = FriendProfile.objects.all()
    serializer_class = FriendProfileSerializer

class FeedPostViewSet(viewsets.ModelViewSet):
    queryset = FeedPost.objects.all().order_by('-timestamp')
    serializer_class = FeedPostSerializer

class ContentConfigViewSet(viewsets.ModelViewSet):
    queryset = ContentConfig.objects.all()
    serializer_class = ContentConfigSerializer

    def list(self, request, *args, **kwargs):
        config, created = ContentConfig.objects.get_or_create(id=1)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

# --- AI Views ---

class GenerateStudyPlanView(views.APIView):
    def post(self, request):
        goal = request.data.get('goal')
        # In a real app, handle file uploads for PDF context here
        
        if not goal:
            return Response({"error": "Goal is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = f"""
            Create a concrete list of study tasks for the following goal: "{goal}".
            Return ONLY a raw JSON object with a 'tasks' key containing a list of objects.
            Each object must have: 'title', 'priority' (HIGH/MEDIUM/LOW), 'subject'.
            Do not include markdown formatting like ```json.
            """
            
            response = model.generate_content(prompt)
            # Clean up potential markdown code blocks
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            
            return Response(data['tasks'])
        except Exception as e:
            print(f"AI Error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalyzeJournalEntryView(views.APIView):
    def post(self, request):
        text = request.data.get('text')
        if not text:
             return Response({"error": "Text required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = f"""
            Analyze this journal entry: "{text}"
            Return a raw JSON object with:
            - sentiment (string)
            - reflection (string, 2-3 sentences)
            - tags (array of strings)
            Do not use markdown.
            """
            response = model.generate_content(prompt)
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)