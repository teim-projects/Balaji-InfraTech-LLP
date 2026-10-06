## Balaji InfraTech Backend Local Setup

### 1) Create/activate virtual environment
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 2) Install dependencies
```bash
pip install -r requirements.txt
```

### 3) Configure environment
Create/update `.env` in this folder.

Minimum required:
- `MYSQL_DATABASE=balaji_infra_db`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=`
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `SECRET_KEY=<your-secret-key>`

### 4) Run migrations
```bash
python manage.py migrate
```

### 5) Start backend server
```bash
python manage.py runserver 0.0.0.0:8000
```

### 6) Default Login Credentials
A superuser account is pre-configured for local testing:

- **Email**: `admin@balajiinfra.com`
- **Mobile**: `9876543210`
- **Password**: `Admin@123`
- **Role**: `admin`

*(You can log into the frontend using either the Email or Mobile Number with the above password, or use them to log into the Django Admin at `http://127.0.0.1:8000/admin/`).*

To create a new superuser manually:
```bash
python manage.py createsuperuser
```