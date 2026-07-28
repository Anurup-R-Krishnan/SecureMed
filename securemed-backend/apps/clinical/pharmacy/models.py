from django.conf import settings
from django.db import models
from django.utils import timezone


class Drug(models.Model):
    drug_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200)
    dosage_form = models.CharField(max_length=50)
    strength = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    reorder_level = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_drugs'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.strength})"


class DrugStock(models.Model):
    drug = models.OneToOneField(Drug, on_delete=models.CASCADE, related_name='stock')
    quantity = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_drug_stock'

    @property
    def needs_reorder(self):
        return self.quantity <= self.drug.reorder_level


class DrugBatch(models.Model):
    drug = models.ForeignKey(Drug, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100)
    quantity = models.IntegerField()
    manufacturing_date = models.DateField()
    expiry_date = models.DateField(db_index=True)
    supplier = models.CharField(max_length=200)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    received_date = models.DateField(auto_now_add=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'pharmacy_drug_batches'
        ordering = ['expiry_date']

    @property
    def is_expired(self):
        return timezone.now().date() > self.expiry_date

    @property
    def days_to_expiry(self):
        delta = self.expiry_date - timezone.now().date()
        return delta.days


class StockTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('purchase', 'Purchase'),
        ('dispense', 'Dispense'),
        ('return', 'Return'),
        ('adjustment', 'Adjustment'),
        ('expired', 'Expired'),
    ]

    drug = models.ForeignKey(Drug, on_delete=models.CASCADE, related_name='transactions')
    batch = models.ForeignKey(DrugBatch, on_delete=models.SET_NULL, null=True, blank=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    reference_id = models.CharField(max_length=100, blank=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_stock_transactions'
        ordering = ['-created_at']
