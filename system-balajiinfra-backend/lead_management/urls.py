
from rest_framework.routers import DefaultRouter
from .views import CustomerViewsets , LeadViewSet, LeadFollowUpViewSet, LeadFAQViewSet, EmployeeDetailViewSet, CompanyViewSet, WageSheetViewSet, PayrollFormulaViewSet, AttendanceRecordViewSet

router = DefaultRouter()
router.register(r'customer', CustomerViewsets, basename='customer')
router.register(r'lead', LeadViewSet, basename='lead')
router.register(r'lead-followups', LeadFollowUpViewSet, basename='lead-followup')
router.register(r'lead-faqs', LeadFAQViewSet, basename='lead-faq')
router.register(r'employee-details', EmployeeDetailViewSet, basename='employee-detail')
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'wage-sheets', WageSheetViewSet, basename='wage-sheet')
router.register(r'payroll-formulas', PayrollFormulaViewSet, basename='payroll-formula')
router.register(r'attendance-records', AttendanceRecordViewSet, basename='attendance-record')

urlpatterns = [
    
]

urlpatterns += router.urls