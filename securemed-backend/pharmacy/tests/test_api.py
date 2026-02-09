from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from pharmacy.models import Drug, DrugStock, DrugBatch, StockTransaction
from datetime import date, timedelta

User = get_user_model()


class DrugAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pharmacist',
            email='pharmacist@test.com',
            password='testpass123',
            role='pharmacist'
        )
        self.client.force_authenticate(user=self.user)
        
        self.drug = Drug.objects.create(
            drug_code='API001',
            name='API Test Drug',
            generic_name='Generic API',
            manufacturer='Test Pharma',
            dosage_form='tablet',
            strength='500mg',
            unit_price=12.00,
            reorder_level=50
        )
        DrugStock.objects.create(drug=self.drug, quantity=30)

    def test_list_drugs(self):
        response = self.client.get('/api/pharmacy/drugs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_drug(self):
        data = {
            'drug_code': 'NEW001',
            'name': 'New Drug',
            'generic_name': 'New Generic',
            'manufacturer': 'New Pharma',
            'dosage_form': 'capsule',
            'strength': '250mg',
            'unit_price': 15.00,
            'reorder_level': 40
        }
        response = self.client.post('/api/pharmacy/drugs/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Drug.objects.count(), 2)

    def test_search_drugs(self):
        response = self.client.get('/api/pharmacy/drugs/?search=API')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_low_stock_drugs(self):
        response = self.client.get('/api/pharmacy/drugs/low_stock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)


class DrugBatchAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pharmacist',
            email='pharmacist@test.com',
            password='testpass123',
            role='pharmacist'
        )
        self.client.force_authenticate(user=self.user)
        
        self.drug = Drug.objects.create(
            drug_code='BATCH001',
            name='Batch Test Drug',
            generic_name='Generic',
            manufacturer='Pharma',
            dosage_form='tablet',
            strength='100mg',
            unit_price=8.00,
            reorder_level=30
        )

    def test_create_batch(self):
        data = {
            'drug': self.drug.id,
            'batch_number': 'B001',
            'quantity': 100,
            'manufacturing_date': str(date.today() - timedelta(days=30)),
            'expiry_date': str(date.today() + timedelta(days=365)),
            'supplier': 'Test Supplier',
            'purchase_price': 7.50
        }
        response = self.client.post('/api/pharmacy/batches/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        stock = DrugStock.objects.get(drug=self.drug)
        self.assertEqual(stock.quantity, 100)

    def test_expiring_soon(self):
        DrugBatch.objects.create(
            drug=self.drug,
            batch_number='EXP001',
            quantity=50,
            manufacturing_date=date.today() - timedelta(days=300),
            expiry_date=date.today() + timedelta(days=60),
            supplier='Supplier',
            purchase_price=7.00,
            received_by=self.user
        )
        response = self.client.get('/api/pharmacy/batches/expiring_soon/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)


class StockTransactionAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pharmacist',
            email='pharmacist@test.com',
            password='testpass123',
            role='pharmacist'
        )
        self.client.force_authenticate(user=self.user)
        
        self.drug = Drug.objects.create(
            drug_code='TRANS001',
            name='Transaction Drug',
            generic_name='Generic',
            manufacturer='Pharma',
            dosage_form='tablet',
            strength='200mg',
            unit_price=10.00,
            reorder_level=40
        )
        DrugStock.objects.create(drug=self.drug, quantity=100)

    def test_create_purchase_transaction(self):
        data = {
            'drug': self.drug.id,
            'transaction_type': 'purchase',
            'quantity': 50,
            'notes': 'New stock received'
        }
        response = self.client.post('/api/pharmacy/transactions/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        stock = DrugStock.objects.get(drug=self.drug)
        self.assertEqual(stock.quantity, 150)

    def test_create_dispense_transaction(self):
        data = {
            'drug': self.drug.id,
            'transaction_type': 'dispense',
            'quantity': 20,
            'reference_id': 'RX001',
            'notes': 'Dispensed to patient'
        }
        response = self.client.post('/api/pharmacy/transactions/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        stock = DrugStock.objects.get(drug=self.drug)
        self.assertEqual(stock.quantity, 80)

    def test_insufficient_stock(self):
        data = {
            'drug': self.drug.id,
            'transaction_type': 'dispense',
            'quantity': 200,
            'notes': 'Should fail'
        }
        response = self.client.post('/api/pharmacy/transactions/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
