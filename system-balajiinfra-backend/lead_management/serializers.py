from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Customer, lead_management, LeadFollowUp, LeadFAQ, LeadFollowUpFAQAnswer, Employee_detail, Company, WageSheet, PayrollFormula, AttendanceRecord
from api.serializers import CustomUserDetailsSerializer
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ('id',)

    def validate_contact_number(self, value):
        value = value.strip()
        qs = Customer.objects.filter(contact_number=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError(
                "Customer with this contact number already exists."
            )
        return value


class LeadFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadFAQ
        fields = ["id", "question", "is_active", "sort_order"]


class LeadFollowUpFAQAnswerSerializer(serializers.ModelSerializer):
    faq_question = serializers.CharField(source="faq.question", read_only=True)

    class Meta:
        model = LeadFollowUpFAQAnswer
        fields = ["id", "faq", "faq_question", "answer"]
        read_only_fields = ["id", "faq_question"]


# ❌ REMOVED: LeadProductSerializer
# ❌ REMOVED: LeadProductReadSerializer
# ❌ REMOVED: LeadFollowUpProductSerializer


class LeadFollowUpSerializer(serializers.ModelSerializer):
    faq_answers = LeadFollowUpFAQAnswerSerializer(many=True, required=False)
    lead_customer_name = serializers.CharField(
        source="lead.customer.name",
        read_only=True
    )

    class Meta:
        model = LeadFollowUp
        fields = [
            "id",
            "lead",
            "lead_customer_name",
            "followup_date",
            "next_followup_date",
            "remarks",
            "status",
            "created_by",
            "created_at",
            "faq_answers",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        faq_data = validated_data.pop("faq_answers", [])

        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        followup = LeadFollowUp.objects.create(**validated_data)

        for item in faq_data:
            LeadFollowUpFAQAnswer.objects.create(followup=followup, **item)

        return followup

    @transaction.atomic
    def update(self, instance, validated_data):
        faq_data = validated_data.pop("faq_answers", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if faq_data is not None:
            instance.faq_answers.all().delete()
            for item in faq_data:
                LeadFollowUpFAQAnswer.objects.create(followup=instance, **item)

        return instance


class LeadSerializer(serializers.ModelSerializer):
    FIXED_SOURCES = [
        'google_ads', 'indiamart', 'bni', 'justdial', 'reference',
        'architect/interior_designe', 'builder', 'existing_customer',
        'scgt', 'ka_staff', 'other',
    ]

    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_contact = serializers.CharField(source="customer.contact_number", read_only=True)
    customer_secondary_contact = serializers.CharField(source="customer.secondary_contact_number", read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_secondary_email = serializers.EmailField(source="customer.secondary_email", read_only=True)
    customer_address = serializers.CharField(source="customer.address", read_only=True)
    customer_city = serializers.CharField(source="customer.city", read_only=True)
    customer_state = serializers.CharField(source="customer.state", read_only=True)
    customer_pincode = serializers.CharField(source="customer.pin_code", read_only=True)
    assign_to_details = CustomUserDetailsSerializer(source="assign_to", read_only=True)
    creatd_by_details = CustomUserDetailsSerializer(source="creatd_by", read_only=True)
    followups = LeadFollowUpSerializer(many=True, read_only=True)

    class Meta:
        model = lead_management
        fields = [
            "id",
            "requirements_details",
            "lead_source",
            "lead_source_input",
            "status",
            "lead_type",
            "is_service_lead",
            "project_name",
            "project_adderess",
            "date",
            "enquiry_date",
            "followup_date",
            "remarks",
            "customer",
            "customer_name",
            "customer_contact",
            "customer_secondary_contact",
            "customer_email",
            "customer_address",
            "customer_city",
            "customer_state",
            "customer_pincode",
            "customer_secondary_email",
            "contact_person_name",
            "contact_person_number",
            "assign_to",
            "creatd_by",
            "assign_to_details",
            "creatd_by_details",
            "service_type",
            "followups",
            "is_qualified",
            "qualifying_answers",
        ]
        read_only_fields = ("id", "creatd_by", "date")

    @transaction.atomic
    def create(self, validated_data):
        lead = lead_management.objects.create(**validated_data)
        return lead

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def validate_lead_source(self, value):
        value = value.strip().lower()
        if value in self.FIXED_SOURCES:
            return value
        if value and value not in self.FIXED_SOURCES:
            return value
        raise serializers.ValidationError("Invalid lead source")


class EmployeeDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee_detail
        fields = "__all__"

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