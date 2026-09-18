from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action

from .models import Employee_detail, Company, WageSheet, PayrollFormula, AttendanceRecord
from .serializers import (
    EmployeeDetailSerializer,
    CompanySerializer,
    WageSheetSerializer,
    PayrollFormulaSerializer,
    AttendanceRecordSerializer,
)


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
            if emp_code and emp_code.lower() in existing_codes:
                is_repeat = True
            elif raw_adhar and raw_adhar in existing_adhars:
                is_repeat = True
            elif raw_uan and raw_uan in existing_uans:
                is_repeat = True
            elif raw_mobile and (name.lower(), raw_mobile) in existing_name_mobiles:
                is_repeat = True

            if is_repeat:
                skipped_count += 1
                continue

            # Resolve Company
            company_obj = None
            comp_val = item.get('company')
            if comp_val:
                if isinstance(comp_val, int):
                    company_obj = Company.objects.filter(id=comp_val).first()
                elif str(comp_val).isdigit():
                    company_obj = Company.objects.filter(id=int(comp_val)).first()
                else:
                    company_obj = companies_map.get(str(comp_val).strip().lower())
                    if not company_obj:
                        company_obj = Company.objects.create(name=str(comp_val).strip())
                        companies_map[str(comp_val).strip().lower()] = company_obj

            # Prepare fields
            emp_dict = {
                'name': name,
                'balaji_emp_code': emp_code,
                'company': company_obj,
                'sex': item.get('sex', 'Male'),
                'salutation': item.get('salutation', 'Mr.'),
                'marital_status': item.get('marital_status', 'Not Married'),
                'dob': parse_date(item.get('dob')),
                'doj': parse_date(item.get('doj')),
                'adhar_no': item.get('adhar_no') or None,
                'pan_number': str(item.get('pan_number', '')).strip().upper() or None,
                'uan_no': item.get('uan_no') or None,
                'esic_no': item.get('esic_no') or None,
                'mobile_no': item.get('mobile_no') or None,
                'bank_name': item.get('bank_name') or None,
                'bank_holder_name': item.get('bank_holder_name') or None,
                'account_no': item.get('account_no') or None,
                'ifsc_code': item.get('ifsc_code') or None,
                'department': item.get('department') or None,
                'designation': item.get('designation') or None,
                'category': item.get('category') or None,
                'father_or_husband_name': item.get('father_or_husband_name') or None,
                'current_address_line1': item.get('current_address_line1') or None,
                'current_address_city': item.get('current_address_city') or None,
                'current_address_state': item.get('current_address_state') or None,
                'current_address_pincode': item.get('current_address_pincode') or None,
                'permanent_address_line1': item.get('permanent_address_line1') or None,
                'permanent_address_city': item.get('permanent_address_city') or None,
                'permanent_address_state': item.get('permanent_address_state') or None,
                'permanent_address_pincode': item.get('permanent_address_pincode') or None,
                'basic': item.get('basic', 15525.00) or 15525.00,
                'hra': item.get('hra', 776.25) or 776.25,
                'cca_site_allowance': item.get('cca_site_allowance', 0.00) or 0.00,
                'attendance_bonus': item.get('attendance_bonus', 0.00) or 0.00,
                'bonus': item.get('bonus', 1293.00) or 1293.00,
                'leave_encashment': item.get('leave_encashment', 776.00) or 776.00,
                'gross_salary': item.get('gross_salary', 18371.00) or 18371.00,
                'transport': item.get('transport', 1500.00) or 1500.00,
                'pf_13': item.get('pf_13', 1950.00) or 1950.00,
                'esic_3_25': item.get('esic_3_25', 555.00) or 555.00,
                'uniform_shoes': item.get('uniform_shoes', 300.00) or 300.00,
                'services_7': item.get('services_7', 1482.00) or 1482.00,
                'ctc': item.get('ctc', 24158.00) or 24158.00,
            }

            try:
                emp = Employee_detail.objects.create(**emp_dict)
                created_count += 1
                if emp.balaji_emp_code:
                    existing_codes.add(str(emp.balaji_emp_code).strip().lower())
                if raw_adhar:
                    existing_adhars.add(raw_adhar)
                if raw_uan:
                    existing_uans.add(raw_uan)
                if raw_mobile:
                    existing_name_mobiles.add((name.lower(), raw_mobile))
            except Exception as e:
                # Log and skip individual errors
                skipped_count += 1

        return Response({
            "message": f"Successfully imported {created_count} employees.",
            "created": created_count,
            "skipped": skipped_count
        }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)


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
                deduction_other=item.get('deduction_other', 0),
                deduction_shows_tshirt=item.get('deduction_shows_tshirt', 0),
                deduction_rashan=item.get('deduction_rashan', 0),
                deduction_room_rent=item.get('deduction_room_rent', 0),
                deduction_light_bill=item.get('deduction_light_bill', 0),
                deduction_lpg=item.get('deduction_lpg', 0),
                total_deduction=item.get('total_deduction', 0),
                extra_deductions=item.get('extra_deductions', 0),
            ))

        AttendanceRecord.objects.bulk_create(new_objs)
        return Response({"detail": f"Successfully saved {len(new_objs)} attendance records"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post', 'delete'], url_path='delete-all')
    def delete_all(self, request):
        company_id = request.data.get('company') or request.query_params.get('company')
        attendance_date = request.data.get('attendance_date') or request.query_params.get('attendance_date')

        if not company_id or not attendance_date:
            return Response({"detail": "company and attendance_date are required"}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = AttendanceRecord.objects.filter(company_id=company_id, attendance_date=attendance_date).delete()
        return Response({"detail": f"Successfully deleted {deleted_count} attendance records", "deleted": deleted_count}, status=status.HTTP_200_OK)