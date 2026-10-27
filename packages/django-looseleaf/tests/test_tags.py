import pytest
from django.contrib import messages
from django.contrib.messages.storage.cookie import CookieStorage
from django.core.paginator import Paginator
from django.template import Context, RequestContext, Template, TemplateSyntaxError
from django.test import RequestFactory

from django_looseleaf import tokens


def render(source, **context):
    return Template("{% load looseleaf %}" + source).render(Context(context))


def test_css_and_js_tags_use_static():
    assert render("{% looseleaf_css %}") == '<link rel="stylesheet" href="/static/looseleaf/looseleaf.css">'
    assert render("{% looseleaf_js %}") == '<script src="/static/looseleaf/looseleaf.js" defer></script>'


def test_theme_tag_inlines_the_no_flash_script_by_default():
    html = render("{% looseleaf_theme %}")
    assert html.startswith("<script>") and "localStorage" in html and "data-theme-toggle" in html
    assert render("{% looseleaf_theme inline=False %}") == '<script src="/static/looseleaf/theme.js"></script>'


def test_meta_tag_resolves_theme_colours_from_tokens():
    html = render('{% looseleaf_meta title="LooseLeaf" icon="icons/touch.png" %}')
    assert 'content="width=device-width, initial-scale=1, viewport-fit=cover"' in html
    assert f'content="{tokens.get("color.surface")}" media="(prefers-color-scheme: light)"' in html
    assert f'content="{tokens.get("color.surface", "dark")}" media="(prefers-color-scheme: dark)"' in html
    assert '<meta name="apple-mobile-web-app-title" content="LooseLeaf">' in html
    assert '<link rel="apple-touch-icon" href="/static/icons/touch.png">' in html


def test_ll_token_follows_references_to_a_literal():
    action = render('{% ll_token "color.action" %}')
    assert action.startswith("#") and action == tokens.get("action.500")
    assert render('{% ll_token "color.surface" scheme="dark" %}') == tokens.get("neutral.950")


def test_ll_token_rejects_unknown_paths_and_schemes():
    with pytest.raises(TemplateSyntaxError, match="Unknown LooseLeaf token 'color.nope'"):
        render('{% ll_token "color.nope" %}')
    with pytest.raises(TemplateSyntaxError, match="Unknown scheme"):
        render('{% ll_token "color.action" scheme="sepia" %}')


def test_pagination_marks_the_current_page_and_keeps_other_parameters():
    request = RequestFactory().get("/items/", {"q": "cards", "page": "6"})
    page = Paginator(range(200), 10).page(6)
    html = Template("{% load looseleaf %}{% ll_pagination page %}").render(RequestContext(request, {"page": page}))
    assert '<nav class="pagination" aria-label="Pagination">' in html
    assert '<a class="pagination__link" href="?q=cards&amp;page=6" aria-current="page">6</a>' in html
    assert 'href="?q=cards&amp;page=5" rel="prev">Previous</a>' in html
    assert 'href="?q=cards&amp;page=7" rel="next">Next</a>' in html
    assert html.count('class="pagination__gap"') == 2  # 1 … 4 5 6 7 8 … 20


def test_pagination_disables_ends_and_hides_for_a_single_page():
    first = Template("{% load looseleaf %}{% ll_pagination page %}").render(Context({"page": Paginator(range(30), 10).page(1)}))
    assert '<a class="pagination__link" aria-disabled="true">Previous</a>' in first
    assert 'href="?page=2" rel="next"' in first
    single = Template("{% load looseleaf %}{% ll_pagination page %}").render(Context({"page": Paginator(range(5), 10).page(1)}))
    assert single.strip() == ""


def test_messages_render_as_dismissible_alerts_with_mapped_status():
    request = RequestFactory().get("/")
    request._messages = CookieStorage(request)
    messages.success(request, "Saved.")
    messages.error(request, "Could not send.")
    html = Template("{% load looseleaf %}{% ll_messages %}").render(RequestContext(request, {}))
    assert '<div class="alert" data-status="success" role="status">' in html
    assert '<div class="alert" data-status="danger" role="alert">' in html
    assert html.count('class="alert__close"') == 2 and "<p>Could not send.</p>" in html


def test_messages_render_nothing_when_there_are_none():
    request = RequestFactory().get("/")
    request._messages = CookieStorage(request)
    assert Template("{% load looseleaf %}{% ll_messages %}").render(RequestContext(request, {})).strip() == ""
