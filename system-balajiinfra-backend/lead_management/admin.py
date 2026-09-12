from django.contrib import admin
from .models import Company, WageSheet, PayrollFormula, Employee_detail, AttendanceRecord

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'salary_type', 'is_active', 'created_at')
    search_fields = ('name',)

@admin.register(WageSheet)
class WageSheetAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company', 'is_active', 'created_at')
    list_filter = ('company',)
    search_fields = ('name',)

@admin.register(PayrollFormula)
class PayrollFormulaAdmin(admin.ModelAdmin):
    list_display = ('id', 'wage_sheet', 'target_field', 'base_field', 'operator', 'percentage_or_value')
    list_filter = ('wage_sheet',)

@admin.register(Employee_detail)
class EmployeeDetailAdmin(admin.ModelAdmin):
    list_display = ('id', 'balaji_emp_code', 'name', 'company', 'mobile_no', 'department', 'designation')
    search_fields = ('balaji_emp_code', 'name', 'mobile_no', 'adhar_no', 'uan_no')
    list_filter = ('company', 'sex', 'department')

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'attendance_date', 'emp_code', 'emp_name', 'mandays', 'ot')
    search_fields = ('emp_code', 'emp_name')
    list_filter = ('company', 'attendance_date')