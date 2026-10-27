#!/usr/bin/env python
"""Example project for django-looseleaf. Not published; for local checks only."""

import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "example.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
