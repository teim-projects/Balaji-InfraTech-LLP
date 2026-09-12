from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Employee_detail, Company, WageSheet, PayrollFormula, AttendanceRecord


class EmployeeDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee_detail
        fields = "__all__"

    def validate_pan_number(self, value):
        if value:
            return str(value).strip().upper()
        return value


class PayrollFormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollFormula
        fields = "__all__"


class WageSheetSerializer(serializers.ModelSerializer):
    formulas = PayrollFormulaSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = WageSheet
        fields = ["id", "company", "company_name", "name", "description", "is_active", "created_at", "formulas"]


class CompanySerializer(serializers.ModelSerializer):
    wage_sheets = WageSheetSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            "id", "name", "description", "is_active", "created_at", "wage_sheets",
            "address", "vendor", "gst", "pf", "esic", "uniform_charge", "admin_charge", "ctc", "salary_type"
        ]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"