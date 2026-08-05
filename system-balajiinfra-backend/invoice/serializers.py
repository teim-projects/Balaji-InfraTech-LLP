from rest_framework import serializers
from django.db import transaction
from num2words import num2words
from decimal import Decimal
from inventory.models import TermsConditions, TermsConditionType
from .models import Invoice, CompanyProfile


class InvoiceSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    terms_conditions_details = serializers.SerializerMethodField()
    site_name = serializers.CharField(source="site.site_name", read_only=True)

    terms_conditions = serializers.PrimaryKeyRelatedField(
        queryset=TermsConditions.objects.all(),
        many=True,
        required=False
    )
    customer_phone = serializers.CharField(
        source="customer.contact_number",
        read_only=True
    )
    
    invoice_no = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = (
            "taxable_value",
            "cgst_amount",
            "sgst_amount",
            "igst_amount",
            "total_tax",
            "grand_total",
            "created_at",
            "items",
        )

    def get_terms_conditions_details(self, obj):
        data = []
        for term in obj.terms_conditions.all():
            data.append({
                "id": term.id,
                "terms": term.terms,
                "terms_condition_type_name": term.terms_condition_type.name
            })
        return data

    # =====================================================
    # 🔥 CALCULATION ENGINE - Direct JSON storage
    # =====================================================
    def calculate_totals(self, invoice, high_items, low_items):
        taxable_value = Decimal("0")
        gst_total = Decimal("0")
        
        # Store all items in a single JSON structure
        items_data = {
            "high_side_items": [],
            "low_side_items": []
        }
        
        # Process and store high side items
        for item in high_items:
            qty = Decimal(str(item.get("quantity", 0)))
            rate = Decimal(str(item.get("unit_price", 0)))
            gst_percent = Decimal(str(item.get("gst_percent", 0)))
            mathadi = Decimal(str(item.get("mathadi_charges", 0)))
            transport = Decimal(str(item.get("transportation_charges", 0)))

            base = qty * rate
            gst_amount = (base * gst_percent) / Decimal("100")

            taxable_value += base
            gst_total += gst_amount

            items_data["high_side_items"].append({
                "product_data": item.get("product_data", {}),
                "quantity": float(qty),
                "unit_price": float(rate),
                "gst_percent": float(gst_percent),
                "unit": item.get("unit", "NOS"),
                "mathadi_charges": float(mathadi),
                "transportation_charges": float(transport),
                "description": item.get("description", ""),
                "hsn_sac": item.get("hsn_sac", ""),
                "base_amount": float(base),
                "gst_amount": float(gst_amount),
                "total_with_gst": float(base + gst_amount + mathadi + transport)
            })

        # Process and store low side items
        for item in low_items:
            qty = Decimal(str(item.get("quantity", 0)))
            rate = Decimal(str(item.get("unit_price", 0)))
            gst_percent = Decimal(str(item.get("gst_percent", 0)))
            mathadi = Decimal(str(item.get("mathadi_charges", 0)))

            base = qty * rate
            gst_amount = (base * gst_percent) / Decimal("100")

            taxable_value += base
            gst_total += gst_amount

            items_data["low_side_items"].append({
                "item_data": item.get("item_data", {}),
                "quantity": float(qty),
                "unit_price": float(rate),
                "gst_percent": float(gst_percent),
                "unit": item.get("unit", "NOS"),
                "mathadi_charges": float(mathadi),
                "description": item.get("description", ""),
                "hsn_sac": item.get("hsn_sac", ""),
                "base_amount": float(base),
                "gst_amount": float(gst_amount),
                "total_with_gst": float(base + gst_amount + mathadi)
            })

        # Store all items as JSON directly on the invoice
        invoice.items = items_data

        # ================= FINAL TOTAL =================
        invoice.taxable_value = taxable_value

        if invoice.gst_type == "NO_GST":
            invoice.cgst_amount = Decimal("0")
            invoice.sgst_amount = Decimal("0")
            invoice.igst_amount = Decimal("0")
            invoice.total_tax = Decimal("0")
            invoice.gst_percentage = Decimal("0")
            invoice.grand_total = taxable_value

        elif invoice.gst_type == "CGST_SGST":
            invoice.cgst_amount = gst_total / Decimal("2")
            invoice.sgst_amount = gst_total / Decimal("2")
            invoice.igst_amount = Decimal("0")
            invoice.gst_percentage = gst_total / taxable_value * Decimal("100") if taxable_value > 0 else Decimal("0")
            invoice.total_tax = gst_total
            invoice.grand_total = taxable_value + gst_total

        elif invoice.gst_type == "IGST":
            invoice.igst_amount = gst_total
            invoice.cgst_amount = Decimal("0")
            invoice.sgst_amount = Decimal("0")
            invoice.gst_percentage = gst_total / taxable_value * Decimal("100") if taxable_value > 0 else Decimal("0")
            invoice.total_tax = gst_total
            invoice.grand_total = taxable_value + gst_total

        # ================= AMOUNT IN WORDS =================
        rupees = int(invoice.grand_total)
        paise = int((invoice.grand_total - rupees) * 100)

        words = num2words(rupees, lang="en_IN").title()

        if paise > 0:
            paise_words = num2words(paise, lang="en_IN").title()
            invoice.amount_in_words = f"{words} Rupees and {paise_words} Paise Only"
        else:
            invoice.amount_in_words = f"{words} Rupees Only"

        invoice.save()

    # =====================================================
    # CREATE
    # =====================================================
    @transaction.atomic
    def create(self, validated_data):
        high_items = validated_data.pop("high_side_items", [])
        low_items = validated_data.pop("low_side_items", [])
        terms = validated_data.pop("terms_conditions", [])

        if not validated_data.get("invoice_no"):
            last_invoice = Invoice.objects.order_by('-id').first()
            if last_invoice and last_invoice.invoice_no:
                try:
                    last_num = int(last_invoice.invoice_no.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1

            from datetime import datetime
            year = datetime.now().year
            validated_data["invoice_no"] = f"INV-{year}-{new_num:04d}"

        invoice = Invoice.objects.create(**validated_data)

        if terms:
            invoice.terms_conditions.set(terms)

        self.calculate_totals(invoice, high_items, low_items)

        return invoice

    # =====================================================
    # UPDATE
    # =====================================================
    @transaction.atomic
    def update(self, instance, validated_data):
        high_items = validated_data.pop("high_side_items", [])
        low_items = validated_data.pop("low_side_items", [])
        terms = validated_data.pop("terms_conditions", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if terms is not None:
            instance.terms_conditions.set(terms)

        self.calculate_totals(instance, high_items, low_items)

        return instance