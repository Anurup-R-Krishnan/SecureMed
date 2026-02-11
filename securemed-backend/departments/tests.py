from django.test import TestCase
from departments.models import Department

class DepartmentTestCase(TestCase):
    def test_department_creation(self):
        department = Department.objects.create(
            name='Cardiology',
            code='CARD',
            description='Heart and cardiovascular care',
            floor=2,
            building='Main Building',
            phone='+1234567890',
            email='cardio@hospital.com'
        )
        self.assertEqual(department.name, 'Cardiology')
        self.assertEqual(department.code, 'CARD')
        self.assertEqual(department.floor, 2)
        
    def test_department_str(self):
        department = Department.objects.create(
            name='Orthopedics',
            code='ORTH',
            floor=3,
            building='Main Building',
            phone='+1234567891',
            email='ortho@hospital.com'
        )
        self.assertEqual(str(department), 'ORTH - Orthopedics')
        
    def test_multiple_departments(self):
        dept1 = Department.objects.create(
            name='Cardiology',
            code='CARD',
            floor=2,
            building='Main Building',
            phone='+1234567890',
            email='cardio@hospital.com'
        )
        dept2 = Department.objects.create(
            name='Neurology',
            code='NEUR',
            floor=4,
            building='Main Building',
            phone='+1234567892',
            email='neuro@hospital.com'
        )
        self.assertEqual(Department.objects.count(), 2)
