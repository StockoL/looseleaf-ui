from django.apps import AppConfig


class LooseLeafConfig(AppConfig):
    name = "django_looseleaf"
    label = "looseleaf"
    verbose_name = "LooseLeaf UI"

    def ready(self):
        from . import checks  # noqa: F401  (registers the system checks)
