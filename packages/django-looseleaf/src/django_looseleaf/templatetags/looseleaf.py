from functools import lru_cache
from pathlib import Path

from django import template
from django.contrib.messages import get_messages
from django.http import QueryDict
from django.templatetags.static import static
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

from .. import controls, theme, tokens

register = template.Library()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static" / "looseleaf"


# ---------------------------------------------------------------------------
# <head>
# ---------------------------------------------------------------------------
@register.simple_tag
def looseleaf_css():
    """The LooseLeaf stylesheet, then the project theme's tokens (LOOSELEAF_THEME).

    The theme's tokens sit in the same cascade layer as the defaults, so loading
    them second is the whole override mechanism.
    """
    links = [format_html('<link rel="stylesheet" href="{}">', static("looseleaf/looseleaf.css"))]
    theme_css = theme.static_path(theme.STYLESHEET)
    if theme_css:
        links.append(format_html('<link rel="stylesheet" href="{}">', static(theme_css)))
    return mark_safe("\n".join(links))


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


# ---------------------------------------------------------------------------
# Pagination and messages
# ---------------------------------------------------------------------------
@register.inclusion_tag("looseleaf/pagination.html", takes_context=True)
def ll_pagination(context, page, param="page", on_each_side=2, on_ends=1):
    """A .pagination nav for a Page, keeping every other query parameter. Renders nothing for one page."""
    if page.paginator.num_pages < 2:
        return {"items": None}
    request = context.get("request")
    query = request.GET.copy() if request is not None else QueryDict(mutable=True)

    def href(number):
        query[param] = number
        return f"?{query.urlencode()}"

    items = []
    for number in page.paginator.get_elided_page_range(page.number, on_each_side=on_each_side, on_ends=on_ends):
        if number == page.paginator.ELLIPSIS:
            items.append({"gap": True})
        else:
            items.append({"number": number, "href": href(number), "current": number == page.number})

    return {
        "items": items,
        "previous": href(page.previous_page_number()) if page.has_previous() else None,
        "next": href(page.next_page_number()) if page.has_next() else None,
    }


MESSAGE_STATUS = {"debug": "info", "info": "info", "success": "success", "warning": "warning", "error": "danger"}


@register.inclusion_tag("looseleaf/messages.html", takes_context=True)
def ll_messages(context, style="alert"):
    """django.contrib.messages as dismissible .alert blocks (error -> danger).

    style="toast" renders a .toast-region instead: with looseleaf.js the messages
    float as toasts and dismiss themselves; without it they read like alerts.
    """
    messages = context.get("messages")
    if messages is None and context.get("request") is not None:
        messages = get_messages(context["request"])
    items = [{"text": str(m), "status": MESSAGE_STATUS.get(m.level_tag, "info")} for m in (messages or [])]
    return {"items": items, "toast": style == "toast"}


# ---------------------------------------------------------------------------
# Forms (used by the renderer's templates; also usable on a single field)
# ---------------------------------------------------------------------------
@register.simple_tag
def ll_widget(bound_field):
    """A field's control with LooseLeaf classes, ARIA wiring and keyboard hints added."""
    return bound_field.as_widget(attrs=controls.control_attrs(bound_field))


@register.simple_tag
def ll_field_kind(bound_field):
    return controls.field_kind(bound_field)


@register.simple_tag
def ll_described_by(bound_field):
    """ aria-describedby="…" pointing at the hint and error, or nothing."""
    ids = controls.described_by(bound_field)
    return format_html(' aria-describedby="{}"', ids) if ids else ""
