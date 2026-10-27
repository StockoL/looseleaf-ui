from django.conf import settings
from django.core.checks import Warning, register

RENDERER = "django_looseleaf.renderers.LooseLeafFormRenderer"


@register()
def form_renderer_templates(app_configs, **kwargs):
    """The renderer extends TemplatesSetting, which only finds Django's own
    widget templates when django.forms is installed."""
    if getattr(settings, "FORM_RENDERER", None) != RENDERER or "django.forms" in settings.INSTALLED_APPS:
        return []
    return [
        Warning(
            "LooseLeafFormRenderer needs 'django.forms' in INSTALLED_APPS to load Django's widget templates.",
            hint="Add 'django.forms' to INSTALLED_APPS.",
            id="looseleaf.W001",
        )
    ]
