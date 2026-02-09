from django.test import TestCase
from django.contrib.auth import get_user_model
from pharmacy.models import Drug, DrugStock, DrugBatch, StockTransaction
from datetime import date, timedelta

User = get_user_model()


class DrugModelTest(TestCase):
    def setUp(self):
        self.drug = Drug.objects.create(
            drug_code='TEST001',
            name='Test Drug',
            generic_name='Test Generic',
            manufacturer='Test Pharma',
            dosage_form='tablet',
            strength='500mg',
            unit_price=10.50,
            reorder_level=50
        )

    def test_drug_creation(self):
        self.assertEqual(self.drug.drug_code, 'TEST001')
        self.assertEqual(self.drug.name, 'Test Drug')
        self.assertTrue(self.drug.is_active)

    def test_drug_str(self):
        self.assertEqual(str(self.drug), 'Test Drug (500mg)')


class DrugStockModelTest(TestCase):
    def setUp(self):
        self.drug = Drug.objects.create(
            drug_code='TEST002',
            name='Stock Test Drug',
            generic_name='Generic',
            manufacturer='Pharma',
            dosage_form='tablet',
            strength='100mg',
            unit_price=5.00,
            reorder_level=30
        )
        self.stock = DrugStock.objects.create(drug=self.drug, quantity=20)

    def test_stock_creation(self):
        self.assertEqual(self.stock.quantity, 20)
        self.assertEqual(self.stock.drug, self.drug)

    def test_needs_reorder_true(self):
        self.assertTrue(self.stock.needs_reorder)

    def test_needs_reorder_false(self):
        self.stock.quantity = 100
        self.stock.save()
        self.assertFalse(self.stock.needs_reorder)


class DrugBatchModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123'
        )
        self.drug = Drug.objects.create(
            drug_code='TEST003',
            name='Batch Test Drug',
            generic_name='Generic',
            manufacturer='Pharma',
            dosage_form='tablet',
            strength='250mg',
            unit_price=8.00,
            reorder_level=40
        )
        self.batch = DrugBatch.objects.create(
            drug=self.drug,
            batch_number='BATCH001',
            quantity=100,
            manufacturing_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=365),
            supplier='Test Supplier',
            purchase_price=7.50,
            received_by=self.user
        )

    def test_batch_creation(self):
        self.assertEqual(self.batch.batch_number, 'BATCH001')
        self.assertEqual(self.batch.quantity, 100)
        self.assertTrue(self.batch.is_active)

    def test_is_expired_false(self):
        self.assertFalse(self.batch.is_expired)

    def test_is_expired_true(self):
        self.batch.expiry_date = date.today() - timedelta(days=1)
        self.batch.save()
        self.assertTrue(self.batch.is_expired)

    def test_days_to_expiry(self):
        days = self.batch.days_to_expiry
        self.assertGreater(days, 360)


class StockTransactionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='pharmacist',
            email='pharmacist@test.com',
            password='testpass123'
        )
        self.drug = Drug.objects.create(
            drug_code='TEST004',
            name='Transaction Test Drug',
            generic_name='Generic',
            manufacturer='Pharma',
            dosage_form='tablet',
            strength='200mg',
            unit_price=6.00,
            reorder_level=25
        )

    def test_transaction_creation(self):
        transaction = StockTransaction.objects.create(
            drug=self.drug,
            transaction_type='purchase',
            quantity=50,
            performed_by=self.user,
            notes='Initial stock'
        )
        self.assertEqual(transaction.quantity, 50)
        self.assertEqual(transaction.transaction_type, 'purchase')
        self.assertEqual(transaction.performed_by, self.user)
