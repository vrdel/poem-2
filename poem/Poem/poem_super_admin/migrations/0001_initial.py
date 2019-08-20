# Generated by Django 2.0.13 on 2019-07-12 11:02

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Probe',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of the probe.', max_length=128, unique=True)),
                ('version', models.CharField(help_text='Version of the probe.', max_length=28)),
                ('nameversion', models.CharField(help_text='Name, version tuple.', max_length=128)),
                ('description', models.CharField(max_length=1024)),
                ('comment', models.CharField(max_length=512)),
                ('repository', models.CharField(max_length=512)),
                ('docurl', models.CharField(max_length=512)),
                ('user', models.CharField(blank=True, max_length=32)),
                ('datetime', models.DateTimeField(blank=True, max_length=32, null=True)),
            ],
            options={
                'verbose_name': 'Probe',
            },
        ),
    ]