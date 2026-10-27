from functools import lru_cache
from pathlib import Path

from django import template
from django.templatetags.static import static
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

from .. import tokens

register = template.Library()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static" / "looseleaf"


# ---------------------------------------------------------------------------
# <head>
# ---------------------------------------------------------------------------
@register.simple_tag
def looseleaf_css():
    return format_html('<link rel="stylesheet" href="{}">', static("looseleaf/looseleaf.css"))


@register.simple_tag
def looseleaf_js():
    """The behaviours script. Pair with {% looseleaf_theme %} in <head> for the theme toggle."""
    return format_html('<script src="{}" defer></script>', static("looseleaf/looseleaf.js"))


@lru_cache(maxsize=1)
def _theme_source():
    return (STATIC_DIR / "theme.js").read_text(encoding="utf-8")


@register.simple_tag
def looseleaf_theme(inline=True):
    """Applies the stored light/dark choice before first paint and wires [data-theme-toggle].

    Inline by default; inline=False emits a blocking <script src> for strict CSPs.
    """
    if not inline:
        return format_html('<script src="{}"></script>', static("looseleaf/theme.js"))
    return mark_safe(f"<script>{_theme_source()}</script>")


@register.simple_tag
def looseleaf_meta(title=None, icon=None):
    """Viewport (with safe areas), colour scheme and theme colours; optionally a home-screen title and icon."""
    tags = [
        ('<meta name="viewport" content="{}">', ("width=device-width, initial-scale=1, viewport-fit=cover",)),
        ('<meta name="color-scheme" content="{}">', ("light dark",)),
        (
            '<meta name="theme-color" content="{}" media="(prefers-color-scheme: light)">',
            (tokens.get("color.surface", "light"),),
        ),
        (
            '<meta name="theme-color" content="{}" media="(prefers-color-scheme: dark)">',
            (tokens.get("color.surface", "dark"),),
        ),
    ]
    if title:
        tags.append(('<meta name="apple-mobile-web-app-title" content="{}">', (title,)))
    if icon:
        href = icon if icon.startswith(("/", "http://", "https://")) else static(icon)
        tags.append(('<link rel="apple-touch-icon" href="{}">', (href,)))
    return format_html_join("\n", "{}", ((format_html(markup, *args),) for markup, args in tags))


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------
@register.simple_tag
def ll_token(path, scheme="light"):
    """A token's resolved literal, for places CSS variables can't reach (emails, SVG fills)."""
    try:
        return tokens.get(path, scheme)
    except (KeyError, ValueError) as error:
        raise template.TemplateSyntaxError(str(error.args[0])) from None
