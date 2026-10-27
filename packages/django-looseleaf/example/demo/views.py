from django import forms
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView, ListView

from .models import Component, Enquiry


class EnquiryForm(forms.ModelForm):
    class Meta:
        model = Enquiry
        fields = "__all__"
        widgets = {"plan": forms.RadioSelect}


class EnquiryCreateView(SuccessMessageMixin, CreateView):
    form_class = EnquiryForm
    template_name = "demo/enquiry_form.html"
    success_url = reverse_lazy("enquiry")
    success_message = "Thanks, %(name)s. We'll be in touch."


class ComponentListView(ListView):
    model = Component
    paginate_by = 8
    template_name = "demo/component_list.html"
