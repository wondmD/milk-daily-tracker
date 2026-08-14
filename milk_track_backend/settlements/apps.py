from django.apps import AppConfig


class SettlementsConfig(AppConfig):
    name = 'settlements'

    def ready(self):
        import settlements.signals
