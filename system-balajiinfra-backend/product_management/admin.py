from django.contrib import admin
from .models import Product, ProductInventory

# Register your models here.

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'price', 'category', 'is_active', 'is_service']
    list_filter = ['is_active', 'is_service', 'category', 'gst_type']
    search_fields = ['name', 'sku', 'hsn_code', 'category']
    readonly_fields = ['sku', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'category', 'is_active', 'is_service')
        }),
        ('Pricing & Tax', {
            'fields': ('price', 'hsn_code', 'gst_type', 'gst_percentage')
        }),
        ('Identification', {
            'fields': ('sku',)
        }),
        ('Additional Data', {
            'fields': ('extra_attributes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductInventory)
class ProductInventoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'serial_no', 'status', 'warehouse', 'purchase_date']
    list_filter = ['status', 'warehouse', 'is_serialized']
    search_fields = ['serial_no', 'product__name', 'product__sku']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Product Information', {
            'fields': ('product', 'serial_no', 'is_serialized')
        }),
        ('Status & Location', {
            'fields': ('status', 'warehouse')
        }),
        ('Dates', {
            'fields': ('purchase_date', 'warranty_start', 'warranty_end')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )