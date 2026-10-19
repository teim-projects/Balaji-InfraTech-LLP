from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
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
    permission_classes = [IsAuthenticatedOrReadOnly]
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

        created_count = 0
        updated_count = 0
        skipped_count = 0

        # Helper to parse dates with multiple formats and excel serials
        def parse_date(val):
            if not val:
                return None
            from datetime import datetime, date, timedelta
            if isinstance(val, (datetime, date)):
                return val if isinstance(val, date) else val.date()
            if isinstance(val, (int, float)):
                try:
                    return (date(1899, 12, 30) + timedelta(days=int(val)))
                except Exception:
                    pass
            s = str(val).strip()
            if not s:
                return None
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%m/%d/%Y', '%d.%m.%Y', '%Y.%m.%d'):
                try:
                    return datetime.strptime(s, fmt).date()
                except ValueError:
                    pass
            import re
            m = re.match(r'^(\d{1,2})[\.\/\-]?(\d{2})(\d{4})$', s)
            if m:
                try:
                    return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
                except ValueError:
                    pass
            return None

        for item in employees_data:
            name = str(item.get('name', '')).strip()
            if not name:
                continue

            emp_code = str(item.get('balaji_emp_code', '')).strip() or None

            # Resolve Company
            company_obj = None
            comp_val = item.get('company')
            if comp_val:
                if isinstance(comp_val, int):
                    company_obj = Company.objects.filter(id=comp_val).first()
                elif str(comp_val).isdigit():
                    company_obj = Company.objects.filter(id=int(comp_val)).first()
                else:
                    comp_name = str(comp_val).strip()
                    company_obj = companies_map.get(comp_name.lower())
                    if not company_obj:
                        company_obj = Company.objects.create(name=comp_name)
                        companies_map[comp_name.lower()] = company_obj

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
                'emergency_contact_no': item.get('emergency_contact_no') or None,
                'nominee_name': item.get('nominee_name') or None,
                'email': item.get('email') or None,
                'bank_name': item.get('bank_name') or None,
                'bank_holder_name': item.get('bank_holder_name') or None,
                'account_no': item.get('account_no') or None,
                'ifsc_code': item.get('ifsc_code') or None,
                'department': item.get('department') or None,
                'designation': item.get('designation') or None,
                'category': item.get('category') or None,
                'father_or_husband_name': item.get('father_or_husband_name') or None,
                'qualification': item.get('qualification') or None,
                'remark': item.get('remark') or None,
                'is_permanent_same_as_current': bool(item.get('is_permanent_same_as_current', False)),
                'current_address_line1': item.get('current_address_line1') or None,
                'current_address_line2': item.get('current_address_line2') or None,
                'current_address_city': item.get('current_address_city') or None,
                'current_address_state': item.get('current_address_state') or None,
                'current_address_pincode': item.get('current_address_pincode') or None,
                'permanent_address_line1': item.get('permanent_address_line1') or None,
                'permanent_address_line2': item.get('permanent_address_line2') or None,
                'permanent_address_city': item.get('permanent_address_city') or None,
                'permanent_address_state': item.get('permanent_address_state') or None,
                'permanent_address_pincode': item.get('permanent_address_pincode') or None,
                'calculation_days': item.get('calculation_days', 27) or 27,
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
                'per_day_ctc': item.get('per_day_ctc', 894.74) or 894.74,
                'site_allowance_paid_rate': item.get('site_allowance_paid_rate', 75.47) or 75.47,
                'site_allowance_billing_rate': item.get('site_allowance_billing_rate', 83.38) or 83.38,
            }

            try:
                existing_emp = None
                if emp_code:
                    existing_emp = Employee_detail.objects.filter(balaji_emp_code__iexact=emp_code).first()

                if existing_emp:
                    for field, val in emp_dict.items():
                        if val is not None and val != "":
                            setattr(existing_emp, field, val)
                    existing_emp.save()
                    updated_count += 1
                else:
                    Employee_detail.objects.create(**emp_dict)
                    created_count += 1
            except Exception as e:
                # Log and skip individual errors
                skipped_count += 1

        total_processed = created_count + updated_count
        return Response({
            "message": f"Successfully processed {total_processed} employees ({created_count} new, {updated_count} updated).",
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "total": total_processed,
        }, status=status.HTTP_201_CREATED if total_processed > 0 else status.HTTP_200_OK)

    @action(detail=False, methods=['post', 'delete'], url_path='delete-all')
    def delete_all(self, request):
        company_id = request.data.get('company') or request.query_params.get('company')
        if company_id:
            qs = Employee_detail.objects.filter(company_id=company_id)
            AttendanceRecord.objects.filter(company_id=company_id).delete()
        else:
            qs = Employee_detail.objects.all()
            AttendanceRecord.objects.all().delete()

        deleted_count = qs.count()
        qs.delete()
        return Response({
            "detail": f"Successfully deleted all {deleted_count} employee records and attendance records.",
            "deleted": deleted_count
        }, status=status.HTTP_200_OK)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by('-id')
    serializer_class = CompanySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def _format_month_name(self, date_str):
        if not date_str:
            return "August-Sept"
        try:
            import datetime
            parts = str(date_str).strip().split('-')
            if len(parts) >= 2:
                year = int(parts[0])
                month = int(parts[1])
                cur_date = datetime.date(year, month, 15)
                prev_month = month - 1 if month > 1 else 12
                prev_year = year if month > 1 else year - 1
                prev_date = datetime.date(prev_year, prev_month, 15)

                m1 = prev_date.strftime('%B')
                m2_short = "Sept" if cur_date.month == 9 else cur_date.strftime('%b')
                return f"{m1}-{m2_short}"
        except Exception:
            pass
        return str(date_str)

    def _get_company_workers_data(self, company, month=None):
        from django.db.models import Q

        # 1. Fetch attendance records for this company (optionally filtered by month)
        att_qs = AttendanceRecord.objects.filter(company=company)
        if month:
            att_qs = att_qs.filter(attendance_date=month)
        att_qs = att_qs.order_by('attendance_date', 'sr_no')

        att_map = {}
        for att in att_qs:
            code = (att.emp_code or "").strip()
            name = (att.emp_name or "").strip()
            key = code.upper() if code else name.upper()
            if not key:
                continue
            if key not in att_map:
                att_map[key] = {
                    'code': code,
                    'name': name,
                    'mandays': 0.0,
                    'ot': 0.0,
                    'dates': set(),
                }
            att_map[key]['mandays'] += float(att.mandays or 0)
            att_map[key]['ot'] += float(att.ot or 0)
            if att.attendance_date:
                att_map[key]['dates'].add(str(att.attendance_date))

        # 2. Fetch matching Employee_detail records
        att_codes = [v['code'] for v in att_map.values() if v['code']]
        att_names = [v['name'] for v in att_map.values() if v['name']]

        q_filter = Q(company=company)
        if att_codes:
            q_filter |= Q(balaji_emp_code__in=att_codes)
        if att_names:
            q_filter |= Q(name__in=att_names)

        emp_details_qs = Employee_detail.objects.filter(q_filter).distinct()

        processed_keys = set()
        workers = []

        for emp in emp_details_qs:
            c_code = (emp.balaji_emp_code or "").strip().upper()
            c_name = (emp.name or "").strip().upper()
            if c_code:
                processed_keys.add(c_code)
            if c_name:
                processed_keys.add(c_name)

            att_info = att_map.get(c_code) or att_map.get(c_name) or {}

            # If month is specified and worker has 0 attendance in that month and not directly in company, skip
            if month and not att_info and emp.company_id != company.id:
                continue

            name_parts = (emp.name or "").strip().split()
            first_name = name_parts[0] if len(name_parts) > 0 else ""
            middle_name = name_parts[1] if len(name_parts) > 2 else (emp.father_or_husband_name or "")
            last_name = name_parts[-1] if len(name_parts) > 1 else ""

            workers.append({
                'id': emp.id,
                'emp_code': emp.balaji_emp_code or "",
                'salutation': emp.salutation or "Mr.",
                'name': emp.name,
                'first_name': first_name,
                'middle_name': middle_name,
                'last_name': last_name,
                'gender': f"1 {emp.sex}" if emp.sex in ['Male', 'Female'] else (emp.sex or "1 Male"),
                'dob': emp.dob.strftime('%d.%m.%Y') if emp.dob else "",
                'doj': emp.doj.strftime('%d.%m.%Y') if emp.doj else "",
                'job_location': "5 RBU Dhule" if "dhule" in (company.name or "").lower() else (company.name or "Nandurbar"),
                'department': emp.department or "Production",
                'designation': emp.designation or "Worker",
                'grade': "1 L1",
                'category': (emp.category or "SKILLED").upper(),
                'employee_type': "9 Contactor Workers",
                'working_hr': "12HR",
                'holiday_group': "4 Dhule",
                'week_off': "4 Sunday",
                'shift': "11 G Shift (Dhule)",
                'pf_number': emp.uan_no or "",
                'uan_no': emp.uan_no or "",
                'esic_no': emp.esic_no or "",
                'pan_number': emp.pan_number or "",
                'adhar_no': (emp.adhar_no or "").replace("-", "").replace(" ", ""),
                'mobile_no': emp.mobile_no or emp.whatsapp_no or "",
                'marital_status': (emp.marital_status or "MARRIED").upper(),
                'emergency_contact_person': emp.father_or_husband_name or emp.nominee_name or "",
                'emergency_contact_no': emp.emergency_contact_no or emp.mobile_no or "",
                'current_address_line1': emp.current_address_line1 or "",
                'current_address_line2': emp.current_address_line2 or "",
                'current_address_state': emp.current_address_state or "MH",
                'current_address_city': emp.current_address_city or company.name or "Nandurbar",
                'current_address_pincode': emp.current_address_pincode or "",
                'permanent_address_line1': emp.permanent_address_line1 or emp.current_address_line1 or "",
                'permanent_address_line2': emp.permanent_address_line2 or emp.current_address_line2 or "",
                'permanent_address_state': emp.permanent_address_state or emp.current_address_state or "MH",
                'permanent_address_city': emp.permanent_address_city or emp.current_address_city or company.name or "Nandurbar",
                'permanent_address_pincode': emp.permanent_address_pincode or emp.current_address_pincode or "",
                'bank_name': emp.bank_name or "",
                'account_no': emp.account_no or "",
                'ifsc_code': emp.ifsc_code or "",
                'bank_holder_name': emp.bank_holder_name or emp.name or "",
                'total_mandays': att_info.get('mandays', 0.0),
                'total_ot': att_info.get('ot', 0.0),
                'attendance_dates': sorted(list(att_info.get('dates', []))),
            })

        # Add workers from attendance not yet in employee details
        for key, att_info in att_map.items():
            if key in processed_keys:
                continue
            name_parts = (att_info['name'] or "").strip().split()
            first_name = name_parts[0] if len(name_parts) > 0 else ""
            middle_name = name_parts[1] if len(name_parts) > 2 else ""
            last_name = name_parts[-1] if len(name_parts) > 1 else ""

            workers.append({
                'id': None,
                'emp_code': att_info['code'] or "",
                'salutation': "Mr.",
                'name': att_info['name'],
                'first_name': first_name,
                'middle_name': middle_name,
                'last_name': last_name,
                'gender': "1 Male",
                'dob': "",
                'doj': "",
                'job_location': company.name or "Nandurbar",
                'department': "Production",
                'designation': "Worker",
                'grade': "1 L1",
                'category': "SKILLED",
                'employee_type': "9 Contactor Workers",
                'working_hr': "12HR",
                'holiday_group': "4 Dhule",
                'week_off': "4 Sunday",
                'shift': "11 G Shift (Dhule)",
                'pf_number': "",
                'uan_no': "",
                'esic_no': "",
                'pan_number': "",
                'adhar_no': "",
                'mobile_no': "",
                'marital_status': "MARRIED",
                'emergency_contact_person': "",
                'emergency_contact_no': "",
                'current_address_line1': "",
                'current_address_line2': "",
                'current_address_state': "MH",
                'current_address_city': company.name or "Nandurbar",
                'current_address_pincode': "",
                'permanent_address_line1': "",
                'permanent_address_line2': "",
                'permanent_address_state': "MH",
                'permanent_address_city': company.name or "Nandurbar",
                'permanent_address_pincode': "",
                'bank_name': "",
                'account_no': "",
                'ifsc_code': "",
                'bank_holder_name': att_info['name'] or "",
                'total_mandays': att_info.get('mandays', 0.0),
                'total_ot': att_info.get('ot', 0.0),
                'attendance_dates': sorted(list(att_info.get('dates', []))),
            })

        return workers

    @action(detail=True, methods=['get'], url_path='monthly-history')
    def get_company_monthly_history(self, request, pk=None):
        company = self.get_object()
        dates = list(AttendanceRecord.objects.filter(company=company)
                     .values_list('attendance_date', flat=True)
                     .distinct()
                     .order_by('-attendance_date'))

        if not dates:
            import datetime
            dates = [datetime.datetime.now().strftime('%Y-%m')]

        history_items = []
        for d in dates:
            month_name = self._format_month_name(d)
            worker_count = AttendanceRecord.objects.filter(company=company, attendance_date=d).values('emp_code', 'emp_name').distinct().count()
            if worker_count == 0:
                worker_count = Employee_detail.objects.filter(company=company).count()

            history_items.append({
                "period": d,
                "name": month_name,
                "display_name": month_name,
                "company_name": company.name,
                "worker_count": worker_count,
                "status": "Ready",
            })

        return Response({
            "company": CompanySerializer(company).data,
            "history": history_items
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='workers')
    def get_company_workers(self, request, pk=None):
        company = self.get_object()
        month = request.query_params.get('month')
        workers = self._get_company_workers_data(company, month=month)
        month_name = self._format_month_name(month) if month else "All"
        return Response({
            "company": CompanySerializer(company).data,
            "month": month,
            "month_name": month_name,
            "total_workers": len(workers),
            "workers": workers
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='export-master-rbu')
    def export_master_rbu(self, request, pk=None):
        import openpyxl, io, os
        from django.http import HttpResponse
        from django.conf import settings

        company = self.get_object()
        month = request.query_params.get('month')
        workers = self._get_company_workers_data(company, month=month)
        month_name = self._format_month_name(month) if month else "Master"

        # Candidates for Master RBU template
        candidates = [
            os.path.join(settings.BASE_DIR, '..', '11JUN 2026 NEW MASTER RBU (1) (1).xlsm'),
            os.path.join(settings.BASE_DIR, '..', 'system-balajiinfra-frontend', 'public', 'templates', 'MASTER_RBU_Template.xlsm'),
            os.path.join(os.path.dirname(settings.BASE_DIR), '11JUN 2026 NEW MASTER RBU (1) (1).xlsm'),
            r'd:\chronoanalytics\Balaji-InfraTech-LLP\11JUN 2026 NEW MASTER RBU (1) (1).xlsm',
        ]
        template_path = None
        for p in candidates:
            if os.path.exists(p):
                template_path = os.path.abspath(p)
                break

        if not template_path:
            return Response({"error": "Master RBU Template file not found on server"}, status=status.HTTP_404_NOT_FOUND)

        wb = openpyxl.load_workbook(template_path, keep_vba=True)
        sheet = wb['Details']

        # Clear existing rows 6+
        max_r = sheet.max_row
        if max_r >= 6:
            sheet.delete_rows(6, max_r - 5)

        for idx, w in enumerate(workers, start=1):
            row_idx = 5 + idx
            row_vals = [
                idx,
                w.get('emp_code') or f"EMP{idx:03d}",
                w.get('salutation') or "Mr.",
                w.get('first_name') or w.get('name') or "",
                w.get('middle_name') or "",
                w.get('last_name') or "",
                w.get('gender') or "1 Male",
                "",
                w.get('dob') or "",
                w.get('doj') or "",
                w.get('job_location') or (company.name or "Nandurbar"),
                w.get('department') or "Production",
                w.get('designation') or "Worker",
                w.get('grade') or "1 L1",
                w.get('category') or "SKILLED",
                w.get('employee_type') or "9 Contactor Workers",
                w.get('working_hr') or "12HR",
                w.get('holiday_group') or "4 Dhule",
                w.get('week_off') or "4 Sunday",
                w.get('shift') or "11 G Shift (Dhule)",
                w.get('pf_number') or "",
                w.get('uan_no') or "",
                w.get('esic_no') or "",
                w.get('pan_number') or "",
                "",
                w.get('adhar_no') or "",
                w.get('mobile_no') or "",
                w.get('marital_status') or "MARRIED",
                "",
                w.get('emergency_contact_person') or "",
                w.get('emergency_contact_no') or "",
                "",
                w.get('current_address_line1') or "",
                w.get('current_address_line2') or "",
                w.get('current_address_state') or "MH",
                w.get('current_address_city') or company.name or "Nandurbar",
                w.get('current_address_pincode') or "",
                w.get('permanent_address_line1') or "",
                w.get('permanent_address_line2') or "",
                w.get('permanent_address_state') or "MH",
                w.get('permanent_address_city') or company.name or "Nandurbar",
                w.get('permanent_address_pincode') or "",
                w.get('bank_name') or "",
                w.get('account_no') or "",
                w.get('ifsc_code') or "",
                w.get('bank_holder_name') or w.get('name') or "",
            ]
            for col_idx, val in enumerate(row_vals, start=1):
                sheet.cell(row=row_idx, column=col_idx, value=val)

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        clean_cname = (company.name or "Company").strip().replace(" ", "_")
        filename = f"{clean_cname}_{month_name}_MASTER_RBU.xlsm"

        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.ms-excel.sheet.macroEnabled.12"
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response


class WageSheetViewSet(viewsets.ModelViewSet):
    queryset = WageSheet.objects.all().order_by('-id')
    serializer_class = WageSheetSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]
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
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["company"]
    search_fields = ["emp_code", "emp_name"]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        att_date = self.request.query_params.get("attendance_date")
        if att_date:
            qs = qs.filter(attendance_date__startswith=att_date)
        return qs

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
            try:
                mandays = float(item.get('mandays', 0) or 0)
            except (ValueError, TypeError):
                mandays = 0.0
            try:
                ot = float(item.get('ot', 0) or 0)
            except (ValueError, TypeError):
                ot = 0.0

            calc_extra_days = round(mandays - 26, 2) if mandays > 26 else 0.0
            calc_extra_ot = round(calc_extra_days * 8, 2)
            calc_payable_mandays = round(max(0.0, mandays - calc_extra_days), 2)
            calc_payable_ot = round(ot + calc_extra_ot, 2)

            raw_extra_days = item.get('extra_days')
            raw_extra_ot = item.get('extra_ot')
            raw_payable_mandays = item.get('payable_mandays')
            raw_payable_ot = item.get('payable_ot')

            try:
                extra_days = float(raw_extra_days) if raw_extra_days is not None and str(raw_extra_days).strip() != "" else calc_extra_days
            except (ValueError, TypeError):
                extra_days = calc_extra_days
            if mandays > 26 and extra_days == 0:
                extra_days = calc_extra_days

            try:
                extra_ot = float(raw_extra_ot) if raw_extra_ot is not None and str(raw_extra_ot).strip() != "" else calc_extra_ot
            except (ValueError, TypeError):
                extra_ot = calc_extra_ot
            if extra_days > 0 and extra_ot == 0:
                extra_ot = round(extra_days * 8, 2)

            try:
                payable_mandays = float(raw_payable_mandays) if raw_payable_mandays is not None and str(raw_payable_mandays).strip() != "" else calc_payable_mandays
            except (ValueError, TypeError):
                payable_mandays = calc_payable_mandays
            if mandays > 26 and payable_mandays > 26:
                payable_mandays = calc_payable_mandays

            try:
                payable_ot = float(raw_payable_ot) if raw_payable_ot is not None and str(raw_payable_ot).strip() != "" else calc_payable_ot
            except (ValueError, TypeError):
                payable_ot = calc_payable_ot
            if payable_ot < ot + extra_ot:
                payable_ot = round(ot + extra_ot, 2)

            new_objs.append(AttendanceRecord(
                company_id=company_id,
                attendance_date=attendance_date,
                sr_no=item.get('sr_no', index),
                emp_code=item.get('emp_code', ''),
                emp_name=item.get('emp_name', ''),
                mandays=mandays,
                ot=ot,
                extra_days=extra_days,
                extra_ot=extra_ot,
                payable_mandays=payable_mandays,
                payable_ot=payable_ot,
                remark=item.get('remark', ''),
                deduction_other=item.get('deduction_other', 0),
                deduction_shows_tshirt=item.get('deduction_shows_tshirt', 0),
                deduction_rashan=item.get('deduction_rashan', 0),
                deduction_room_rent=item.get('deduction_room_rent', 0),
                deduction_light_bill=item.get('deduction_light_bill', 0),
                deduction_lpg=item.get('deduction_lpg', 0),
                total_deduction=item.get('total_deduction', 0),
                extra_deductions=item.get('extra_deductions', 0),
                pf=item.get('pf', 0),
                esic=item.get('esic', 0),
                ptax=item.get('ptax', 0),
                canteen=item.get('canteen', 0),
                lwf=item.get('lwf', 0),
            ))

        AttendanceRecord.objects.bulk_create(new_objs)
        return Response({"detail": f"Successfully saved {len(new_objs)} attendance records"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post', 'delete'], url_path='delete-all')
    def delete_all(self, request):
        company_id = request.data.get('company') or request.query_params.get('company')
        attendance_date = request.data.get('attendance_date') or request.query_params.get('attendance_date')

        qs = AttendanceRecord.objects.all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        if attendance_date:
            qs = qs.filter(attendance_date=attendance_date)

        deleted_count, _ = qs.delete()
        return Response({"detail": f"Successfully deleted {deleted_count} attendance records", "deleted": deleted_count}, status=status.HTTP_200_OK)