from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


# ---------------------------------------------------------
# Balaji InfraTech Models (HR & Payroll Management)
# ---------------------------------------------------------

class Company(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    vendor = models.CharField(max_length=255, blank=True, null=True)
    gst = models.CharField(max_length=50, blank=True, null=True)
    
    # Billing Section Fields
    pf = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, default=13.00)
    esic = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, default=3.25)
    lwf = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, default=75.00)
    uniform_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, default=300.00)
    admin_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, default=7.00)
    ctc = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    SALARY_TYPE_CHOICES = (
        ('daily', 'Daily'),
        ('monthly', 'Monthly'),
    )
    salary_type = models.CharField(max_length=20, choices=SALARY_TYPE_CHOICES, default='monthly')

    class Meta:
        db_table = 'balaji_company'
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'

    def __str__(self):
        return self.name


class WageSheet(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='wage_sheets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'balaji_wagesheet'
        verbose_name = 'Wage Sheet'
        verbose_name_plural = 'Wage Sheets'

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class PayrollFormula(models.Model):
    wage_sheet = models.ForeignKey(WageSheet, on_delete=models.CASCADE, related_name='formulas')
    target_field = models.CharField(max_length=100)  # e.g., 'hra', 'pf_13'
    base_field = models.CharField(max_length=100)    # e.g., 'basic'
    operator = models.CharField(max_length=10, default='*')  # e.g., '*', '+', '-'
    percentage_or_value = models.DecimalField(max_digits=12, decimal_places=4)  # e.g., 0.05 for 5%

    class Meta:
        db_table = 'balaji_payroll_formula'
        verbose_name = 'Payroll Formula'
        verbose_name_plural = 'Payroll Formulas'

    def __str__(self):
        return f"{self.target_field} = {self.base_field} {self.operator} {self.percentage_or_value}"


class Employee_detail(models.Model):
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )

    balaji_emp_code = models.CharField(max_length=100, blank=True, null=True)
    salutation = models.CharField(max_length=20, choices=[('Mr.', 'Mr.'), ('Mrs.', 'Mrs.'), ('Miss', 'Miss'), ('Ms.', 'Ms.'), ('Dr.', 'Dr.')], default='Mr.')
    name = models.CharField(max_length=255)
    sex = models.CharField(max_length=20, choices=GENDER_CHOICES, default='Male')
    marital_status = models.CharField(max_length=20, choices=[('Married', 'Married'), ('Not Married', 'Not Married')], default='Not Married')
    current_address_line1 = models.CharField(max_length=255, blank=True, null=True)
    current_address_line2 = models.CharField(max_length=255, blank=True, null=True)
    current_address_state = models.CharField(max_length=100, blank=True, null=True)
    current_address_city = models.CharField(max_length=100, blank=True, null=True)
    current_address_pincode = models.CharField(max_length=20, blank=True, null=True)
    permanent_address_line1 = models.CharField(max_length=255, blank=True, null=True)
    permanent_address_line2 = models.CharField(max_length=255, blank=True, null=True)
    permanent_address_state = models.CharField(max_length=100, blank=True, null=True)
    permanent_address_city = models.CharField(max_length=100, blank=True, null=True)
    permanent_address_pincode = models.CharField(max_length=20, blank=True, null=True)
    is_permanent_same_as_current = models.BooleanField(default=False)
    dob = models.DateField(null=True, blank=True)
    doj = models.DateField(null=True, blank=True)

    adhar_no = models.CharField(max_length=50, blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    account_no = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=50, blank=True, null=True)
    uan_no = models.CharField(max_length=50, blank=True, null=True)
    esic_no = models.CharField(max_length=50, blank=True, null=True)
    mobile_no = models.CharField(max_length=20, blank=True, null=True)
    whatsapp_no = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    photo = models.FileField(upload_to='employee_photos/', blank=True, null=True)
    nominee_name = models.CharField(max_length=255, blank=True, null=True)
    nominee_relation = models.CharField(max_length=100, blank=True, null=True)

    father_or_husband_name = models.CharField(max_length=255, blank=True, null=True)
    qualification = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_no = models.CharField(max_length=20, blank=True, null=True)
    pan_number = models.CharField(max_length=20, blank=True, null=True)
    pan_image = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    adhar_image = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    identity_mark = models.CharField(max_length=255, blank=True, null=True)
    
    current_address_taluka = models.CharField(max_length=100, blank=True, null=True)
    permanent_address_taluka = models.CharField(max_length=100, blank=True, null=True)
    permanent_address_mobile_no = models.CharField(max_length=20, blank=True, null=True)

    bank_holder_name = models.CharField(max_length=255, blank=True, null=True)

    reference_1_name_address = models.TextField(blank=True, null=True)
    reference_1_mobile = models.CharField(max_length=20, blank=True, null=True)
    reference_2_name_address = models.TextField(blank=True, null=True)
    reference_2_mobile = models.CharField(max_length=20, blank=True, null=True)

    signature_image = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    education_certificate = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    experience_certificate = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    remark = models.TextField(blank=True, null=True)

    department = models.CharField(max_length=100, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)

    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    wage_sheet = models.ForeignKey(WageSheet, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')

    calculation_days = models.IntegerField(default=27, blank=True, null=True)

    basic = models.DecimalField(max_digits=12, decimal_places=2, default=15525.00)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=776.25)
    cca_site_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    attendance_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=1293.00)
    leave_encashment = models.DecimalField(max_digits=12, decimal_places=2, default=776.00)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=18371.00)
    transport = models.DecimalField(max_digits=12, decimal_places=2, default=1500.00)
    pf_13 = models.DecimalField(max_digits=12, decimal_places=2, default=1950.00)
    esic_3_25 = models.DecimalField(max_digits=12, decimal_places=2, default=555.00)
    uniform_shoes = models.DecimalField(max_digits=12, decimal_places=2, default=300.00)
    services_7 = models.DecimalField(max_digits=12, decimal_places=2, default=1482.00)
    ctc = models.DecimalField(max_digits=12, decimal_places=2, default=24158.00)
    per_day_ctc = models.DecimalField(max_digits=12, decimal_places=2, default=894.74)
    site_allowance_paid_rate = models.DecimalField(max_digits=12, decimal_places=2, default=75.47)
    site_allowance_billing_rate = models.DecimalField(max_digits=12, decimal_places=2, default=83.38)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'balaji_employee'
        verbose_name = 'Employee Detail'
        verbose_name_plural = 'Employee Details'

    def __str__(self):
        return f"{self.balaji_emp_code or ''} - {self.name}".strip()

    def generate_emp_code(self):
        import re
        all_codes = Employee_detail.objects.values_list('balaji_emp_code', flat=True)
        nums = []
        for code in all_codes:
            if code:
                m = re.search(r'B?(\d+)', str(code), re.IGNORECASE)
                if m:
                    try:
                        nums.append(int(m.group(1)))
                    except ValueError:
                        pass
        next_num = max(nums) + 1 if nums else 1
        return f"B{next_num:03d}"

    def save(self, *args, **kwargs):
        if not self.balaji_emp_code or not str(self.balaji_emp_code).strip():
            self.balaji_emp_code = self.generate_emp_code()

        if self.pan_number:
            self.pan_number = str(self.pan_number).strip().upper()

        # If basic is 0 or missing, default to 15525.00
        if not self.basic or float(self.basic) <= 0:
            self.basic = 15525.00

        basic_f = float(self.basic)
        if not self.hra or float(self.hra) <= 0:
            self.hra = round(basic_f * 0.05, 2)
        if not self.bonus or float(self.bonus) <= 0:
            self.bonus = round(basic_f * 0.0833, 2)
        if not self.leave_encashment or float(self.leave_encashment) <= 0:
            self.leave_encashment = round(basic_f * 0.05, 2)

        cca_f = float(self.cca_site_allowance or 0)
        att_f = float(self.attendance_bonus or 0)
        calculated_gross = round(basic_f + float(self.hra) + cca_f + att_f + float(self.bonus) + float(self.leave_encashment), 2)
        if not self.gross_salary or float(self.gross_salary) <= 1.2:
            self.gross_salary = calculated_gross

        if not self.transport or float(self.transport) <= 0:
            self.transport = 1500.00
        if not self.pf_13 or float(self.pf_13) <= 0:
            self.pf_13 = round(15000.0 * 0.13 if basic_f > 15000 else basic_f * 0.13, 2)
        if not self.esic_3_25 or float(self.esic_3_25) <= 0:
            self.esic_3_25 = round((float(self.gross_salary) - float(self.bonus)) * 0.0325, 2)
        if not self.uniform_shoes or float(self.uniform_shoes) <= 0:
            self.uniform_shoes = 300.00
        if not self.services_7 or float(self.services_7) <= 0:
            self.services_7 = round((float(self.gross_salary) + float(self.transport) + float(self.esic_3_25) + float(self.uniform_shoes)) * 0.07, 2)
        if not self.ctc or float(self.ctc) <= 0:
            self.ctc = round(float(self.gross_salary) + float(self.transport) + float(self.pf_13) + float(self.esic_3_25) + float(self.uniform_shoes) + float(self.services_7), 2)

        days = int(self.calculation_days or 27)
        if (not self.per_day_ctc or float(self.per_day_ctc) <= 0) and days > 0:
            self.per_day_ctc = round(float(self.ctc) / days, 2)
        if (not self.site_allowance_paid_rate or float(self.site_allowance_paid_rate) <= 0) and days > 0:
            self.site_allowance_paid_rate = round((basic_f + float(self.hra) + cca_f) / days / 8.0, 2)
        if not self.site_allowance_billing_rate or float(self.site_allowance_billing_rate) <= 0:
            self.site_allowance_billing_rate = round(float(self.site_allowance_paid_rate) * 1.0325 * 1.07, 2)

        super().save(*args, **kwargs)

# Model alias
Employee = Employee_detail


class AttendanceRecord(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='attendance_records')
    attendance_date = models.CharField(max_length=20)
    sr_no = models.IntegerField(default=1)
    emp_code = models.CharField(max_length=100, blank=True, null=True)
    emp_name = models.CharField(max_length=255, blank=True, null=True)
    mandays = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ot = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    extra_days = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    extra_ot = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payable_mandays = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payable_ot = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    remark = models.TextField(blank=True, null=True)

    deduction_other = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    deduction_shows_tshirt = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    deduction_rashan = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    deduction_room_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    deduction_light_bill = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    deduction_lpg = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    extra_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    pf = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    esic = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ptax = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    canteen = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    lwf = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'balaji_attendance_record'
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'

    def __str__(self):
        return f"{self.company.name} - {self.emp_name} ({self.attendance_date})"