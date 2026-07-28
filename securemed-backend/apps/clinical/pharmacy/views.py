from datetime import timedelta

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Drug, DrugBatch, DrugStock, StockTransaction
from .serializers import (
    DrugBatchSerializer,
    DrugSerializer,
    DrugStockSerializer,
    StockTransactionSerializer,
)


class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.filter(is_active=True)
    serializer_class = DrugSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(generic_name__icontains=search) |
                Q(drug_code__icontains=search)
            )
        return queryset.select_related('stock')

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        drugs = Drug.objects.filter(
            is_active=True,
            stock__quantity__lte=F('reorder_level')
        ).select_related('stock')
        serializer = self.get_serializer(drugs, many=True)
        return Response(serializer.data)


class DrugStockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DrugStock.objects.select_related('drug')
    serializer_class = DrugStockSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        low_stock = DrugStock.objects.filter(
            quantity__lte=F('drug__reorder_level')
        ).select_related('drug')
        
        return Response({
            'low_stock_count': low_stock.count(),
            'low_stock_items': DrugStockSerializer(low_stock, many=True).data
        })


class DrugBatchViewSet(viewsets.ModelViewSet):
    queryset = DrugBatch.objects.filter(is_active=True)
    serializer_class = DrugBatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        drug_id = self.request.query_params.get('drug')
        if drug_id:
            queryset = queryset.filter(drug_id=drug_id)
        return queryset.select_related('drug')

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        days = int(request.query_params.get('days', 90))
        expiry_date = timezone.now().date() + timedelta(days=days)
        
        batches = DrugBatch.objects.filter(
            is_active=True,
            expiry_date__lte=expiry_date,
            expiry_date__gte=timezone.now().date()
        ).select_related('drug')
        
        serializer = self.get_serializer(batches, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        batches = DrugBatch.objects.filter(
            is_active=True,
            expiry_date__lt=timezone.now().date()
        ).select_related('drug')
        
        serializer = self.get_serializer(batches, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        batch = serializer.save(received_by=request.user)
        
        stock, created = DrugStock.objects.get_or_create(drug=batch.drug)
        stock.quantity += batch.quantity
        stock.save()
        
        StockTransaction.objects.create(
            drug=batch.drug,
            batch=batch,
            transaction_type='purchase',
            quantity=batch.quantity,
            performed_by=request.user,
            notes=f"Batch {batch.batch_number} received"
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StockTransactionViewSet(viewsets.ModelViewSet):
    queryset = StockTransaction.objects.all()
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post']

    def get_queryset(self):
        queryset = super().get_queryset()
        drug_id = self.request.query_params.get('drug')
        transaction_type = self.request.query_params.get('type')
        
        if drug_id:
            queryset = queryset.filter(drug_id=drug_id)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
            
        return queryset.select_related('drug', 'batch', 'performed_by')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        drug_id = serializer.validated_data['drug'].id
        quantity = serializer.validated_data['quantity']
        transaction_type = serializer.validated_data['transaction_type']
        
        stock, created = DrugStock.objects.get_or_create(drug_id=drug_id)
        
        if transaction_type in ['purchase', 'return']:
            stock.quantity += quantity
        elif transaction_type in ['dispense', 'expired', 'adjustment']:
            if stock.quantity < quantity:
                return Response(
                    {'error': 'Insufficient stock'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            stock.quantity -= quantity
        
        stock.save()
        transaction = serializer.save(performed_by=request.user)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
