from html.parser import HTMLParser

import pytest
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.test import override_settings

from tests.testapp.models import Enquiry


class EnquiryForm(forms.ModelForm):
    class Meta:
        model = Enquiry
        fields = "__all__"
        widgets = {"plan": forms.RadioSelect, "website": forms.URLInput(attrs={"inputmode": "text"})}


class InterestsForm(forms.Form):
    interests = forms.MultipleChoiceField(
        choices=[("css", "CSS"), ("a11y", "Accessibility")],
        widget=forms.CheckboxSelectMultiple,
        help_text="Pick any.",
    )
    token = forms.CharField(widget=forms.HiddenInput)
    upload = forms.FileField(required=False)

    def clean(self):
        raise forms.ValidationError("Something about the whole form is wrong.")


class Elements(HTMLParser):
    """Collects (tag, attrs) for every start tag."""

    def __init__(self, html):
        super().__init__()
        self.found = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.found.append((tag, dict(attrs)))

    def __call__(self, tag, **match):
        return [a for t, a in self.found if t == tag and all(a.get(k) == v for k, v in match.items())]


def classes(attrs):
    return (attrs.get("class") or "").split()


@pytest.fixture
def blank():
    return Elements(str(EnquiryForm()))


@pytest.fixture
def invalid():
    form = EnquiryForm(data={"name": "", "email": "not-an-email", "seats": "1", "plan": "team", "message": ""})
    assert not form.is_valid()
    return Elements(str(form))


def test_fields_are_wrapped_in_field_blocks_with_labels(blank):
    fields = [a for a in blank("div") if "field" in classes(a)]
    assert len(fields) == 6  # every visible field except the radio group, which is a fieldset
    label = blank("label", **{"for": "id_name"})[0]
    assert classes(label) == ["label"]


def test_controls_get_their_block_classes(blank):
    assert classes(blank("input", name="name")[0]) == ["input"]
    assert classes(blank("textarea", name="message")[0]) == ["textarea"]
    assert classes(blank("input", name="subscribe")[0]) == ["choice__input"]


def test_single_checkbox_sits_inside_a_choice_label(blank):
    assert blank("label", **{"for": "id_subscribe"})[0]["class"] == "choice"


def test_radio_group_renders_as_fieldset_and_choices(blank):
    fieldset = blank("fieldset")[0]
    assert classes(fieldset) == ["fieldset", "field"]
    assert blank("legend")[0]["class"] == "legend"
    assert [a["class"] for a in blank("div") if a.get("id") == "id_plan"] == ["choice-group"]
    radios = blank("input", type="radio")
    assert len(radios) == 3 and all(classes(r) == ["choice__input"] for r in radios)
    assert len([a for a in blank("label") if a.get("class") == "choice"]) == 4  # 3 radios + subscribe


def test_help_text_is_a_hint_wired_with_aria_describedby(blank):
    assert blank("p", id="id_email_helptext")[0]["class"] == "field__hint"
    assert blank("input", name="email")[0]["aria-describedby"] == "id_email_helptext"


def test_errors_mark_the_control_invalid_and_render_field_errors(invalid):
    email = invalid("input", name="email")[0]
    assert email["aria-invalid"] == "true"
    assert email["aria-describedby"] == "id_email_helptext id_email_error"
    error = invalid("p", id="id_email_error")[0]
    assert error["class"] == "field__error" and error["role"] == "alert"
    danger = [a for a in invalid("div") if a.get("data-status") == "danger"]
    assert len(danger) == 3  # name, email, message


def test_mobile_keyboard_hints_fill_gaps_without_clobbering(blank):
    email = blank("input", name="email")[0]
    assert email["inputmode"] == "email" and email["autocapitalize"] == "none" and email["autocomplete"] == "email"
    assert blank("input", name="seats")[0]["inputmode"] == "numeric"
    website = blank("input", name="website")[0]
    assert website["inputmode"] == "text", "an attribute the form set is never overwritten"
    assert website["autocapitalize"] == "none"


def test_auth_fields_get_username_and_password_hints():
    html = Elements(str(AuthenticationForm()))
    username = html("input", name="username")[0]
    assert username["autocapitalize"] == "none" and username["autocorrect"] == "off"
    password = html("input", name="password")[0]
    assert password["autocapitalize"] == "none" and password["autocomplete"] == "current-password"


def test_checkbox_group_non_field_errors_hidden_and_file_fields():
    form = InterestsForm(data={"interests": ["css"], "token": "x"})
    assert not form.is_valid()
    html = Elements(str(form))
    alert = html("div", role="alert")[0]
    assert alert["class"] == "alert" and alert["data-status"] == "danger"
    fieldset = html("fieldset")[0]
    assert fieldset["aria-describedby"] == "id_interests_helptext"
    checkboxes = html("input", type="checkbox")
    assert len(checkboxes) == 2 and all("aria-describedby" not in c for c in checkboxes)
    assert "class" not in html("input", type="hidden")[0]
    assert classes(html("input", type="file")[0]) == ["input"]


def test_field_group_uses_the_looseleaf_field_template():
    bound = EnquiryForm()["name"]
    if not hasattr(bound, "as_field_group"):
        pytest.skip("as_field_group needs Django 5.0+")
    html = Elements(bound.as_field_group())
    assert [a for a in html("div") if "field" in classes(a)]


@override_settings(LOOSELEAF_WIDGET_CLASSES={"Textarea": "textarea textarea--tall", "TextInput": "input input--text"})
def test_widget_classes_can_be_extended_in_settings():
    html = Elements(str(EnquiryForm()))
    assert classes(html("textarea", name="message")[0]) == ["textarea", "textarea--tall"]
    assert classes(html("input", name="name")[0]) == ["input", "input--text"]


def test_existing_widget_classes_are_kept():
    class Form(forms.Form):
        name = forms.CharField(widget=forms.TextInput(attrs={"class": "wide"}))

    assert classes(Elements(str(Form()))("input", name="name")[0]) == ["input", "wide"]
