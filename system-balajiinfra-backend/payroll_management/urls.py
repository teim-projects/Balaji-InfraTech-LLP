from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeDetailViewSet,
    CompanyViewSet,
    WageSheetViewSet,
    PayrollFormulaViewSet,
    AttendanceRecordViewSet,
)

router = DefaultRouter()
router.register(r'employee-details', EmployeeDetailViewSet, basename='employee-detail')
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'wage-sheets', WageSheetViewSet, basename='wage-sheet')
router.register(r'payroll-formulas', PayrollFormulaViewSet, basename='payroll-formula')
router.register(r'attendance-records', AttendanceRecordViewSet, basename='attendance-record')

urlpatterns = [
    
]

urlpatterns += router.urls