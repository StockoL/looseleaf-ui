from django.urls import path

from demo import views

urlpatterns = [
    path("", views.EnquiryCreateView.as_view(), name="enquiry"),
    path("components/", views.ComponentListView.as_view(), name="components"),
]
