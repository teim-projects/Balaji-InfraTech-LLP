# services.py
from django.db import transaction
from .models import PurchaseOrder, PurchaseOrderProduct

@transaction.atomic
def create_new_po_version(old_po, validated_data, products_data):
    validated_data = validated_data.copy()
    terms_conditions = validated_data.pop("terms_conditions", None)

    old_po.is_current = False
    old_po.save(update_fields=["is_current"])

    new_po = PurchaseOrder.objects.create(
        vendor=validated_data.get("vendor", old_po.vendor),
        site=validated_data.get("site", old_po.site),
        delivery_destination=validated_data.get("delivery_destination", old_po.delivery_destination),
        branch=validated_data.get("branch", old_po.branch),
        book_no=validated_data.get("book_no", old_po.book_no),
        purchase_order_no=old_po.purchase_order_no,
        version=old_po.version + 1,
        is_current=True,

        po_date=validated_data.get("po_date", old_po.po_date),
        gst_percentage=validated_data.get("gst_percentage", old_po.gst_percentage),
        gst_type=validated_data.get("gst_type", old_po.gst_type),
        transport_charges=validated_data.get("transport_charges", old_po.transport_charges),
        round_off=validated_data.get("round_off", old_po.round_off),
        quotation_ref_no=validated_data.get("quotation_ref_no", old_po.quotation_ref_no),
        quotation_date=validated_data.get("quotation_date", old_po.quotation_date),
        contact_name=validated_data.get("contact_name", old_po.contact_name),
        contact_no=validated_data.get("contact_no", old_po.contact_no),
        note=validated_data.get("note", old_po.note)
    )

    if terms_conditions is not None:
        new_po.terms_conditions.set(terms_conditions)
    else:
        new_po.terms_conditions.set(old_po.terms_conditions.all())

    for product in products_data:
        PurchaseOrderProduct.objects.create(
            purchase_order=new_po,
            **product
        )

    new_po.calculate_totals()

    return new_po