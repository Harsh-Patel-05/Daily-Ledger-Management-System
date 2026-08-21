"""GST compliance: returns data, e-invoice & e-way bill documents (local / Munim-style)."""

from django.apps import AppConfig


class GstConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gst'
