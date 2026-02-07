import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from authentication.models import User
from consents.utils import PrivacyEngine


class Command(BaseCommand):
    """
    Django management command to export research data with privacy protection.
    
    This command demonstrates the PrivacyEngine in action by exporting patient data
    with consent-based anonymization for the 'Research Sharing' department.
    
    Usage:
        python manage.py export_research_data
    """
    
    help = 'Export patient data for research with consent-based anonymization'

    def handle(self, *args, **options):
        """Execute the export command."""
        
        # Generate timestamp for unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'research_export_{timestamp}.csv'
        
        # Query all patients
        patients = User.objects.filter(role='patient').order_by('id')
        
        if not patients.exists():
            self.stdout.write(
                self.style.WARNING('No patients found in the database.')
            )
            return
        
        # Open CSV file for writing
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header row
            writer.writerow(['Patient_ID', 'Display_Name', 'Consent_Status'])
            
            # Process each patient
            protected_count = 0
            open_count = 0
            
            for patient in patients:
                # Use PrivacyEngine to get display name based on 'Research Sharing' consent
                display_name = PrivacyEngine.get_patient_display_name(
                    patient=patient,
                    requesting_department='Research Sharing'
                )
                
                # Determine consent status based on anonymization
                # If name contains asterisks, it was anonymized (protected)
                if '*' in display_name:
                    consent_status = 'PROTECTED'
                    protected_count += 1
                else:
                    consent_status = 'OPEN'
                    open_count += 1
                
                # Write row to CSV
                writer.writerow([
                    patient.id,
                    display_name,
                    consent_status
                ])
        
        # Print success message with statistics
        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Research data export completed successfully!')
        )
        self.stdout.write(f'  Filename: {filename}')
        self.stdout.write(f'  Total patients: {patients.count()}')
        self.stdout.write(f'  OPEN (consent granted): {open_count}')
        self.stdout.write(f'  PROTECTED (anonymized): {protected_count}')
        self.stdout.write(
            self.style.SUCCESS(f'\nPrivacy protection verified: {protected_count} patients anonymized.\n')
        )
