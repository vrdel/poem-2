# Generated by Django 2.2.12 on 2020-04-03 13:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poem_super_admin', '0019_package_use_present_version'),
    ]

    operations = [
        migrations.AddField(
            model_name='metrictemplate',
            name='description',
            field=models.TextField(default=''),
        ),
    ]