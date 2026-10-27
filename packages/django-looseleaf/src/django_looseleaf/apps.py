from django.apps import AppConfig
from django.core.signals import setting_changed


def _clear_theme_caches(setting, **kwargs):
    if setting in ("LOOSELEAF_THEME", "STATICFILES_DIRS", "STATICFILES_FINDERS", "INSTALLED_APPS"):
        from .theme import clear_caches

        clear_caches()


class LooseLeafConfig(AppConfig):
    name = "django_looseleaf"
    label = "looseleaf"
    verbose_name = "LooseLeaf UI"

    def ready(self):
        from . import checks  # noqa: F401  (registers the system checks)

        setting_changed.connect(_clear_theme_caches, dispatch_uid="looseleaf-theme-caches")
