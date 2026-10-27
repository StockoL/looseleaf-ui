"""Attributes LooseLeaf adds to a bound field's control.

Everything here only fills gaps: an attribute the form or widget already set
is never overwritten, and CSS classes are merged rather than replaced.
"""

from django import forms

from .conf import widget_classes

# Mobile keyboard hints Django leaves out, keyed by form field class (searched along the MRO).
# Phone numbers are not guessed: set inputmode="tel" in the widget's attrs.
KEYBOARD_ATTRS = {
    "EmailField": {"inputmode": "email", "autocapitalize": "none", "autocomplete": "email"},
    "URLField": {"inputmode": "url", "autocapitalize": "none"},
    "DecimalField": {"inputmode": "decimal"},
    "FloatField": {"inputmode": "decimal"},
    "IntegerField": {"inputmode": "numeric"},
    "UsernameField": {"autocapitalize": "none", "autocorrect": "off", "autocomplete": "username"},
}
PASSWORD_ATTRS = {"autocapitalize": "none", "autocorrect": "off", "autocomplete": "current-password"}


def _lookup(mapping, obj):
    for cls in type(obj).__mro__:
        if cls.__name__ in mapping:
            return mapping[cls.__name__]
    return None


def merge_classes(*values):
    tokens = []
    for value in values:
        for token in (value or "").split():
            if token not in tokens:
                tokens.append(token)
    return " ".join(tokens)


def field_kind(bound_field):
    """How the field is laid out: "checkbox", "choices" (radio/checkbox group) or "control"."""
    widget = bound_field.field.widget
    if isinstance(widget, forms.CheckboxInput):
        return "checkbox"
    if isinstance(widget, forms.widgets.ChoiceWidget) and widget.input_type in ("radio", "checkbox"):
        return "choices"
    return "control"


def hint_id(bound_field):
    # Matches the id Django (5.0+) itself points aria-describedby at.
    return f"{bound_field.auto_id}_helptext" if bound_field.auto_id and bound_field.help_text else ""


def error_id(bound_field):
    return f"{bound_field.auto_id}_error" if bound_field.auto_id and bound_field.errors else ""


def described_by(bound_field):
    return " ".join(i for i in (hint_id(bound_field), error_id(bound_field)) if i)


def control_attrs(bound_field):
    widget = bound_field.field.widget
    existing = widget.attrs
    attrs = {}

    css = merge_classes(_lookup(widget_classes(), widget), existing.get("class"))
    if css:
        attrs["class"] = css

    keyboard = dict(_lookup(KEYBOARD_ATTRS, bound_field.field) or {})
    if isinstance(widget, forms.PasswordInput):
        keyboard.update(PASSWORD_ATTRS)
    for name, value in keyboard.items():
        if name not in existing:
            attrs[name] = value

    if bound_field.errors and "aria-invalid" not in existing:
        attrs["aria-invalid"] = "true"

    # A radio/checkbox group is described on its fieldset, not on every option.
    describedby = described_by(bound_field)
    if describedby and field_kind(bound_field) != "choices" and "aria-describedby" not in existing:
        attrs["aria-describedby"] = describedby

    return attrs
