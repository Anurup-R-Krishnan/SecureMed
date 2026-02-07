from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with default users for development and testing'

    def handle(self, *args, **options):
        """
        Creates default users if they don't exist:
        - Admin user (superuser)
        - Doctor user (provider role)
        - Patient user (patient role)
        
        Uses unique usernames to avoid conflicts with existing users.
        """
        
        self.stdout.write(self.style.WARNING('Starting database seeding...'))
        self.stdout.write('')
        
        # Default password for all seeded users
        default_password = 'SecurePass123!@#'
        
        # 1. Create or Get Superuser (Admin)
        admin_email = 'admin@securemed.com'
        admin_username = 'admin_seed'
        
        try:
            admin_user, created = User.objects.get_or_create(
                email=admin_email,
                defaults={
                    'username': admin_username,
                    'role': 'admin',
                    'is_staff': True,
                    'is_superuser': True,
                    'is_active': True
                }
            )
            
            if created:
                admin_user.set_password(default_password)
                admin_user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Created admin user: {admin_email}'))
                self.stdout.write(f'   Username: {admin_user.username}')
                self.stdout.write(f'   Password: {default_password}')
            else:
                # Update role and permissions if user exists
                admin_user.role = 'admin'
                admin_user.is_staff = True
                admin_user.is_superuser = True
                admin_user.is_active = True
                admin_user.save()
                self.stdout.write(self.style.WARNING(f'⚠️  Admin user already exists: {admin_email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to create admin user: {e}'))
        
        # 2. Create or Get Default Doctor
        doctor_email = 'doctor@securemed.com'
        doctor_username = 'doctor_seed'
        
        try:
            doctor_user, created = User.objects.get_or_create(
                email=doctor_email,
                defaults={
                    'username': doctor_username,
                    'role': 'provider',
                    'is_staff': False,
                    'is_superuser': False,
                    'is_active': True
                }
            )
            
            if created:
                doctor_user.set_password(default_password)
                doctor_user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Created doctor user: {doctor_email}'))
                self.stdout.write(f'   Username: {doctor_user.username}')
                self.stdout.write(f'   Password: {default_password}')
            else:
                # Update role if user exists
                doctor_user.role = 'provider'
                doctor_user.is_active = True
                doctor_user.save()
                self.stdout.write(self.style.WARNING(f'⚠️  Doctor user already exists: {doctor_email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to create doctor user: {e}'))
        
        # 3. Create or Get Default Patient
        patient_email = 'patient@securemed.com'
        patient_username = 'patient_seed'
        
        try:
            patient_user, created = User.objects.get_or_create(
                email=patient_email,
                defaults={
                    'username': patient_username,
                    'role': 'patient',
                    'is_staff': False,
                    'is_superuser': False,
                    'is_active': True
                }
            )
            
            if created:
                patient_user.set_password(default_password)
                patient_user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Created patient user: {patient_email}'))
                self.stdout.write(f'   Username: {patient_user.username}')
                self.stdout.write(f'   Password: {default_password}')
            else:
                # Update role if user exists
                patient_user.role = 'patient'
                patient_user.is_active = True
                patient_user.save()
                self.stdout.write(self.style.WARNING(f'⚠️  Patient user already exists: {patient_email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to create patient user: {e}'))
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write('You can now login with:')
        self.stdout.write(f'  Admin:   {admin_email} / {default_password}')
        self.stdout.write(f'  Doctor:  {doctor_email} / {default_password}')
        self.stdout.write(f'  Patient: {patient_email} / {default_password}')
        self.stdout.write('')
        self.stdout.write('Note: Usernames are admin_seed, doctor_seed, patient_seed')
        self.stdout.write('')
