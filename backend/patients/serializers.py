from rest_framework import serializers
from .models import Patient, TimelineEvent, ClinicalNote, Referral, BreakGlassSession

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'

class TimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEvent
        fields = '__all__'

class ClinicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalNote
        fields = '__all__'

class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = '__all__'

class BreakGlassSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakGlassSession
        fields = '__all__'
