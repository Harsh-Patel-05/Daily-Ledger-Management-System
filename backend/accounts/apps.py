from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _configure_sqlite(sender, connection, **kwargs):
    if connection.vendor != 'sqlite':
        return
    cursor = connection.cursor()
    cursor.execute('PRAGMA journal_mode=WAL;')
    cursor.execute('PRAGMA busy_timeout=20000;')
    cursor.execute('PRAGMA synchronous=NORMAL;')


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        connection_created.connect(_configure_sqlite, dispatch_uid='dlms_sqlite_pragmas')
