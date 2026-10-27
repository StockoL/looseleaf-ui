import json
from pathlib import Path

from django.conf import settings
from django.core.checks import Error, Warning, register

from . import __version__, theme
from .conf import theme_prefix

RENDERER = "django_looseleaf.renderers.LooseLeafFormRenderer"
REEXPORT = "Re-export the theme bundle from the LooseLeaf configurator."


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


def _major(version):
    return str(version).split(".", 1)[0]


@register()
def project_theme(app_configs, **kwargs):
    """LOOSELEAF_THEME must point at a findable theme bundle exported for this major version."""
    if not theme_prefix():
        return []
    theme.clear_caches()  # check against the files as they are now

    css = theme.static_path(theme.STYLESHEET)
    if not theme.find(theme.STYLESHEET):
        return [
            Error(
                f"LOOSELEAF_THEME is set, but the static file '{css}' can't be found.",
                hint=f"Unzip the theme bundle into an app's static/{theme_prefix()}/ folder or a STATICFILES_DIRS entry. {REEXPORT}",
                id="looseleaf.E002",
            )
        ]

    tokens_path = theme.find(theme.TOKENS)
    if not tokens_path:
        return [
            Warning(
                f"The theme stylesheet was found, but '{theme.static_path(theme.TOKENS)}' wasn't.",
                hint="{% looseleaf_meta %} and {% ll_token %} will use the default tokens. Copy tokens.resolved.json from the theme bundle alongside the stylesheet.",
                id="looseleaf.W003",
            )
        ]

    exported = json.loads(Path(tokens_path).read_text(encoding="utf-8")).get("$version")
    if exported and _major(exported) != _major(__version__):
        return [
            Warning(
                f"The theme was exported from looseleaf-ui {exported}, but django-looseleaf is {__version__}.",
                hint=f"Token names may have changed between major versions. {REEXPORT}",
                id="looseleaf.W004",
            )
        ]
    return []
