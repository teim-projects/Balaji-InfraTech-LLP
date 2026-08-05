# product/models.py (NEW - Generic)
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Product(models.Model):
    # Core fields that all products need
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Pricing & Tax
    price = models.DecimalField(max_digits=12, decimal_places=2)
    hsn_code = models.CharField(max_length=20, blank=True, null=True)
    
    GST_CHOICES = [
        ('GST', 'GST'),
        ('IGST', 'IGST'),
        ('CGST_SGST', 'CGST + SGST'),
        ('EXEMPT', 'Exempt'),
        ('NIL', 'Nil Rated'),
    ]
    gst_type = models.CharField(max_length=20, choices=GST_CHOICES, default='GST')
    gst_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=18.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Identification
    sku = models.CharField(max_length=100, unique=True, blank=True)
    category = models.CharField(max_length=100, blank=True, null=True)  # Generic category
    
    # Status
    is_active = models.BooleanField(default=True)
    is_service = models.BooleanField(default=False)  # For AMC/service products
    
    # Additional flexible data (JSON field for client-specific fields)
    extra_attributes = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.sku:
            self.sku = self.generate_sku()
        super().save(*args, **kwargs)
    
    def generate_sku(self):
        """Generate SKU from name"""
        base = self.name[:3].upper()
        import uuid
        return f"{base}-{uuid.uuid4().hex[:6].upper()}"
    
    def get_price_with_gst(self):
        """Calculate price including GST"""
        return self.price + (self.price * self.gst_percentage / 100)
    
    def __str__(self):
        return self.name

class ProductInventory(models.Model):
    """Generic inventory tracking"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_items')
    serial_no = models.CharField(max_length=200, unique=True)
    
    STATUS_CHOICES = [
        ('IN_STOCK', 'In Stock'),
        ('SOLD', 'Sold'),
        ('DAMAGED', 'Damaged'),
        ('RESERVED', 'Reserved'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_STOCK')
    
    warehouse = models.CharField(max_length=200, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    warranty_start = models.DateField(blank=True, null=True)
    warranty_end = models.DateField(blank=True, null=True)
    
    # For serialized items only
    is_serialized = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    def __str__(self):
        return f"{self.product.sku}-{self.serial_no}"