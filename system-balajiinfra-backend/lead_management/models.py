from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

# Customer
class Customer(models.Model):
    name = models.CharField(max_length=200)
    contact_number = models.CharField(max_length=20, blank=True, null=True, unique=True)
    secondary_contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    secondary_email = models.EmailField(blank=True, null=True)
    poc_name = models.CharField(max_length=200, blank=True, null=True)
    poc_contact_number = models.CharField(max_length=20, blank=True, null=True)
    land_line_no = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pin_code = models.CharField(max_length=10, blank=True, null=True)
    both_address_is_same = models.BooleanField(default=False)
    site_address = models.TextField(blank=True, null=True)
    site_city = models.CharField(max_length=100, blank=True, null=True)
    site_state = models.CharField(max_length=100, blank=True, null=True)
    site_pin_code = models.CharField(max_length=10, blank=True, null=True)
    gst = models.CharField(max_length=15, blank=True, null=True)
    pan = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.email or self.contact_number or ''})"


# Lead source
class LeadSource(models.TextChoices):
    GOOGLE_ADS = 'google_ads', 'Google Ads'
    INDIAMART = 'indiamart', 'IndiaMART'
    BNI = 'bni', 'BNI'
    JUSTDIAL = 'justdial', 'Justdial'
    REFERENCE = 'reference', 'Reference'
    ARCHITECT_INTERIOR_DESIGNER = 'architect/interior_designer', 'Architect / Interior Designer'
    BUILDER = 'builder', 'Builder'
    EXISTING_CUSTOMER = 'existing_customer', 'Existing Customer'
    KA_STAFF = 'ka_staff', 'KA Staff'
    OTHER = 'other', 'Other'


# Lead status
class LeadStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    CLOSED = 'closed', 'Closed'
    IN_PROCESS = 'in_process', 'In Process'


class ServiceType(models.TextChoices):
    SALES = "sales", "Sales"
    SERVICE = "service", "Service"
    BOTH = "both", "Both"


# Lead management
class lead_management(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='leads')
    requirements_details = models.TextField(blank=True)
    lead_type = models.CharField(max_length=200, blank=True, null=True)
    lead_source = models.CharField(max_length=200)
    is_service_lead = models.CharField(max_length=20, choices=ServiceType.choices, null=True, blank=True)
    service_type = models.JSONField(blank=True, null=True)
    lead_source_input = models.JSONField(blank=True, null=True)
    status = models.CharField(
        max_length=200,
        choices=LeadStatus.choices,
        default=LeadStatus.OPEN,
    )
    assign_to = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='lead_assignment')
    date = models.DateField(blank=True, null=True)
    enquiry_date = models.DateField(blank=True, null=True)
    followup_date = models.DateField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    project_name = models.CharField(max_length=100, blank=True, null=True)
    project_adderess = models.CharField(max_length=500, blank=True, null=True)
    creatd_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='lead_created')
    contact_person_name = models.CharField(max_length=200, blank=True, null=True)
    contact_person_number = models.CharField(max_length=20, blank=True, null=True)
    # Lead Qualifying Questions — set True by manager/admin after initial review
    is_qualified = models.BooleanField(default=False)
    # JSON: { "<faq_id>": "<answer_text>", ... }
    qualifying_answers = models.JSONField(blank=True, null=True, default=dict)

    def __str__(self):
        return f"Lead #{self.pk} - {self.customer.name or self.customer.email or self.customer.contact_number} - {self.get_status_display()}"

    def clean(self):
        if self.date and self.followup_date and self.followup_date < self.date:
            raise ValidationError({"followup_date": "followup_date cannot be before date."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ❌ REMOVED: lead_product model (no longer needed)
# ❌ REMOVED: LeadFollowUpProduct model (no longer needed)

# Lead Followup
class LeadFollowUp(models.Model):
    lead = models.ForeignKey(
        lead_management,
        on_delete=models.CASCADE,
        related_name='followups'
    )
    followup_date = models.DateField()
    next_followup_date = models.DateField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=200,
        choices=LeadStatus.choices,
        default=LeadStatus.OPEN,
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lead_followups_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Follow-up for Lead #{self.lead_id} on {self.followup_date}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        lead = self.lead
        lead.status = self.status
        lead.followup_date = self.next_followup_date or self.followup_date
        if self.remarks:
            lead.remarks = self.remarks
        lead.save(update_fields=["status", "followup_date", "remarks"])


# Lead FAQ
class LeadFAQ(models.Model):
    question = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.question


# Lead followupFAQAnswer
class LeadFollowUpFAQAnswer(models.Model):
    followup = models.ForeignKey(
        LeadFollowUp,
        on_delete=models.CASCADE,
        related_name='faq_answers'
    )
    faq = models.ForeignKey(
        LeadFAQ,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    answer = models.TextField(blank=True)

    class Meta:
        unique_together = ('followup', 'faq')

    def __str__(self):
        return f"Q: {self.faq.question} | Lead #{self.followup.lead_id}"


# ---------------------------------------------------------
# Payroll / HR Models
# ---------------------------------------------------------
class Company(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    vendor = models.CharField(max_length=255, blank=True, null=True)
    gst = models.CharField(max_length=50, blank=True, null=True)
    
    # Billing Section Fields
    pf = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    esic = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    uniform_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    admin_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    ctc = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    SALARY_TYPE_CHOICES = (
        ('daily', 'Daily'),
        ('monthly', 'Monthly'),
    )
    salary_type = models.CharField(max_length=20, choices=SALARY_TYPE_CHOICES, default='monthly')

    def __str__(self):
        return self.name

class WageSheet(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='wage_sheets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class PayrollFormula(models.Model):
    wage_sheet = models.ForeignKey(WageSheet, on_delete=models.CASCADE, related_name='formulas')
    target_field = models.CharField(max_length=100)  # e.g., 'hra', 'pf_13'
    base_field = models.CharField(max_length=100)    # e.g., 'basic'
    operator = models.CharField(max_length=10, default='*') # e.g., '*', '+', '-'
    percentage_or_value = models.DecimalField(max_digits=12, decimal_places=4) # e.g., 0.05 for 5%

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

    calculation_days = models.IntegerField(default=30, blank=True, null=True)

    basic = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cca_site_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    attendance_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    leave_encashment = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    transport = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    pf_13 = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    esic_3_25 = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    uniform_shoes = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    services_7 = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    ctc = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    per_day_ctc = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    site_allowance_paid_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    site_allowance_billing_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        super().save(*args, **kwargs)


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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company.name} - {self.emp_name} ({self.attendance_date})"