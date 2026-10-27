import pytest
from django.template import Context, Template, TemplateSyntaxError

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
