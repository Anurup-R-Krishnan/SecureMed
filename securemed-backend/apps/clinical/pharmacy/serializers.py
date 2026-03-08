from rest_framework import serializers
from .models import Drug, DrugStock, DrugBatch, StockTransaction


class DrugSerializer(serializers.ModelSerializer):
    stock_quantity = serializers.SerializerMethodField()
    needs_reorder = serializers.SerializerMethodField()

    class Meta:
        model = Drug
        fields = ['id', 'drug_code', 'name', 'generic_name', 'manufacturer', 
                  'dosage_form', 'strength', 'unit_price', 'reorder_level', 
                  'is_active', 'stock_quantity', 'needs_reorder']

    def get_stock_quantity(self, obj):
        try:
            return obj.stock.quantity
        except DrugStock.DoesNotExist:
            return 0

    def get_needs_reorder(self, obj):
        try:
            return obj.stock.needs_reorder
        except DrugStock.DoesNotExist:
            return True


class DrugBatchSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(source='drug.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = DrugBatch
        fields = ['id', 'drug', 'drug_name', 'batch_number', 'quantity', 
                  'manufacturing_date', 'expiry_date', 'supplier', 'purchase_price',
                  'received_date', 'is_active', 'is_expired', 'days_to_expiry']


class StockTransactionSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(source='drug.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)

    class Meta:
        model = StockTransaction
        fields = ['id', 'drug', 'drug_name', 'batch', 'transaction_type', 
                  'quantity', 'reference_id', 'performed_by', 'performed_by_name',
                  'notes', 'created_at']
        read_only_fields = ['performed_by', 'created_at']


class DrugStockSerializer(serializers.ModelSerializer):
    drug = DrugSerializer(read_only=True)
    needs_reorder = serializers.BooleanField(read_only=True)

    class Meta:
        model = DrugStock
        fields = ['id', 'drug', 'quantity', 'needs_reorder', 'last_updated']
