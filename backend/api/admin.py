from django.contrib import admin
from .models import JournalEntry, Task, FriendProfile, FeedPost, ContentConfig

# Register your models here.
admin.site.register(JournalEntry)
admin.site.register(Task)
admin.site.register(FriendProfile)
admin.site.register(FeedPost)
admin.site.register(ContentConfig)