from django.utils import timezone
from .models import Consent


class PrivacyEngine:
    """
    Utility class for handling data anonymization and privacy-aware data access.
    
    This engine implements consent-based access control for patient data,
    automatically anonymizing patient names when consent is missing, denied, or expired.
    """
    
    @staticmethod
    def anonymize_name(full_name):
        """
        Anonymize a full name by masking all characters except the first letter of each word.
        
        Args:
            full_name (str): The full name to anonymize (e.g., "Varun Raj")
        
        Returns:
            str: Anonymized name (e.g., "V**** R**")
        
        Examples:
            >>> PrivacyEngine.anonymize_name("Varun Raj")
            'V**** R**'
            >>> PrivacyEngine.anonymize_name("John")
            'J***'
            >>> PrivacyEngine.anonymize_name("Mary Jane Watson")
            'M*** J*** W*****'
        """
        if not full_name or not isinstance(full_name, str):
            return "Anonymous"
        
        # Split name by spaces
        words = full_name.strip().split()
        
        if not words:
            return "Anonymous"
        
        # Anonymize each word: keep first letter, replace rest with asterisks
        anonymized_words = []
        for word in words:
            if len(word) == 0:
                continue
            elif len(word) == 1:
                anonymized_words.append(word[0])
            else:
                # First letter + asterisks for remaining characters
                anonymized_words.append(word[0] + '*' * (len(word) - 1))
        
        return ' '.join(anonymized_words)
    
    @staticmethod
    def get_patient_display_name(patient, requesting_department):
        """
        Get the appropriate display name for a patient based on consent status.
        
        This method implements privacy-preserving access control:
        - If consent is GRANTED and VALID (not expired) -> Return full name
        - If consent is MISSING, DENIED, or EXPIRED -> Return anonymized name
        
        Args:
            patient: User object representing the patient
            requesting_department (str): Department requesting access (e.g., "Cardiology")
        
        Returns:
            str: Either the full name or anonymized name based on consent status
        
        Examples:
            >>> # Consent granted and valid
            >>> PrivacyEngine.get_patient_display_name(patient, "Cardiology")
            'Varun Raj'
            
            >>> # Consent denied or expired
            >>> PrivacyEngine.get_patient_display_name(patient, "Neurology")
            'V**** R**'
        """
        # Validate patient object
        if not patient:
            return "Anonymous"
        
        # Get full name for potential anonymization
        full_name = f"{patient.first_name} {patient.last_name}".strip()
        if not full_name:
            full_name = patient.username
        
        try:
            # Query for consent record
            consent = Consent.objects.get(
                patient=patient,
                department=requesting_department
            )
            
            # Check if consent is granted
            if not consent.is_granted:
                return PrivacyEngine.anonymize_name(full_name)
            
            # Check if consent has expired
            if consent.expires_at and consent.expires_at <= timezone.now():
                return PrivacyEngine.anonymize_name(full_name)
            
            # Consent is valid - return full name
            return full_name
            
        except Consent.DoesNotExist:
            # No consent record found - anonymize by default
            return PrivacyEngine.anonymize_name(full_name)
        except Exception as e:
            # Any other error - fail safe by anonymizing
            print(f"Error checking consent: {e}")
            return PrivacyEngine.anonymize_name(full_name)
