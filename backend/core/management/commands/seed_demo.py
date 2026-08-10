from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Demo seeding is disabled. Use the app UI / API to add real data, or clear_business_data to wipe.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            'seed_demo no longer creates static/demo records.\n'
            'Add data from the app, or run:\n'
            '  python manage.py clear_business_data --all-users'
        ))
