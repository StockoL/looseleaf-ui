# django-looseleaf

[LooseLeaf UI](https://github.com/StockoL/looseleaf-ui) for Django: the CUBE CSS design system's stylesheet and scripts, template tags for the page head, theme, pagination and messages, and a form renderer that turns a plain `{{ form }}` into accessible LooseLeaf markup.

Supports Django 4.2 and later on Python 3.10 and later.

## Install

```bash
pip install django-looseleaf
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "django.forms",        # lets the renderer find Django's own widget templates
    "django_looseleaf",
]

FORM_RENDERER = "django_looseleaf.renderers.LooseLeafFormRenderer"
```

`django.contrib.staticfiles` serves the assets as usual; a system check (`looseleaf.W001`) warns if the renderer is configured without `django.forms`.

## Base template

```django
{% load looseleaf %}<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    {% looseleaf_meta %}
    <title>My site</title>
    {% looseleaf_theme %}
    {% looseleaf_css %}
    {% looseleaf_js %}
  </head>
  <body>
    {% ll_messages %}
    {% block content %}{% endblock %}
  </body>
</html>
```

That is the whole setup. Every class in the [LooseLeaf README](https://github.com/StockoL/looseleaf-ui#readme) is now available to your templates.

## Theming

Give the project its own colours, type scale, spacing, fonts and shapes without a build step:

![The LooseLeaf token configurator: controls on the left, a live preview of every block on the right](https://raw.githubusercontent.com/StockoL/looseleaf-ui/main/docs/images/configurator-overview.png)

1. Open the [LooseLeaf configurator](https://stockol.github.io/looseleaf-ui/) and adjust the tokens against the live preview. The [configurator walkthrough](https://github.com/StockoL/looseleaf-ui/blob/main/docs/CONFIGURATOR.md) explains every control.
2. Choose **Export → Theme bundle**.
3. Unzip `looseleaf-theme.zip` into an app's `static/theme/` folder (or any `STATICFILES_DIRS` entry).
4. Set `LOOSELEAF_THEME = "theme"` in settings.

`{% looseleaf_css %}` then loads `theme/looseleaf-tokens.css` after the package stylesheet. The theme's tokens sit in the same cascade layer as the defaults, so loading second is all it takes. `{% looseleaf_meta %}` and `{% ll_token %}` read the theme's `tokens.resolved.json`, falling back to the defaults for any token the theme doesn't have, such as one added in a later minor release.

The files are found with Django's staticfiles finders, so the same setting works in development, at `collectstatic` time and in production. System checks catch mistakes:

| Check | Meaning |
| --- | --- |
| `looseleaf.E002` | `LOOSELEAF_THEME` is set but `<prefix>/looseleaf-tokens.css` can't be found. |
| `looseleaf.W003` | The stylesheet was found but `tokens.resolved.json` wasn't, so meta tags and `ll_token` use the defaults. |
| `looseleaf.W004` | The theme was exported from a different major version; re-export it, as token names may have changed. |

The bundle also contains `design-tokens.json`: import it back into the configurator to keep editing the theme.

## Template tags

| Tag | Output |
| --- | --- |
| `{% looseleaf_css %}` | `<link>` to `looseleaf/looseleaf.css` |
| `{% looseleaf_js %}` | Deferred `<script>` for `looseleaf/looseleaf.js` (dropdowns, navbar toggle, dialogs, alerts, copy buttons) |
| `{% looseleaf_theme %}` | The theme script, inlined so the saved light/dark choice applies before first paint and any `[data-theme-toggle]` button works. Use `inline=False` for a blocking `<script src>` under a strict Content Security Policy. |
| `{% looseleaf_html_attrs %}` | Attributes for `<html>`: `<html lang="en"{% looseleaf_html_attrs %}>`. With `LOOSELEAF_SOUNDS = True` it opts the site in to the synthesised interface sounds; with a static prefix (`LOOSELEAF_SOUNDS = "sounds"`) it plays your own `click.mp3`, `toggle.mp3` and `success.mp3` from there. Visitors still turn sounds on themselves with a `[data-sound-toggle]` button. Off by default. |
| `{% looseleaf_meta %}` | Viewport (with `viewport-fit=cover` for notched phones), `color-scheme`, and light and dark `theme-color` from the `color.surface` token. Optional `title="…"` and `icon="path/in/static.png"` add the iOS home-screen title and icon. |
| `{% ll_messages %}` | `django.contrib.messages` as dismissible alerts: error maps to `data-status="danger"` (announced with `role="alert"`), the other levels to info, success and warning. `{% ll_messages style="toast" %}` renders them as toasts instead: with `looseleaf.js` they float and dismiss themselves (danger stays until dismissed); without it they read like alerts where the tag is. |
| `{% ll_pagination page_obj %}` | A pagination nav for a `Page`: elided page range, `aria-current` on the current page, previous/next links, and every other query parameter kept. Optional `param="p"`, `on_each_side=2`, `on_ends=1`. Renders nothing for a single page. |
| `{% ll_token "color.action" %}` | A token's resolved value, for places CSS variables can't reach (HTML email, SVG fills). `scheme="dark"` for the dark value. Raises `TemplateSyntaxError` on an unknown token. |
| `{% ll_widget form.email %}` | One field's control with the LooseLeaf classes and ARIA wiring, for hand-built layouts. |

From Python, `django_looseleaf.tokens.get("color.action", scheme="light")` returns the same values.

## Forms

With the renderer set, `{{ form }}` (and `{{ field.as_field_group }}` on Django 5.0+) renders:

```html
<div class="field" data-status="danger">
  <label class="label" for="id_email">Email</label>
  <input type="email" name="email" class="input" inputmode="email" autocapitalize="none"
         autocomplete="email" aria-invalid="true" aria-describedby="id_email_helptext id_email_error"
         required id="id_email">
  <p class="field__hint" id="id_email_helptext">We only use this to reply.</p>
  <p class="field__error" id="id_email_error" role="alert">Enter a valid email address.</p>
</div>
```

- Every visible field is a `.field` with a `.label`, its control, an optional `.field__hint` (from `help_text`) and `.field__error`. A field with errors gets `data-status="danger"` and its control `aria-invalid="true"`; `aria-describedby` points at the hint and the error.
- A single checkbox sits inside a `.choice` label. `RadioSelect` and `CheckboxSelectMultiple` render as a `.fieldset` with a `.legend` and a `.choice-group` of `.choice` options.
- Non-field errors (and errors on hidden fields) render as a danger `.alert` above the fields.
- Mobile keyboards get the hints Django leaves out: email and URL fields get the right `inputmode` and no auto-capitalisation, integer and decimal fields a numeric keypad, and username and password fields no auto-capitalisation or auto-correct plus a sensible `autocomplete`. Phone numbers aren't guessed; set `inputmode="tel"` in the widget's `attrs`.
- Nothing the form already set is overwritten: attributes you pass in `widget.attrs` win, and your `class` is kept alongside LooseLeaf's.

Wrap the form in your own `<form>` with a submit button, for example inside a `.card`:

```django
<form class="card__body flow" method="post">
  {% csrf_token %}
  {{ form }}
  <button class="button" type="submit" data-variant="primary">Send</button>
</form>
```

### Widget classes

The class each widget gets comes from a mapping of widget class names, searched along the widget's inheritance chain:

| Widget | Class |
| --- | --- |
| text-like `Input` subclasses (text, email, URL, number, password, date, file…) | `input` |
| `Select`, `SelectMultiple` | `select` |
| `Textarea` | `textarea` |
| `CheckboxInput` | `choice__input` |
| `RadioSelect`, `CheckboxSelectMultiple` | `choice-group` (on the wrapper) |
| `HiddenInput` | none |

Extend or override it in settings:

```python
LOOSELEAF_WIDGET_CLASSES = {
    "MyColourWidget": "input",
    "Textarea": "textarea",
}
```

### Overriding templates

The renderer extends Django's `TemplatesSetting`, so your project's template directories are searched first. Copy any template from `django_looseleaf/templates/looseleaf/` (`forms/div.html`, `forms/field.html`, `forms/field_feedback.html`, `widgets/multiple_input.html`, `widgets/input_option.html`, `pagination.html`, `messages.html`) into your own `templates/looseleaf/` to change it.

## Default tokens

The package stylesheet carries LooseLeaf's default tokens; a project changes them with a theme (above), never by editing the package. In the LooseLeaf repository itself, the defaults come from `design-tokens.json` via `npm run build`, which also refreshes the package's static files and `tokens.resolved.json`. The package never derives a token, and a test fails if its static files drift from the npm build.

## Example project

The repository includes a small example project (not part of the published package):

```bash
cd packages/django-looseleaf/example
pip install -e ..
python manage.py migrate
python manage.py runserver
```

It shows a ModelForm with its error state, success messages, a paginated list and the theme toggle, all styled by a project theme in `example/demo/static/theme/` (`LOOSELEAF_THEME = "theme"`).

## Development

```bash
cd packages/django-looseleaf
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -e ".[test]"
python -m pytest
```

Publishing is manual: `python -m build` inside this folder, then `twine upload dist/*`.

## License

MIT. See [LICENSE](LICENSE).
