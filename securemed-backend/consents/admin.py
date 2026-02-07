from django.contrib import admin
from .models import Consent, ConsentHistory


@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'department', 'is_granted', 'expires_at', 'updated_at')
    list_filter = ('is_granted', 'department', 'updated_at')
    search_fields = ('patient__username', 'patient__email', 'department')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'updated_at'
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('patient',)
        }),
        ('Consent Details', {
            'fields': ('department', 'description', 'is_granted', 'expires_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ConsentHistory)
class ConsentHistoryAdmin(admin.ModelAdmin):
    list_display = ('consent', 'action', 'actor', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('consent__patient__username', 'consent__department', 'actor__username')
    readonly_fields = ('consent', 'action', 'timestamp', 'actor')
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        # History entries should only be created programmatically
        return False
    
    def has_delete_permission(self, request, obj=None):
        # History entries should not be deleted (audit trail)
        return False
