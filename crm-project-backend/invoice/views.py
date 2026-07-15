from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .filters import InvoiceFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Prefetch
from .models import Invoice
from .serializers import InvoiceSerializer
from django.http import HttpResponse
from rest_framework.decorators import action
from .utils.pdf_generator import generate_invoice_pdf
from django.shortcuts import get_object_or_404


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = InvoiceFilter

    search_fields = [
        "invoice_no",
        "buyer_name",
        "site_name",
    ]

    def get_queryset(self):
        return (
            Invoice.objects
            .select_related("customer", "branch", "site")
            .prefetch_related("terms_conditions")
            .order_by("-id")
        )

    @action(detail=True, methods=['get'], url_path='pdf')
    def download_pdf(self, request, pk=None):
        """Generate and download PDF for invoice"""
        invoice = self.get_object()
        pdf_content = generate_invoice_pdf(invoice)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_no}.pdf"'
        
        return response


# ✅ ADD THIS FUNCTION BACK
def invoice_pdf(request, pk):
    """Generate PDF for invoice (legacy URL support)"""
    invoice = get_object_or_404(Invoice, pk=pk)
    pdf_content = generate_invoice_pdf(invoice)
    
    response = HttpResponse(pdf_content, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_no}.pdf"'
    return response