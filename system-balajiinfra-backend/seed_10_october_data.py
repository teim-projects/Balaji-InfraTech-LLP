import os
import datetime
import openpyxl
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "balajiinfra_system.settings.dev")
django.setup()

from payroll_management.models import Company, Employee_detail, AttendanceRecord

def parse_date_str(val):
    if not val:
        return None
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val if isinstance(val, datetime.date) else val.date()
    s = str(val).strip()
    for fmt in ("%d.%m.%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None

def clean_str(val):
    if val is None:
        return ""
    return str(val).strip()

def clean_num(val, default=0.0):
    if val is None or val == "":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def run():
    print("Starting seed for 10 employees and October 2026 attendance...")

    company, _ = Company.objects.get_or_create(
        id=1,
        defaults={
            "name": "Nandurbar",
            "pf": 13.0,
            "esic": 3.25,
            "lwf": 75.0,
            "uniform_charge": 300.0,
            "admin_charge": 7.0,
        }
    )

    # Clear all attendance records and employees except preserving Vedant if exists
    vedant_existing = Employee_detail.objects.filter(name__icontains="vedant").first()

    AttendanceRecord.objects.all().delete()
    Employee_detail.objects.all().delete()
    print("Cleared existing records.")

    # 1. Create / Recreate Vedant Nighot as Employee #1
    vedant = Employee_detail(
        id=1,
        balaji_emp_code="B001",
        salutation="Mr.",
        name="Vedant Nighot",
        sex="Male",
        marital_status="Not Married",
        current_address_line1="Sinhagad Road, Pune, Maharashtra",
        current_address_city="Pune",
        current_address_state="Maharashtra",
        current_address_pincode="411041",
        dob=datetime.date(2004, 6, 17),
        doj=datetime.date(2026, 10, 1),
        adhar_no="4556-6372-6334",
        pan_number="CUDPN2364R",
        bank_name="State Bank of India",
        account_no="12345678901",
        ifsc_code="SBIN0001234",
        uan_no="101234567890",
        esic_no="3123456789",
        mobile_no="9975968543",
        whatsapp_no="9975968543",
        email="vedantnighotzzz1@gmail.com",
        department="Engineering",
        designation="HR Executive",
        category="Skilled",
        company=company,
        calculation_days=27,
        basic=15239.00,
        hra=761.95,
        cca_site_allowance=0.00,
        attendance_bonus=0.00,
        bonus=1269.00,
        leave_encashment=733.00,
        gross_salary=17270.00,
        transport=1500.00,
        pf_13=1950.00,
        esic_3_25=520.03,
        uniform_shoes=300.00,
        services_7=1371.30,
        ctc=22911.33,
    )
    vedant.save()
    print("Created Employee #1: Vedant Nighot (B001)")

    # October Attendance for Vedant
    AttendanceRecord.objects.create(
        company=company,
        attendance_date="2026-10",
        sr_no=1,
        emp_code="B001",
        emp_name="Vedant Nighot",
        mandays=27.0,
        payable_mandays=27.0,
        ot=0.0,
        extra_days=0.0,
        extra_ot=0.0,
        canteen=350.0,
        pf=1800.0,
        esic=123.0,
        ptax=200.0,
        lwf=25.0,
        total_deduction=2498.0,
    )

    # 2. Load 9 other employees from Jun Wages Sheet.xlsx
    excel_path = "d:/chronoanalytics/Balaji-InfraTech-LLP/Jun Wages Sheet.xlsx"
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb["BILLING & PAY SHEET"]

    excel_rows = [9, 10, 11, 12, 13, 14, 15, 16, 17]

    for idx, r in enumerate(excel_rows, start=2):
        emp_code = clean_str(ws[r][2].value) or f"BI{idx:02d}"
        name = clean_str(ws[r][3].value)
        father_name = clean_str(ws[r][4].value)
        sex = clean_str(ws[r][5].value) or "Male"
        address = clean_str(ws[r][6].value)
        dob = parse_date_str(ws[r][7].value)
        doj = parse_date_str(ws[r][8].value) or datetime.date(2026, 10, 1)
        adhar_no = clean_str(ws[r][9].value)
        bank_name = clean_str(ws[r][10].value)
        account_no = clean_str(ws[r][11].value)
        ifsc_code = clean_str(ws[r][12].value)
        uan_no = clean_str(ws[r][13].value)
        esic_no = clean_str(ws[r][14].value)
        mobile_no = clean_str(ws[r][15].value)
        dept = clean_str(ws[r][17].value) or "Production"
        desig = clean_str(ws[r][18].value) or "ITI"
        category = clean_str(ws[r][19].value) or "SKILLED"
        calc_days = int(clean_num(ws[r][20].value, 27))
        work_days = clean_num(ws[r][21].value, 27)
        paid_days = clean_num(ws[r][24].value, 27)

        # Wages structure
        basic = clean_num(ws[r][46].value, 15525.0)
        hra = clean_num(ws[r][47].value, 776.25)
        cca = clean_num(ws[r][48].value, 0.0)
        incentive = clean_num(ws[r][49].value, 0.0)
        bonus = clean_num(ws[r][50].value, 1293.23)
        leave_enc = clean_num(ws[r][51].value, 776.25)
        transport = clean_num(ws[r][52].value, 1500.0)
        gross_salary = clean_num(ws[r][55].value, 19870.73)

        pf_13 = clean_num(ws[r][65].value, 1950.0)
        esic_3_25 = clean_num(ws[r][66].value, 530.0)
        uniform = clean_num(ws[r][68].value, 300.0)
        services_7 = clean_num(ws[r][69].value, 1486.0)
        ctc = clean_num(ws[r][70].value, 24211.73)

        # Deductions
        pf_12 = clean_num(ws[r][56].value, 1800.0)
        esic_0_75 = clean_num(ws[r][57].value, 123.0)
        ptax = clean_num(ws[r][58].value, 200.0)
        canteen = clean_num(ws[r][61].value, 405.0)
        lwf_emp = clean_num(ws[r][62].value, 25.0)
        total_ded = clean_num(ws[r][63].value, 2553.0)

        emp = Employee_detail(
            id=idx,
            balaji_emp_code=emp_code,
            salutation="Mr.",
            name=name,
            father_or_husband_name=father_name,
            sex=sex,
            marital_status="Not Married",
            current_address_line1=address,
            dob=dob,
            doj=doj,
            adhar_no=adhar_no,
            bank_name=bank_name,
            account_no=account_no,
            ifsc_code=ifsc_code,
            uan_no=uan_no,
            esic_no=esic_no,
            mobile_no=mobile_no,
            whatsapp_no=mobile_no,
            department=dept,
            designation=desig,
            category=category,
            company=company,
            calculation_days=calc_days,
            basic=basic,
            hra=hra,
            cca_site_allowance=cca,
            attendance_bonus=incentive,
            bonus=bonus,
            leave_encashment=leave_enc,
            gross_salary=gross_salary,
            transport=transport,
            pf_13=pf_13,
            esic_3_25=esic_3_25,
            uniform_shoes=uniform,
            services_7=services_7,
            ctc=ctc,
        )
        emp.save()
        print(f"Created Employee #{idx}: {name} ({emp_code})")

        # October 2026 Attendance
        AttendanceRecord.objects.create(
            company=company,
            attendance_date="2026-10",
            sr_no=idx,
            emp_code=emp_code,
            emp_name=name,
            mandays=work_days,
            payable_mandays=paid_days,
            ot=0.0,
            extra_days=0.0,
            extra_ot=0.0,
            canteen=canteen,
            pf=pf_12,
            esic=esic_0_75,
            ptax=ptax,
            lwf=lwf_emp,
            total_deduction=total_ded,
        )

    emp_count = Employee_detail.objects.count()
    att_count = AttendanceRecord.objects.count()
    print(f"Done! Total Employees: {emp_count}, Total October Attendance Records: {att_count}")

if __name__ == "__main__":
    run()
