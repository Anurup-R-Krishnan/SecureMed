from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin interface for User model.
    """
    
    list_display = (
        'email',
        'username',
        'first_name',
        'last_name',
        'role',
        'is_active',
        'is_staff',
        'mfa_enabled',
        'failed_login_attempts',
        'is_locked_display',
    )
    
    list_filter = (
        'role',
        'is_active',
        'is_staff',
        'is_superuser',
        'mfa_enabled',
        'date_joined',
    )
    
    search_fields = (
        'email',
        'username',
        'first_name',
        'last_name',
    )
    
    ordering = ('-date_joined',)
    
    readonly_fields = ('date_joined', 'last_login', 'is_locked_display')
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name')
        }),
        ('Role & Permissions', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Multi-Factor Authentication', {
            'fields': ('mfa_enabled', 'mfa_secret'),
            'classes': ('collapse',)
        }),
        ('Account Security', {
            'fields': ('failed_login_attempts', 'locked_until', 'is_locked_display'),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        ('Required Information', {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
        ('Personal Information', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name'),
        }),
        ('Role', {
            'classes': ('wide',),
            'fields': ('role',),
        }),
    )
    
    def is_locked_display(self, obj):
        """
        Display if account is currently locked.
        """
        if obj.is_account_locked():
            return f"🔒 Locked until {obj.locked_until.strftime('%Y-%m-%d %H:%M:%S')}"
        return "✓ Unlocked"
    
    is_locked_display.short_description = 'Account Status'
    
    actions = ['unlock_accounts', 'reset_failed_attempts']
    
    def unlock_accounts(self, request, queryset):
        """
        Admin action to unlock selected accounts.
        """
        count = 0
        for user in queryset:
            if user.is_account_locked():
                user.unlock_account()
                count += 1
        
        self.message_user(
            request,
            f"Successfully unlocked {count} account(s)."
        )
    
    unlock_accounts.short_description = "Unlock selected accounts"
    
    def reset_failed_attempts(self, request, queryset):
        """
        Admin action to reset failed login attempts.
        """
        count = queryset.update(failed_login_attempts=0)
        self.message_user(
            request,
            f"Successfully reset failed login attempts for {count} account(s)."
        )
    
    reset_failed_attempts.short_description = "Reset failed login attempts"
