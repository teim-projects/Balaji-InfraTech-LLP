# product/serializers.py (NEW)
from rest_framework import serializers
from .models import Product, ProductInventory

class ProductSerializer(serializers.ModelSerializer):
    price_with_gst = serializers.DecimalField(
        source='get_price_with_gst', 
        read_only=True, 
        max_digits=12, 
        decimal_places=2
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'hsn_code',
            'gst_type', 'gst_percentage', 'sku', 'category',
            'is_active', 'is_service', 'extra_attributes',
            'price_with_gst', 'created_at', 'updated_at'
        ]
        read_only_fields = ['sku', 'created_at', 'updated_at']
    
    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative")
        return value

class ProductInventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = ProductInventory
        fields = '__all__'