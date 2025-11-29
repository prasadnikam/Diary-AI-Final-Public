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
    ContentConfigSerializer,
    UserSerializer
)
from rest_framework.permissions import AllowAny

# Helper: Configure GenAI dynamically for each request
def configure_genai(request):
    # Try getting key from the Frontend Header first
    api_key = request.headers.get('X-Gemini-API-Key')
    
    # Fallback to server env if not provided (optional)
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
        
    if not api_key:
        raise ValueError("API Key is missing. Please set it in Settings.")
        
    genai.configure(api_key=api_key)
    return api_key

# --- Standard CRUD ViewSets (No changes needed here) ---

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

# --- AI Views (Updated to use Dynamic Key) ---

class GenerateStudyPlanView(views.APIView):
    def post(self, request):
        try:
            configure_genai(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        goal = request.data.get('goal')
        time = request.data.get('time', 'next few days')
        
        if not goal:
            return Response({"error": "Goal is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = f"""
            Create a concrete list of study tasks for: "{goal}". Timeframe: {time}.
            Return ONLY a raw JSON object with a 'tasks' key.
            Each task object must have: 'title', 'priority' (HIGH/MEDIUM/LOW), 'subject'.
            Do not use markdown.
            """
            
            response = model.generate_content(prompt)
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            
            return Response(data)
        except Exception as e:
            print(f"AI Error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalyzeJournalEntryView(views.APIView):
    def post(self, request):
        try:
            configure_genai(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

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

# --- MISSING VIEWS ADDED BELOW (Fixes your 404 errors) ---

class GenerateFeedPostView(views.APIView):
    def post(self, request):
        try:
            configure_genai(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        content = request.data.get('content')
        mood = request.data.get('mood')
        config = request.data.get('config', {})

        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = f"""
            Analyze this entry. Mood: {mood}.
            Art Style: {config.get('artStyle', 'Abstract')}.
            Tone: {config.get('captionTone', 'Poetic')}.
            
            Return raw JSON with:
            - visualPrompt (string for image generation)
            - caption (string for social media)
            Do not use markdown.
            Entry: "{content}"
            """
            response = model.generate_content(prompt)
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatResponseView(views.APIView):
    def post(self, request):
        try:
            configure_genai(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        history = request.data.get('history', [])
        message = request.data.get('message', '')
        system_instruction = request.data.get('systemInstruction', '')

        try:
            # Map frontend history format to Gemini format if needed
            formatted_history = []
            for msg in history:
                role = 'user' if msg.get('role') == 'user' else 'model'
                # If your frontend sends 'text' inside parts, adjust here. 
                # Assuming simple format:
                if 'parts' in msg:
                    formatted_history.append({'role': role, 'parts': msg['parts']})
                else:
                    formatted_history.append({'role': role, 'parts': [{'text': msg.get('text', '')}]})

            model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=system_instruction)
            chat = model.start_chat(history=formatted_history)
            
            response = chat.send_message(message)
            return Response({'text': response.text})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)