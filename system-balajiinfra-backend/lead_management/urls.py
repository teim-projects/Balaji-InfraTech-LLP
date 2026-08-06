
from rest_framework.routers import DefaultRouter
from .views import CustomerViewsets , LeadViewSet, LeadFollowUpViewSet, LeadFAQViewSet, EmployeeDetailViewSet

router = DefaultRouter()
router.register(r'customer', CustomerViewsets, basename='customer')
router.register(r'lead', LeadViewSet, basename='lead')
router.register(r'lead-followups', LeadFollowUpViewSet, basename='lead-followup')
router.register(r'lead-faqs', LeadFAQViewSet, basename='lead-faq')
router.register(r'employee-details', EmployeeDetailViewSet, basename='employee-detail')

urlpatterns = [
    
]

urlpatterns += router.urls