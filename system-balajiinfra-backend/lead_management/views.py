from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status, filters
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from .models import Customer, lead_management, LeadFAQ, LeadFollowUp, Employee_detail, Company, WageSheet, PayrollFormula, AttendanceRecord
from .serializers import CustomerSerializer, LeadSerializer, LeadFollowUpSerializer, LeadFAQSerializer, EmployeeDetailSerializer, CompanySerializer, WageSheetSerializer, PayrollFormulaSerializer, AttendanceRecordSerializer
from django.db.models import Q, Case, When, Value, IntegerField
from django.utils import timezone
from .filters import LeadFilter
from rest_framework.decorators import action
from django.core.cache import cache


class CustomerViewsets(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('id')
    serializer_class = CustomerSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'name', '=email', 'secondary_email', 'contact_number',
        'poc_name', 'poc_contact_number', 'land_line_no',
        'city', 'state', 'site_city', 'site_state', 'pin_code'
    ]


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_class = LeadFilter

    ordering_fields = [
        "date",
        "followup_date",
        "customer__name",
        "status",
    ]

    filterset_fields = ['assign_to', 'status', 'followup_date', 'date']
    search_fields = [
        'customer__id',
        'customer__name',
        'customer__contact_number',
        'customer__email',
        'project_name',
        'lead_source'
    ]

    def perform_create(self, serializer):
        user = self.request.user
        role_name = getattr(getattr(user, 'role', None), 'name', '').lower()

        data = {
            "creatd_by": user,
            'date': timezone.localdate()
        }

        if role_name == "sales":
            data["assign_to"] = user

        serializer.save(**data)

    def get_queryset(self):
        user = self.request.user
        today = timezone.localdate()

        queryset = (
            lead_management.objects
            .annotate(
                followup_priority=Case(
                    When(followup_date=today, then=Value(3)),
                    When(followup_date__gt=today, then=Value(2)),
                    When(followup_date__isnull=True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            .order_by(
                "-followup_priority",
                "-followup_date",
                "-date"
            )
        )

        if getattr(user, 'role', None) and user.role.name.lower() == "sales":
            queryset = queryset.filter(assign_to=user)

        lead_source = self.request.query_params.get("lead_source")
        if lead_source:
            lead_source = lead_source.strip().lower()
            fixed_sources = self.get_serializer_class().FIXED_SOURCES

            if lead_source == "other":
                queryset = queryset.exclude(lead_source__in=fixed_sources)
            else:
                queryset = queryset.filter(lead_source=lead_source)

        return queryset

    @action(detail=False, methods=['get'], url_path='latest-lead-by-mobile')
    def latest_lead_by_mobile(self, request):
        mobile = request.query_params.get("mobile")

        if not mobile:
            return Response(
                {"error": "Mobile number is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        lead = (
            lead_management.objects
            .select_related("customer")
            .filter(customer__contact_number=mobile)
            .order_by("-date", "-id")
            .first()
        )

        if not lead:
            return Response(
                {"message": "No lead found for this mobile number"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "project_name": lead.project_name,
            "address": lead.project_adderess if hasattr(lead.customer, "address") else None
        }, status=status.HTTP_200_OK)


class LeadFAQViewSet(viewsets.ModelViewSet):
    queryset = LeadFAQ.objects.all().order_by("sort_order", "id")
    serializer_class = LeadFAQSerializer
    permission_classes = [IsAuthenticated]


class LeadFollowUpViewSet(viewsets.ModelViewSet):
    """
    CRUD for follow-ups. Supports filtering by lead: ?lead=<lead_id>
    """
    serializer_class = LeadFollowUpSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            LeadFollowUp.objects
            .select_related("lead", "created_by")
            .prefetch_related("faq_answers__faq")
        )
        lead_id = self.request.query_params.get("lead")
        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EmployeeDetailViewSet(viewsets.ModelViewSet):
    queryset = Employee_detail.objects.all().order_by("id")
    serializer_class = EmployeeDetailSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = [
        "balaji_emp_code", "name", "father_name", "mobile_no",
        "adhar_no", "account_no", "uan_no", "esic_no", "department", "designation"
    ]
    filterset_fields = ["sex", "department", "designation", "category"]

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by('-id')
    serializer_class = CompanySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

class WageSheetViewSet(viewsets.ModelViewSet):
    queryset = WageSheet.objects.all().order_by('-id')
    serializer_class = WageSheetSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["company"]
    search_fields = ["name"]

class PayrollFormulaViewSet(viewsets.ModelViewSet):
    queryset = PayrollFormula.objects.all().order_by('-id')
    serializer_class = PayrollFormulaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["wage_sheet"]

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().order_by('sr_no')
    serializer_class = AttendanceRecordSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["company", "attendance_date"]
    search_fields = ["emp_code", "emp_name"]

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        company_id = request.data.get('company')
        attendance_date = request.data.get('attendance_date')
        records = request.data.get('records', [])

        if not company_id or not attendance_date:
            return Response({"detail": "company and attendance_date are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Delete existing records for this company and date, then bulk create
        AttendanceRecord.objects.filter(company_id=company_id, attendance_date=attendance_date).delete()

        new_objs = []
        for index, item in enumerate(records, start=1):
            new_objs.append(AttendanceRecord(
                company_id=company_id,
                attendance_date=attendance_date,
                sr_no=item.get('sr_no', index),
                emp_code=item.get('emp_code', ''),
                emp_name=item.get('emp_name', ''),
                mandays=item.get('mandays', 0),
                ot=item.get('ot', 0),
                extra_days=item.get('extra_days', 0),
                extra_ot=item.get('extra_ot', 0),
                payable_mandays=item.get('payable_mandays', 0),
                payable_ot=item.get('payable_ot', 0),
                remark=item.get('remark', ''),
            ))

        AttendanceRecord.objects.bulk_create(new_objs)
        return Response({"detail": f"Successfully saved {len(new_objs)} attendance records"}, status=status.HTTP_200_OK)