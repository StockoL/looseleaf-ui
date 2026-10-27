from django.db import migrations

COMPONENTS = {
    "composition": [
        "wrapper", "region", "center", "flow", "cluster", "sidebar",
        "grid", "reel", "switcher", "frame", "bento",
    ],
    "block": [
        "skip-link", "button", "field", "input", "select", "textarea", "choice",
        "input-group", "badge", "accordion", "dropdown", "card", "navbar", "modal",
        "offcanvas", "alert", "table", "prose", "pagination", "breadcrumb",
        "marquee", "bg-mesh", "swatch",
    ],
    "utility": [
        "visually-hidden", "icon", "indent", "text-center", "text-uppercase",
        "truncate", "text-small", "text-lead", "bg-gradient", "anim-lift",
    ],
}


def seed(apps, schema_editor):
    Component = apps.get_model("demo", "Component")
    Component.objects.bulk_create(
        Component(name=name, layer=layer) for layer, names in COMPONENTS.items() for name in names
    )


def unseed(apps, schema_editor):
    apps.get_model("demo", "Component").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("demo", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
