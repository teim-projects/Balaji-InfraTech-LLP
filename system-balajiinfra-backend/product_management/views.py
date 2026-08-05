# product/views.py (NEW)
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Product, ProductInventory
from .serializers import ProductSerializer, ProductInventorySerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'hsn_code', 'category']
    filterset_fields = ['is_active', 'is_service', 'category']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Optionally filter by category"""
        queryset = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset
    
    @action(detail=True, methods=['get'])
    def inventory(self, request, pk=None):
        """Get all inventory items for a product"""
        product = self.get_object()
        inventory = product.inventory_items.all()
        serializer = ProductInventorySerializer(inventory, many=True)
        return Response(serializer.data)

class ProductInventoryViewSet(viewsets.ModelViewSet):
    queryset = ProductInventory.objects.all()
    serializer_class = ProductInventorySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'warehouse', 'product']
    search_fields = ['serial_no', 'product__sku']

# Search endpoint (kept for compatibility)
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def product_search_all(request):
    """Simple product search for dropdowns"""
    search_query = request.GET.get('search', '').strip()
    queryset = Product.objects.filter(is_active=True)
    
    if search_query:
        queryset = queryset.filter(
            Q(name__icontains=search_query) |
            Q(sku__icontains=search_query) |
            Q(category__icontains=search_query)
        )
    
    queryset = queryset[:50]
    
    results = [{
        'id': product.id,
        'sku': product.sku,
        'display_text': f"{product.name} - {product.sku}",
        'name': product.name,
        'category': product.category,
        'price': product.price,
        'price_with_gst': product.get_price_with_gst()
    } for product in queryset]
    
    return Response(results)