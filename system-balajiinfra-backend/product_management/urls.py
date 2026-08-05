# product/urls.py (NEW)
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductInventoryViewSet, product_search_all

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'inventory', ProductInventoryViewSet, basename='inventory')

urlpatterns = [
    path('product-search-all/', product_search_all, name='product_search_all'),
]

urlpatterns += router.urls