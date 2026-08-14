import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'milk_track_backend.settings')
django.setup()

from accounts.models import User

# Create Admin User
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    admin.role = User.Role.ADMIN
    admin.save()
    print("Admin user created (admin / admin123)")

# Create Collection Worker
if not User.objects.filter(username='collector').exists():
    collector = User.objects.create_user('collector', 'collector@example.com', 'demo123')
    collector.role = User.Role.COLLECTION_WORKER
    collector.save()
    print("Collector user created (collector / demo123)")

# Create Distribution Worker
if not User.objects.filter(username='distributor').exists():
    distributor = User.objects.create_user('distributor', 'distributor@example.com', 'demo123')
    distributor.role = User.Role.DISTRIBUTION_WORKER
    distributor.save()
    print("Distributor user created (distributor / demo123)")

# Create Accountant
if not User.objects.filter(username='accountant').exists():
    accountant = User.objects.create_user('accountant', 'accountant@example.com', 'demo123')
    accountant.role = User.Role.ACCOUNTANT
    accountant.save()
    print("Accountant user created (accountant / demo123)")
