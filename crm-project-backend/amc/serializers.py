from rest_framework import serializers
from .models import (
    AMCContract, AMCRenewal, AMCSparePart,
    ServiceManagementRecord, ServiceManagementMaterial
)
from lead_management.models import Customer


class CustomerSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'contact_number', 'address', 'city', 'state', 'pin_code']


# ===== SERVICE MANAGEMENT SERIALIZERS =====
class ServiceManagementMaterialSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product_data.name', read_only=True)
    product_sku = serializers.CharField(source='product_data.sku', read_only=True)
    
    class Meta:
        model = ServiceManagementMaterial
        fields = ['id', 'product_data', 'product_name', 'product_sku', 'quantity', 'unit', 'rate', 'amount', 'description']


class ServiceManagementRecordSerializer(serializers.ModelSerializer):
    materials = ServiceManagementMaterialSerializer(many=True, read_only=True)
    
    class Meta:
        model = ServiceManagementRecord
        fields = [
            'id', 'customer', 'customer_contact', 'customer_name', 'customer_email', 'subject',
            'contract_type', 'contract_status', 'amc_service_type', 'segment',
            'service_start_date', 'service_end_date',
            'state', 'city', 'pincode', 'address',
            'apply_gst', 'gst_percentage', 'total_price_without_gst', 
            'gst_amount', 'total_price_with_gst', 'materials',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['gst_amount', 'total_price_with_gst', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        record = ServiceManagementRecord.objects.create(**validated_data)
        record.calculate_totals()
        record.save()
        return record
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.calculate_totals()
        instance.save()
        return instance


class ServiceManagementMaterialCreateSerializer(serializers.ModelSerializer):
    product_data = serializers.JSONField(required=True)
    
    class Meta:
        model = ServiceManagementMaterial
        fields = ['product_data', 'quantity', 'unit', 'rate', 'description']


# ===== AMC SERIALIZERS =====
class AMCSparePartSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    item_id = serializers.IntegerField(source='inventory_item.item_id', read_only=True)
    stock_available = serializers.DecimalField(
        source='inventory_item.quantity', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = AMCSparePart
        fields = [
            'id', 'amc_contract', 'inventory_item', 'item_id', 'product_name',
            'quantity_used', 'unit', 'rate_per_unit', 'gst_percent', 'hsn_sac',
            'description', 'total_cost', 'invoice', 'stock_available', 'created_at'
        ]
        read_only_fields = ['total_cost', 'invoice', 'created_at']

    def get_product_name(self, obj):
        if obj.inventory_item and obj.inventory_item.item:
            return obj.inventory_item.item.item_code
        return 'Unknown'


class AMCContractSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    product_name = serializers.CharField(source='product_data.name', read_only=True)
    product_sku = serializers.CharField(source='product_data.sku', read_only=True)
    spare_parts_count = serializers.SerializerMethodField()
    uninvoiced_spare_parts_count = serializers.SerializerMethodField()

    class Meta:
        model = AMCContract
        fields = '__all__'
        read_only_fields = ['contract_number']

    def get_spare_parts_count(self, obj):
        return obj.spare_parts.count()

    def get_uninvoiced_spare_parts_count(self, obj):
        return obj.spare_parts.filter(invoice__isnull=True).count()


class AMCRenewalSerializer(serializers.ModelSerializer):
    previous_contract = AMCContractSerializer(read_only=True)
    new_contract = AMCContractSerializer(read_only=True)
    
    class Meta:
        model = AMCRenewal
        fields = '__all__'