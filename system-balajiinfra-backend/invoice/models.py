from django.db import models
from api.models import BranchManagement, SiteManagement
from django.contrib.auth import get_user_model
from inventory.models import TermsConditions

User = get_user_model()

# Create your models here.

class CompanyProfile(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    gstin = models.CharField(max_length=50)
    pan = models.CharField(max_length=50)
    bank_name = models.CharField(max_length=255)
    account_no = models.CharField(max_length=50)
    ifsc_code = models.CharField(max_length=50)
    branch = models.CharField(max_length=255)
    declaration = models.TextField(blank=True, null=True)


class Invoice(models.Model):
    GST_TYPE_CHOICES = (
        ("CGST_SGST", "CGST + SGST"),
        ("IGST", "IGST"),
        ("NO_GST", "No GST"),
    )

    invoice_no = models.CharField(max_length=50, unique=True)

    customer = models.ForeignKey(
        "lead_management.Customer",
        on_delete=models.PROTECT,
        related_name="invoices"
    )

    invoice_date = models.DateField()

    terms_conditions = models.ManyToManyField(
        "inventory.TermsConditions",
        related_name="invoices",
        blank=True
    )

    # ===== BUYER SNAPSHOT =====
    buyer_name = models.CharField(max_length=255)
    buyer_address = models.TextField()
    buyer_gstin = models.CharField(max_length=20)
    buyer_state = models.CharField(max_length=100, blank=True, null=True)
    buyer_state_code = models.CharField(max_length=10, blank=True, null=True)

    # ===== SHIP TO PARTY =====
    ship_to_address = models.TextField(blank=True, null=True)

    # ===== BRANCH =====
    branch = models.ForeignKey(
        BranchManagement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    bank_name = models.CharField(max_length=255)
    account_no = models.CharField(max_length=50)
    ifsc_code = models.CharField(max_length=50)
    declaration = models.TextField(blank=True, null=True)

    # ===== HEADER FIELDS =====
    delivery_note = models.CharField(max_length=100, blank=True, null=True)
    delivery_note_date = models.DateField(blank=True, null=True, verbose_name="Delivery Note Date")
    delivery_chalan_date = models.DateField(blank=True, null=True)
    supplier_ref = models.CharField(max_length=100, blank=True, null=True)
    other_references = models.CharField(max_length=255, blank=True, null=True)
    buyer_order_no = models.CharField(max_length=100, blank=True, null=True)
    buyer_dated = models.DateField(blank=True, null=True, verbose_name="Buyer Order Date")
    dispatch_doc_no = models.CharField(max_length=100, blank=True, null=True)
    dispatched_through = models.CharField(max_length=255, blank=True, null=True)
    destination = models.CharField(max_length=255, blank=True, null=True)
    site = models.ForeignKey(
        SiteManagement,
        on_delete=models.PROTECT,
        related_name="invoices",
        null=True,
        blank=True
    )
    
    # ===== WORK DESCRIPTION =====
    work_description = models.TextField(blank=True, null=True)

    # ===== ITEMS STORED AS JSON (NO HIGH/LOW TABLES) =====
    items = models.JSONField(default=dict)  # Store both high and low items together

    # ===== TAX TOTALS =====
    gst_type = models.CharField(max_length=20, choices=GST_TYPE_CHOICES, default="CGST_SGST")
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    taxable_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    total_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    amount_in_words = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.invoice_no

class InvoiceHighSideItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="high_side_items"
    )

    # Store product data as JSON snapshot - NO FOREIGN KEY (like Quotation)
    product_data = models.JSONField(default=dict)  # Stores: {id, name, sku, price, category, hsn, gst_percentage}
    
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    unit = models.CharField(max_length=20, default="NOS")

    mathadi_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transportation_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)
    hsn_sac = models.CharField(max_length=50, null=True, blank=True)

    # Calculated fields
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product_data.get('sku', 'N/A')} - {self.quantity}"


class InvoiceLowSideItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="low_side_items"
    )

    # Store item data as JSON snapshot - NO FOREIGN KEY (like Quotation)
    item_data = models.JSONField(default=dict)  # Stores: {id, item_code, name, description, material_type, item_type, etc.}

    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="NOS") 
    hsn_sac = models.CharField(max_length=50, null=True, blank=True)
    mathadi_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)

    # Calculated fields
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.item_data.get('item_code', 'N/A')} - {self.quantity}"