"""Settings for django-looseleaf, read with the LOOSELEAF_ prefix."""

from django.conf import settings

# Widget class name -> CSS classes added to the rendered control. The widget's
# MRO is searched in order, so a subclass maps like its parent unless listed.
# Extend or override with LOOSELEAF_WIDGET_CLASSES; an empty string adds nothing.
DEFAULT_WIDGET_CLASSES = {
    "HiddenInput": "",
    "CheckboxInput": "choice__input",
    "RadioSelect": "choice-group",
    "CheckboxSelectMultiple": "choice-group",
    "Select": "select",
    "Textarea": "textarea",
    "Input": "input",
}


def widget_classes():
    return {**DEFAULT_WIDGET_CLASSES, **getattr(settings, "LOOSELEAF_WIDGET_CLASSES", {})}


def theme_prefix():
    """LOOSELEAF_THEME: the static path prefix a theme bundle was unzipped into (e.g. "theme"), or None."""
    prefix = (getattr(settings, "LOOSELEAF_THEME", None) or "").strip("/")
    return prefix or None


def sounds():
    """LOOSELEAF_SOUNDS: False/None (off, the default), True (synthesised sounds), or a static
    path prefix holding click.mp3, toggle.mp3 and success.mp3 (e.g. "sounds")."""
    value = getattr(settings, "LOOSELEAF_SOUNDS", None)
    if isinstance(value, str):
        return value.strip("/") or None
    return bool(value)
