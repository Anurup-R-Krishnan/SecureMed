#!/usr/bin/env python
"""
Helper script to create test users for RBAC verification.
Run this before running verify_rbac.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_users():
    """Create test users for RBAC verification."""
    print("Creating test users for RBAC verification...")
    print()
    
    users_to_create = [
        {
            'username': 'test_doctor',
            'email': 'doctor@test.com',
            'password': 'SecurePass123!@#',
            'role': 'provider'
        },
        {
            'username': 'test_patient',
            'email': 'patient@test.com',
            'password': 'SecurePass123!@#',
            'role': 'patient'
        },
        {
            'username': 'test_admin',
            'email': 'admin@test.com',
            'password': 'SecurePass123!@#',
            'role': 'admin'
        }
    ]
    
    for user_data in users_to_create:
        username = user_data['username']
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            print(f"⚠️  User '{username}' already exists, skipping...")
            continue
        
        # Create user
        user = User.objects.create_user(
            username=user_data['username'],
            email=user_data['email'],
            password=user_data['password'],
            role=user_data['role']
        )
        print(f"✅ Created user: {username} (role: {user_data['role']})")
    
    print()
    print("✅ Test users created successfully!")
    print()
    print("You can now run: python verify_rbac.py")


if __name__ == '__main__':
    create_test_users()
