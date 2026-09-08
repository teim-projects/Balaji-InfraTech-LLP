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
        "balaji_emp_code", "name", "father_or_husband_name", "mobile_no",
        "adhar_no", "account_no", "uan_no", "esic_no", "department", "designation"
    ]
    filterset_fields = ["company", "sex", "department", "designation", "category"]
    pagination_class = None

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        employees_data = request.data.get('employees', [])
        if not employees_data or not isinstance(employees_data, list):
            return Response({"detail": "No employees data provided"}, status=status.HTTP_400_BAD_REQUEST)

        companies_map = {c.name.strip().lower(): c for c in Company.objects.all()}

        # Load existing identifiers from DB to detect repeats
        existing_codes = set()
        for c in Employee_detail.objects.exclude(balaji_emp_code__isnull=True).exclude(balaji_emp_code='').values_list('balaji_emp_code', flat=True):
            if c:
                existing_codes.add(str(c).strip().lower())

        existing_adhars = set()
        for a in Employee_detail.objects.exclude(adhar_no__isnull=True).exclude(adhar_no='').values_list('adhar_no', flat=True):
            if a:
                cleaned_a = str(a).replace(' ', '').replace('-', '').strip()
                if cleaned_a:
                    existing_adhars.add(cleaned_a)

        existing_uans = set()
        for u in Employee_detail.objects.exclude(uan_no__isnull=True).exclude(uan_no='').values_list('uan_no', flat=True):
            if u:
                cleaned_u = str(u).replace(' ', '').replace('-', '').strip()
                if cleaned_u:
                    existing_uans.add(cleaned_u)

        existing_name_mobiles = set()
        for n, m in Employee_detail.objects.values_list('name', 'mobile_no'):
            if n:
                cleaned_m = str(m or '').replace(' ', '').replace('-', '').strip()
                existing_name_mobiles.add((str(n).strip().lower(), cleaned_m))

        created_count = 0
        skipped_count = 0

        # Helper to parse dates
        def parse_date(val):
            if not val:
                return None
            from datetime import datetime, date
            if isinstance(val, (datetime, date)):
                return val
            s = str(val).strip()
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%m/%d/%Y'):
                try:
                    return datetime.strptime(s, fmt).date()
                except ValueError:
                    pass
            return None

        for item in employees_data:
            name = str(item.get('name', '')).strip()
            if not name:
                continue

            emp_code = str(item.get('balaji_emp_code', '')).strip() or None
            raw_adhar = str(item.get('adhar_no', '')).replace(' ', '').replace('-', '').strip() if item.get('adhar_no') is not None else ''
            raw_uan = str(item.get('uan_no', '')).replace(' ', '').replace('-', '').strip() if item.get('uan_no') is not None else ''
            raw_mobile = str(item.get('mobile_no', '')).replace(' ', '').replace('-', '').strip() if item.get('mobile_no') is not None else ''

            # Check if this employee is a repeat
            is_repeat = False

            # 1. Match by Employee Code
            if emp_code and emp_code.lower() in existing_codes:
                is_repeat = True

            # 2. Match by Adhar Number (if provided and at least 6 digits)
            elif raw_adhar and len(raw_adhar) >= 6 and raw_adhar in existing_adhars:
                is_repeat = True

            # 3. Match by UAN Number (if provided and at least 6 digits)
            elif raw_uan and len(raw_uan) >= 6 and raw_uan in existing_uans:
                is_repeat = True

            # 4. Match by Name + Mobile (if mobile provided)
            elif raw_mobile and len(raw_mobile) >= 8 and (name.lower(), raw_mobile) in existing_name_mobiles:
                is_repeat = True

            if is_repeat:
                skipped_count += 1
                continue

            # Resolve company if given as string name or ID
            company_obj = None
            comp_val = item.get('company')
            if comp_val:
                if isinstance(comp_val, int) or (isinstance(comp_val, str) and str(comp_val).isdigit()):
                    company_obj = Company.objects.filter(id=int(comp_val)).first()
                elif isinstance(comp_val, str):
                    company_obj = companies_map.get(comp_val.strip().lower())

            sex_val = str(item.get('sex', 'Male')).strip().title()
            if sex_val.startswith('M'):
                sex = 'Male'
            elif sex_val.startswith('F'):
                sex = 'Female'
            else:
                sex = 'Male'

            raw_basic = float(item.get('basic', 0) or 0)
            basic_val = raw_basic if raw_basic > 0 else 15525.0

            raw_hra = float(item.get('hra', 0) or 0)
            hra_val = raw_hra if raw_hra > 0 else round(basic_val * 0.05, 2)

            cca_val = float(item.get('cca_site_allowance', 0) or 0)
            att_bonus_val = float(item.get('attendance_bonus', 0) or 0)

            raw_bonus = float(item.get('bonus', 0) or 0)
            bonus_val = raw_bonus if raw_bonus > 0 else round(basic_val * 0.0833, 2)

            raw_leave = float(item.get('leave_encashment', 0) or 0)
            leave_val = raw_leave if raw_leave > 0 else round(basic_val * 0.05, 2)

            raw_gross = float(item.get('gross_salary', 0) or 0)
            calc_gross = round(basic_val + hra_val + cca_val + att_bonus_val + bonus_val + leave_val, 2)
            gross_val = raw_gross if raw_gross > 1.2 else calc_gross

            raw_trans = float(item.get('transport', 0) or 0)
            trans_val = raw_trans if raw_trans > 0 else 1500.0

            raw_pf = float(item.get('pf_13', 0) or 0)
            pf_val = raw_pf if raw_pf > 0 else (15000.0 * 0.13 if basic_val > 15000 else round(basic_val * 0.13, 2))

            raw_esic = float(item.get('esic_3_25', 0) or 0)
            esic_val = raw_esic if raw_esic > 0 else round((gross_val - bonus_val) * 0.0325, 2)

            raw_uni = float(item.get('uniform_shoes', 0) or 0)
            uni_val = raw_uni if raw_uni > 0 else 300.0

            raw_serv = float(item.get('services_7', 0) or 0)
            serv_val = raw_serv if raw_serv > 0 else round((gross_val + trans_val + esic_val + uni_val) * 0.07, 2)

            raw_ctc = float(item.get('ctc', 0) or 0)
            ctc_val = raw_ctc if raw_ctc > 0 else round(gross_val + trans_val + pf_val + esic_val + uni_val + serv_val, 2)

            calc_days = int(item.get('calculation_days', 30) or 30)
            per_day_ctc = round(ctc_val / calc_days, 2) if calc_days > 0 else 0.0
            site_paid = round((basic_val + hra_val + cca_val) / calc_days / 8.0, 2) if calc_days > 0 else 0.0
            site_bill = round(site_paid * 1.0325 * 1.07, 2)

            defaults = {
                'name': name,
                'balaji_emp_code': emp_code,
                'salutation': item.get('salutation', 'Mr.') or 'Mr.',
                'sex': sex,
                'marital_status': item.get('marital_status', 'Not Married') or 'Not Married',
                'father_or_husband_name': item.get('father_or_husband_name', ''),
                'dob': parse_date(item.get('dob')),
                'doj': parse_date(item.get('doj')),
                'current_address_line1': item.get('current_address_line1', ''),
                'mobile_no': str(item.get('mobile_no', '')) if item.get('mobile_no') is not None else '',
                'adhar_no': raw_adhar,
                'bank_name': item.get('bank_name', ''),
                'account_no': str(item.get('account_no', '')) if item.get('account_no') is not None else '',
                'ifsc_code': str(item.get('ifsc_code', '')) if item.get('ifsc_code') is not None else '',
                'uan_no': raw_uan,
                'esic_no': str(item.get('esic_no', '')) if item.get('esic_no') is not None else '',
                'nominee_name': item.get('nominee_name', ''),
                'department': item.get('department', ''),
                'designation': item.get('designation', ''),
                'category': item.get('category', ''),
                'calculation_days': calc_days,
                'basic': basic_val,
                'hra': hra_val,
                'cca_site_allowance': cca_val,
                'attendance_bonus': att_bonus_val,
                'bonus': bonus_val,
                'leave_encashment': leave_val,
                'gross_salary': gross_val,
                'transport': trans_val,
                'pf_13': pf_val,
                'esic_3_25': esic_val,
                'uniform_shoes': uni_val,
                'services_7': serv_val,
                'ctc': ctc_val,
                'per_day_ctc': per_day_ctc,
                'site_allowance_paid_rate': site_paid,
                'site_allowance_billing_rate': site_bill,
            }
            if company_obj:
                defaults['company'] = company_obj

            emp = Employee_detail(**defaults)
            emp.save()

            # Record in seen sets so in-file duplicates are also skipped
            if emp.balaji_emp_code:
                existing_codes.add(emp.balaji_emp_code.strip().lower())
            if raw_adhar:
                existing_adhars.add(raw_adhar)
            if raw_uan:
                existing_uans.add(raw_uan)
            if raw_mobile:
                existing_name_mobiles.add((name.lower(), raw_mobile))

            created_count += 1

        return Response({
            "detail": f"Added {created_count} new employee(s). Skipped {skipped_count} repeated record(s).",
            "created": created_count,
            "skipped": skipped_count
        }, status=status.HTTP_200_OK)


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
    pagination_class = None


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