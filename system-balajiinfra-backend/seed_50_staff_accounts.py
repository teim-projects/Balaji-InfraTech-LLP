import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "balajiinfra_system.settings.dev")
django.setup()

from api.models import CustomUser, Role

def seed_staff():
    roles_data = [
        "Admin",
        "Project Manager",
        "Site Engineer",
        "Quality Engineer",
        "Safety Officer",
        "HR Manager",
        "Senior Accountant",
        "Billing Engineer",
        "Procurement Specialist",
        "Plant Supervisor",
        "Surveyor",
        "Electrical Engineer",
        "Civil Supervisor",
        "Accounts Executive",
        "Operations Coordinator",
    ]

    role_objs = {}
    for r_name in roles_data:
        obj, _ = Role.objects.get_or_create(name=r_name)
        role_objs[r_name] = obj

    staff_profiles = [
        ("Rajesh", "Sharma", "rajesh.sharma@balajiinfra.in", "9820123401", "Project Manager"),
        ("Suresh", "Patil", "suresh.patil@balajiinfra.in", "9820123402", "Senior Accountant"),
        ("Amit", "Verma", "amit.verma@balajiinfra.in", "9820123403", "Site Engineer"),
        ("Pooja", "Kulkarni", "pooja.k@balajiinfra.in", "9820123404", "HR Manager"),
        ("Vikas", "Deshmukh", "vikas.d@balajiinfra.in", "9820123405", "Quality Engineer"),
        ("Neha", "Joshi", "neha.joshi@balajiinfra.in", "9820123406", "Accounts Executive"),
        ("Manoj", "Chavan", "manoj.c@balajiinfra.in", "9820123407", "Safety Officer"),
        ("Sunita", "Pawar", "sunita.pawar@balajiinfra.in", "9820123408", "Billing Engineer"),
        ("Anil", "Gaikwad", "anil.g@balajiinfra.in", "9820123409", "Plant Supervisor"),
        ("Deepak", "Rathod", "deepak.r@balajiinfra.in", "9820123410", "Surveyor"),
        ("Pravin", "Shinde", "pravin.shinde@balajiinfra.in", "9820123411", "Electrical Engineer"),
        ("Sachin", "Jadhav", "sachin.jadhav@balajiinfra.in", "9820123412", "Civil Supervisor"),
        ("Kavita", "More", "kavita.more@balajiinfra.in", "9820123413", "Operations Coordinator"),
        ("Ganesh", "Bhosale", "ganesh.b@balajiinfra.in", "9820123414", "Procurement Specialist"),
        ("Sunil", "Sawant", "sunil.sawant@balajiinfra.in", "9820123415", "Site Engineer"),
        ("Anita", "Kale", "anita.kale@balajiinfra.in", "9820123416", "Accounts Executive"),
        ("Ramesh", "Kadam", "ramesh.k@balajiinfra.in", "9820123417", "Civil Supervisor"),
        ("Dinesh", "Gawande", "dinesh.g@balajiinfra.in", "9820123418", "Plant Supervisor"),
        ("Smita", "Thorat", "smita.thorat@balajiinfra.in", "9820123419", "Billing Engineer"),
        ("Nitin", "Salunke", "nitin.s@balajiinfra.in", "9820123420", "Safety Officer"),
        ("Mahesh", "Mane", "mahesh.mane@balajiinfra.in", "9820123421", "Project Manager"),
        ("Priyanka", "Surve", "priyanka.s@balajiinfra.in", "9820123422", "Quality Engineer"),
        ("Chetan", "Babar", "chetan.babar@balajiinfra.in", "9820123423", "Surveyor"),
        ("Rohit", "Wagh", "rohit.wagh@balajiinfra.in", "9820123424", "Site Engineer"),
        ("Ashwini", "Mohite", "ashwini.m@balajiinfra.in", "9820123425", "HR Manager"),
        ("Vishal", "Shelke", "vishal.shelke@balajiinfra.in", "9820123426", "Electrical Engineer"),
        ("Santosh", "Tambe", "santosh.t@balajiinfra.in", "9820123427", "Operations Coordinator"),
        ("Jyoti", "Dhole", "jyoti.dhole@balajiinfra.in", "9820123428", "Accounts Executive"),
        ("Ajay", "Kshirsagar", "ajay.k@balajiinfra.in", "9820123429", "Civil Supervisor"),
        ("Sanjay", "Sutar", "sanjay.sutar@balajiinfra.in", "9820123430", "Plant Supervisor"),
        ("Rahul", "Lohar", "rahul.lohar@balajiinfra.in", "9820123431", "Procurement Specialist"),
        ("Swati", "Kumbhar", "swati.k@balajiinfra.in", "9820123432", "Senior Accountant"),
        ("Yogesh", "Sonar", "yogesh.sonar@balajiinfra.in", "9820123433", "Safety Officer"),
        ("Pradeep", "Gurav", "pradeep.g@balajiinfra.in", "9820123434", "Site Engineer"),
        ("Shital", "Bhandari", "shital.b@balajiinfra.in", "9820123435", "Billing Engineer"),
        ("Sandip", "Koli", "sandip.koli@balajiinfra.in", "9820123436", "Quality Engineer"),
        ("Archana", "Gholap", "archana.g@balajiinfra.in", "9820123437", "Civil Supervisor"),
        ("Balu", "Mali", "balu.mali@balajiinfra.in", "9820123438", "Plant Supervisor"),
        ("Kiran", "Dhangar", "kiran.d@balajiinfra.in", "9820123439", "Surveyor"),
        ("Rupali", "Teli", "rupali.teli@balajiinfra.in", "9820123440", "Accounts Executive"),
        ("Bharat", "Nhavi", "bharat.nhavi@balajiinfra.in", "9820123441", "Electrical Engineer"),
        ("Tushar", "Koshti", "tushar.k@balajiinfra.in", "9820123442", "Site Engineer"),
        ("Manjusha", "Shimpi", "manjusha.s@balajiinfra.in", "9820123443", "Operations Coordinator"),
        ("Datta", "Vanjari", "datta.v@balajiinfra.in", "9820123444", "Civil Supervisor"),
        ("Pallavi", "Gosavi", "pallavi.g@balajiinfra.in", "9820123445", "HR Manager"),
        ("Arun", "Bhadange", "arun.b@balajiinfra.in", "9820123446", "Procurement Specialist"),
        ("Monika", "Jadhavar", "monika.j@balajiinfra.in", "9820123447", "Quality Engineer"),
        ("Govind", "Pardeshi", "govind.p@balajiinfra.in", "9820123448", "Senior Accountant"),
        ("Madhuri", "Chaudhari", "madhuri.c@balajiinfra.in", "9820123449", "Billing Engineer"),
        ("Vijay", "Girme", "vijay.girme@balajiinfra.in", "9820123450", "Project Manager"),
    ]

    # Delete existing non-superuser staff to refresh
    CustomUser.objects.filter(is_superuser=False).delete()
    print("Cleaned existing regular staff.")

    default_hash = "pbkdf2_sha256$1000000$do0x7RmUo3BUL7foOxFg2D$RveVrg3xbKo53XROuFtnr5inCMVi9glHc3DCaafRqSg="

    users_to_create = []
    for first_name, last_name, email, mobile_no, role_name in staff_profiles:
        role_obj = role_objs.get(role_name)
        user = CustomUser(
            first_name=first_name,
            last_name=last_name,
            email=email,
            mobile_no=mobile_no,
            role=role_obj,
            is_staff=True,
            is_active=True,
            password=default_hash,
        )
        users_to_create.append(user)

    CustomUser.objects.bulk_create(users_to_create)
    print(f"Successfully bulk created {len(users_to_create)} staff accounts!")

if __name__ == "__main__":
    seed_staff()
