from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from distributions.models import MilkDelivery
from milk_collections.models import MilkCollection
from payments.models import SupplierAdvance

from .coordination import refresh_customer_settlements, refresh_supplier_settlements


def _remember_origin(instance, fields):
    if not instance.pk:
        return
    previous = instance.__class__.objects.filter(pk=instance.pk).values(*fields).first()
    if previous:
        instance._settlement_origin = tuple(previous[field] for field in fields)


@receiver(pre_save, sender=MilkCollection)
def remember_collection_origin(sender, instance, **kwargs):
    _remember_origin(
        instance,
        ('supplier_id', 'ethiopian_year', 'ethiopian_month', 'ethiopian_day'),
    )


@receiver([post_save, post_delete], sender=MilkCollection)
def update_supplier_settlement(sender, instance, **kwargs):
    current = (
        instance.supplier_id,
        instance.ethiopian_year,
        instance.ethiopian_month,
        instance.ethiopian_day,
    )
    origin = getattr(instance, '_settlement_origin', None)
    keys = [origin, current] if origin and origin != current else [current]
    refresh_supplier_settlements(keys)


@receiver(pre_save, sender=MilkDelivery)
def remember_delivery_origin(sender, instance, **kwargs):
    _remember_origin(
        instance,
        ('customer_id', 'ethiopian_year', 'ethiopian_month', 'ethiopian_day'),
    )


@receiver([post_save, post_delete], sender=MilkDelivery)
def update_customer_settlement(sender, instance, **kwargs):
    keys = []
    origin = getattr(instance, '_settlement_origin', None)
    if origin and origin[0]:
        keys.append(origin)
    if instance.customer_id:
        current = (
            instance.customer_id,
            instance.ethiopian_year,
            instance.ethiopian_month,
            instance.ethiopian_day,
        )
        if current not in keys:
            keys.append(current)
    if keys:
        refresh_customer_settlements(keys)


@receiver([post_save, post_delete], sender=SupplierAdvance)
def recalculate_settlement_on_advance(sender, instance, **kwargs):
    latest = MilkCollection.objects.filter(supplier_id=instance.supplier_id).order_by(
        '-ethiopian_year', '-ethiopian_month', '-ethiopian_day'
    ).values_list('ethiopian_year', 'ethiopian_month', 'ethiopian_day').first()
    if latest is None:
        return
    refresh_supplier_settlements([(instance.supplier_id, *latest)])
