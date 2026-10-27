from django.db import models


class Enquiry(models.Model):
    PLANS = [("starter", "Starter"), ("team", "Team"), ("enterprise", "Enterprise")]

    name = models.CharField(max_length=100)
    email = models.EmailField(help_text="We only use this to reply.")
    website = models.URLField(blank=True)
    plan = models.CharField(max_length=20, choices=PLANS, default="team")
    seats = models.PositiveIntegerField(default=1)
    message = models.TextField()
    subscribe = models.BooleanField("Send me release notes", default=False)

    class Meta:
        verbose_name_plural = "enquiries"

    def __str__(self):
        return f"{self.name} <{self.email}>"


class Component(models.Model):
    name = models.CharField(max_length=60)
    layer = models.CharField(max_length=20)

    class Meta:
        ordering = ["layer", "name"]

    def __str__(self):
        return self.name
