"""Project themes: LOOSELEAF_THEME points at a configurator bundle under static/."""

from django.core import checks
from django.template import Context, Template
from django.test import override_settings

from django_looseleaf import tokens


def render(source):
    return Template("{% load looseleaf %}" + source).render(Context())


def theme_messages():
    return [m for m in checks.run_checks() if m.id.startswith("looseleaf.")]


def test_without_a_theme_only_the_package_stylesheet_loads():
    assert render("{% looseleaf_css %}") == '<link rel="stylesheet" href="/static/looseleaf/looseleaf.css">'
    assert theme_messages() == []


@override_settings(LOOSELEAF_THEME="theme")
def test_theme_stylesheet_loads_after_the_package_stylesheet():
    assert render("{% looseleaf_css %}").splitlines() == [
        '<link rel="stylesheet" href="/static/looseleaf/looseleaf.css">',
        '<link rel="stylesheet" href="/static/theme/looseleaf-tokens.css">',
    ]


@override_settings(LOOSELEAF_THEME="/theme/")
def test_theme_prefix_tolerates_slashes():
    assert '<link rel="stylesheet" href="/static/theme/looseleaf-tokens.css">' in render("{% looseleaf_css %}")


@override_settings(LOOSELEAF_THEME="theme")
def test_theme_tokens_win_and_missing_ones_fall_back_to_defaults():
    assert tokens.get("color.surface") == "#fdf6e3"
    assert tokens.get("color.surface", "dark") == "#002b36"
    assert tokens.get("color.action") == tokens.load()["color.action"]["light"], "not in the theme, so the default"
    assert render('{% ll_token "color.surface" scheme="dark" %}') == "#002b36"


@override_settings(LOOSELEAF_THEME="theme")
def test_meta_theme_colour_follows_the_project_theme():
    html = render("{% looseleaf_meta %}")
    assert 'content="#fdf6e3" media="(prefers-color-scheme: light)"' in html
    assert 'content="#002b36" media="(prefers-color-scheme: dark)"' in html


def test_switching_themes_is_picked_up_without_a_restart():
    with override_settings(LOOSELEAF_THEME="theme"):
        assert tokens.get("color.surface") == "#fdf6e3"
    assert tokens.get("color.surface") == tokens.load()["color.surface"]["light"]


@override_settings(LOOSELEAF_THEME="theme")
def test_a_complete_theme_passes_the_checks():
    assert theme_messages() == []


@override_settings(LOOSELEAF_THEME="missing")
def test_e002_when_the_theme_stylesheet_cannot_be_found():
    [message] = theme_messages()
    assert message.id == "looseleaf.E002" and message.level == checks.ERROR
    assert "missing/looseleaf-tokens.css" in message.msg


@override_settings(LOOSELEAF_THEME="theme-nojson")
def test_w003_when_the_resolved_tokens_are_missing():
    [message] = theme_messages()
    assert message.id == "looseleaf.W003" and message.level == checks.WARNING
    assert tokens.get("color.surface") == tokens.load()["color.surface"]["light"], "falls back to defaults"


@override_settings(LOOSELEAF_THEME="theme-v1")
def test_w004_when_the_theme_comes_from_another_major_version():
    [message] = theme_messages()
    assert message.id == "looseleaf.W004"
    assert "1.4.0" in message.msg
