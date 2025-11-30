import os
import json
import google.generativeai as genai
from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import JournalEntry, Task, FriendProfile, FeedPost, ContentConfig, Entity, EntityInteraction
from .serializers import (
    JournalEntrySerializer, 
    TaskSerializer, 
    FriendProfileSerializer, 
    FeedPostSerializer,
    ContentConfigSerializer,
    UserSerializer,
    EntitySerializer
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

    def perform_create(self, serializer):
        entry = serializer.save()
        
        # Trigger Entity Extraction
        try:
            api_key = self.request.headers.get('X-Gemini-API-Key')
            if not api_key:
                 api_key = os.environ.get("GEMINI_API_KEY")
            
            if api_key:
                from .extractor import EntityExtractor
                extractor = EntityExtractor(api_key)
                extraction = extractor.extract_entities(entry.content)
                extractor.process_and_save(entry, extraction)
        except Exception as e:
            print(f"Entity Extraction Failed: {e}")

    @action(detail=True, methods=['post'])
    def process_entities(self, request, pk=None):
        """
        Process entities from a journal entry and save them to the database.
        Extracts people, events, and feelings using AI and creates entity records.
        """
        entry = self.get_object()
        print(f"[Entity Processing] Starting for entry {entry.id}")
        print(f"[Entity Processing] Content length: {len(entry.content)} characters")
        
        # Step 1: Validate API Key
        try:
            api_key = configure_genai(request)
            print(f"[Entity Processing] API Key validated: {api_key[:10]}...")
        except ValueError as e:
            error_msg = str(e)
            print(f"[Entity Processing] API Key Error: {error_msg}")
            return Response({
                'error': error_msg,
                'details': 'Please set your Gemini API key in the Settings page.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            print(f"[Entity Processing] Unexpected API Key Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': 'Failed to configure API',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Step 2: Validate Entry Content
        if not entry.content or len(entry.content.strip()) < 10:
            print(f"[Entity Processing] Content too short or empty")
            return Response({
                'error': 'Entry content is too short',
                'details': 'Please write at least a few sentences to extract meaningful entities.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 3: Extract Entities
        try:
            from .extractor import EntityExtractor
            extractor = EntityExtractor(api_key)
            print(f"[Entity Processing] Extracting entities...")
            extraction = extractor.extract_entities(entry.content)
            
            # Validate extraction result
            if not extraction:
                print(f"[Entity Processing] Extraction returned None")
                return Response({
                    'error': 'Entity extraction failed',
                    'details': 'The AI service did not return any results. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            total_entities = len(extraction.people) + len(extraction.events) + len(extraction.feelings)
            print(f"[Entity Processing] Extracted {len(extraction.people)} people, {len(extraction.events)} events, {len(extraction.feelings)} feelings")
            
            if total_entities == 0:
                print(f"[Entity Processing] No entities found in content")
                return Response({
                    'status': 'success',
                    'message': 'No entities found in this entry',
                    'details': 'Try writing about people you met, events you experienced, or feelings you had.',
                    'entities': {'people': 0, 'events': 0, 'feelings': 0}
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"[Entity Processing] Extraction Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': 'Failed to extract entities',
                'details': f'AI extraction error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Step 4: Save Entities to Database
        try:
            print(f"[Entity Processing] Saving entities to database...")
            extractor.process_and_save(entry, extraction)
            print(f"[Entity Processing] Successfully saved all entities")
            
            return Response({
                'status': 'success',
                'message': f'Successfully generated {total_entities} memories!',
                'entities': {
                    'people': len(extraction.people),
                    'events': len(extraction.events),
                    'feelings': len(extraction.feelings)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"[Entity Processing] Database Save Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': 'Failed to save entities',
                'details': f'Database error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

class EntityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Entity.objects.all()
    serializer_class = EntitySerializer
    
    def get_queryset(self):
        queryset = Entity.objects.all()
        type_param = self.request.query_params.get('type')
        if type_param:
            queryset = queryset.filter(type=type_param.upper())
        return queryset

class EntityTimelineView(views.APIView):
    def get(self, request, entity_id):
        try:
            interactions = EntityInteraction.objects.filter(entity_id=entity_id).order_by('-journal_entry__date')
            data = []
            for interaction in interactions:
                data.append({
                    'id': interaction.id,
                    'date': interaction.journal_entry.date,
                    'snippet': interaction.interaction_snippet,
                    'sentiment': interaction.sentiment_score,
                    'entryId': interaction.journal_entry.id
                })
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

# --- AI Task Engine Views ---

class ProcessTaskView(views.APIView):
    """
    Process natural language input into structured tasks using AI Task Engine.
    """
    def post(self, request):
        try:
            api_key = configure_genai(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        user_input = request.data.get('userInput')
        current_context = request.data.get('currentContext', {})

        if not user_input:
            return Response({"error": "userInput is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .engine import TaskEngine
            
            engine = TaskEngine(api_key=api_key)
            processed_tasks = engine.process_input(user_input, current_context, api_key)
            
            # Convert ProcessedTask objects to dictionaries
            tasks_data = []
            for task in processed_tasks:
                task_dict = {
                    'title': task.title,
                    'subtasks': [
                        {
                            'id': st.id,
                            'title': st.title,
                            'completed': st.completed,
                            'estimatedMinutes': st.estimated_minutes
                        }
                        for st in task.subtasks
                    ],
                    'tags': task.tags,
                    'context': task.context.value,
                    'energyLevel': task.energy_level.value,
                    'contextScore': task.context_score,
                    'externalLink': task.external_link,
                    'category': task.category,
                    'estimatedDurationMinutes': task.estimated_duration_minutes,
                    'priority': task.priority.value
                }
                tasks_data.append(task_dict)
            
            return Response({
                'success': True,
                'tasks': tasks_data,
                'message': f'Successfully processed {len(tasks_data)} task(s)'
            })
        except Exception as e:
            print(f"Task Engine Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SmartFeedView(views.APIView):
    """
    Get tasks sorted by contextual relevance using the Feed Algorithm.
    """
    def get(self, request):
        try:
            api_key = configure_genai(request)
        except ValueError as e:
            # API key is optional for basic feed algorithm
            api_key = None

        try:
            from .feed_algorithm import FeedAlgorithm
            
            # Get all tasks
            tasks = Task.objects.all()
            
            # Get recent journal entries for energy assessment
            recent_entries = JournalEntry.objects.all().order_by('-date')[:5]
            
            # Build current context
            from datetime import datetime
            now = datetime.now()
            hour = now.hour
            
            if 5 <= hour < 12:
                time_of_day = "morning"
            elif 12 <= hour < 17:
                time_of_day = "afternoon"
            elif 17 <= hour < 21:
                time_of_day = "evening"
            else:
                time_of_day = "night"
            
            current_context = {
                'time_of_day': time_of_day,
                'day_of_week': now.strftime("%A").lower(),
                'location': 'home'  # Could be enhanced with actual location
            }
            
            # Sort tasks by relevance
            feed_algo = FeedAlgorithm(api_key=api_key)
            sorted_tasks = feed_algo.sort_tasks_by_relevance(
                list(tasks),
                current_context,
                list(recent_entries),
                api_key
            )
            
            # Serialize results
            results = []
            for item in sorted_tasks:
                task_data = TaskSerializer(item['task']).data
                task_data['relevanceScore'] = item['relevance_score']
                results.append(task_data)
            
            return Response({
                'success': True,
                'tasks': results,
                'context': current_context
            })
        except Exception as e:
            print(f"Smart Feed Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DecomposeTaskView(views.APIView):
    """
    Decompose an existing task into subtasks using AI.
    """
    def post(self, request):
        try:
            api_key = configure_genai(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        task_id = request.data.get('taskId')
        
        if not task_id:
            return Response({"error": "taskId is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = Task.objects.get(id=task_id)
            
            from .engine import TaskEngine
            
            engine = TaskEngine(api_key=api_key)
            
            # Get task context or default to PERSONAL
            task_context = getattr(task, 'context', 'PERSONAL')
            task_category = getattr(task, 'category', 'General')
            
            # Decompose the task
            decomposition = engine.decompose_task(
                task.title,
                task_context,
                task_category,
                api_key
            )
            
            # Update task with subtasks
            task.subtasks = decomposition.get('subtasks', [])
            task.tags = decomposition.get('tags', [])
            task.estimated_duration_minutes = decomposition.get('estimated_total_minutes')
            task.save()
            
            # Return updated task
            return Response({
                'success': True,
                'task': TaskSerializer(task).data
            })
        except Task.DoesNotExist:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Decompose Task Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)