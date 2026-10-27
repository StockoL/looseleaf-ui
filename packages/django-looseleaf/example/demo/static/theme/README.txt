LooseLeaf UI theme, exported 2026-10-27 from looseleaf-ui 2.0.0

Files
  looseleaf-tokens.css   Your tokens, compiled. Load it after looseleaf.css.
  tokens.resolved.json   Every token's resolved value (read by django-looseleaf).
  design-tokens.json     The source. Import it into the configurator to keep editing.

Django
  Unzip these files into an app's static/theme/ folder (or a STATICFILES_DIRS
  entry), then in settings.py:

    INSTALLED_APPS = [..., "django.forms", "django_looseleaf"]
    LOOSELEAF_THEME = "theme"

  {% looseleaf_css %} then loads this theme after the base stylesheet.

Plain HTML
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/LooseLeafApplications/looseleaf-ui@v2.0.0/dist/looseleaf.css">
  <link rel="stylesheet" href="looseleaf-tokens.css">
