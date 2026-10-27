from django.db import models


class Enquiry(models.Model):
    PLANS = [("starter", "Starter"), ("team", "Team"), ("enterprise", "Enterprise")]

    name = models.CharField(max_length=100)
    email = models.EmailField(help_text="We only use this to reply.")
    website = models.URLField(blank=True)
    seats = models.PositiveIntegerField(default=1)
    plan = models.CharField(max_length=20, choices=PLANS, default="team")
    message = models.TextField()
    subscribe = models.BooleanField(default=False)
