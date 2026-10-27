from django.forms.renderers import TemplatesSetting


class LooseLeafFormRenderer(TemplatesSetting):
    """Renders forms in LooseLeaf markup: FORM_RENDERER = "django_looseleaf.renderers.LooseLeafFormRenderer".

    Built on TemplatesSetting, so the project's TEMPLATES are searched first and any
    looseleaf/ template can be overridden there. Needs "django.forms" in INSTALLED_APPS.
    """

    form_template_name = "looseleaf/forms/div.html"
    field_template_name = "looseleaf/forms/field.html"  # Django 5.0+: {{ field.as_field_group }}

    # Django templates that LooseLeaf replaces when a form or widget asks for them by name.
    template_overrides = {
        "django/forms/div.html": "looseleaf/forms/div.html",
        "django/forms/field.html": "looseleaf/forms/field.html",
        "django/forms/widgets/radio.html": "looseleaf/widgets/multiple_input.html",
        "django/forms/widgets/checkbox_select.html": "looseleaf/widgets/multiple_input.html",
    }

    def get_template(self, template_name):
        return super().get_template(self.template_overrides.get(template_name, template_name))
