"""Locating a project theme: a configurator theme bundle unzipped under LOOSELEAF_THEME.

Files are found with the staticfiles finders, which search the source
directories (app static/ folders and STATICFILES_DIRS) whatever DEBUG is, so
this works in development, at collectstatic time and in production.
"""

from functools import lru_cache

from django.contrib.staticfiles import finders

from .conf import theme_prefix

STYLESHEET = "looseleaf-tokens.css"
TOKENS = "tokens.resolved.json"


def static_path(name):
    """The theme file's static path ("theme/looseleaf-tokens.css"), or None without a theme."""
    prefix = theme_prefix()
    return f"{prefix}/{name}" if prefix else None


@lru_cache(maxsize=None)
def find(name):
    """Absolute path of a theme file on disk, or None if there is no theme or no such file."""
    path = static_path(name)
    return finders.find(path) if path else None


def clear_caches(**kwargs):
    from . import tokens

    find.cache_clear()
    tokens.load_theme.cache_clear()
