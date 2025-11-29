from rest_framework import serializers
from django.contrib.auth.models import User
from .models import JournalEntry, Task, FriendProfile, FeedPost, ContentConfig

class JournalEntrySerializer(serializers.ModelSerializer):
    # Mapping snake_case model fields to camelCase JSON for frontend compatibility
    aiReflection = serializers.CharField(source='ai_reflection', required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = JournalEntry
        # CHANGED: Replaced 'ai_reflection' with 'aiReflection'
        fields = ['id', 'date', 'content', 'mood', 'aiReflection', 'tags', 'attachments', 'type']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class TaskSerializer(serializers.ModelSerializer):
    dueDate = serializers.DateTimeField(source='due_date', required=False)

    class Meta:
        model = Task
        fields = ['id', 'title', 'completed', 'dueDate', 'priority', 'subject']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class FriendProfileSerializer(serializers.ModelSerializer):
    voiceName = serializers.CharField(source='voice_name')
    avatarUrl = serializers.URLField(source='avatar_url', required=False, allow_blank=True)

    class Meta:
        model = FriendProfile
        fields = ['id', 'name', 'personality', 'context', 'voiceName', 'avatarUrl']

class FeedPostSerializer(serializers.ModelSerializer):
    entryId = serializers.PrimaryKeyRelatedField(source='entry', queryset=JournalEntry.objects.all())
    imageUrl = serializers.CharField(source='image_url', required=False, allow_blank=True)
    videoUrl = serializers.CharField(source='video_url', required=False, allow_blank=True)
    moodTag = serializers.CharField(source='mood_tag')
    isLiked = serializers.BooleanField(source='is_liked')
    audioData = serializers.CharField(source='audio_data', required=False, allow_blank=True)

    class Meta:
        model = FeedPost
        fields = ['id', 'entryId', 'imageUrl', 'videoUrl', 'caption', 'likes', 'isLiked', 'timestamp', 'moodTag', 'audioData']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['entryId'] = str(data['entryId'])
        return data

class ContentConfigSerializer(serializers.ModelSerializer):
    artStyle = serializers.CharField(source='art_style')
    captionTone = serializers.CharField(source='caption_tone')
    includeAudio = serializers.BooleanField(source='include_audio')
    outputFormat = serializers.CharField(source='output_format')

    class Meta:
        model = ContentConfig
        fields = ['id', 'artStyle', 'captionTone', 'includeAudio', 'outputFormat']

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user