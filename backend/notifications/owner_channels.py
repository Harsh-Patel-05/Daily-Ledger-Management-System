"""
Send automatic alerts to the SHOP OWNER (not customers).

Email: Django SMTP (Gmail free App Password works on free Gmail).
SMS: Fast2SMS API (optional FAST2SMS_API_KEY) — free credits for India numbers.
     Without a key, DEBUG mode logs the SMS to the console.

Customers still only get WhatsApp/SMS/Email via manual Send Reminder (deep links).
"""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def _owner_email(user) -> str:
    email = (getattr(user, 'email', None) or '').strip()
    if email:
        return email
    try:
        return (user.business.email or '').strip()
    except Exception:
        return ''


def _owner_mobile(user) -> str:
    mobile = (getattr(user, 'mobile', None) or '').strip()
    if not mobile:
        try:
            mobile = (user.business.mobile or '').strip()
        except Exception:
            mobile = ''
    digits = re.sub(r'\D', '', mobile or '')
    if digits.startswith('91') and len(digits) >= 12:
        digits = digits[-10:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits if len(digits) == 10 else ''


TYPE_META = {
    'payment_reminder': {
        'label': 'Reminder',
        'bg': '#EFF6FF',
        'border': '#BFDBFE',
        'badge_bg': '#DBEAFE',
        'badge_color': '#1D4ED8',
    },
    'overdue': {
        'label': 'Overdue',
        'bg': '#FEF2F2',
        'border': '#FECACA',
        'badge_bg': '#FEE2E2',
        'badge_color': '#B91C1C',
    },
    'pending_bill': {
        'label': 'Pending',
        'bg': '#FFFBEB',
        'border': '#FDE68A',
        'badge_bg': '#FEF3C7',
        'badge_color': '#B45309',
    },
    'upcoming_due': {
        'label': 'Upcoming',
        'bg': '#ECFDF5',
        'border': '#A7F3D0',
        'badge_bg': '#D1FAE5',
        'badge_color': '#047857',
    },
}


def _format_amount(amount) -> str:
    if amount is None:
        return ''
    try:
        return f'Rs.{float(amount):,.2f}'
    except (TypeError, ValueError):
        return f'Rs.{amount}'


def _owner_display_name(user) -> str:
    name = (getattr(user, 'name', None) or '').strip()
    if name:
        return name
    first = (getattr(user, 'first_name', None) or '').strip()
    last = (getattr(user, 'last_name', None) or '').strip()
    full = f'{first} {last}'.strip()
    if full:
        return full
    try:
        return (user.business.owner_name or '').strip()
    except Exception:
        return ''


def _shop_name(user) -> str:
    try:
        return (user.business.shop_name or user.shop_name or 'Your Shop').strip()
    except Exception:
        return (getattr(user, 'shop_name', None) or 'Your Shop').strip() or 'Your Shop'


def build_email_context(user, notifications: list) -> dict:
    items = []
    for n in notifications:
        meta = TYPE_META.get(n.type, TYPE_META['payment_reminder'])
        customer_name = ''
        if getattr(n, 'customer_id', None) and getattr(n, 'customer', None):
            customer_name = n.customer.name
        items.append({
            'title': n.title,
            'message': n.message,
            'amount': _format_amount(n.amount) if n.amount is not None else '',
            'customer_name': customer_name,
            'label': meta['label'],
            'bg': meta['bg'],
            'border': meta['border'],
            'badge_bg': meta['badge_bg'],
            'badge_color': meta['badge_color'],
        })

    count = len(notifications)
    heading = 'New shop alert' if count == 1 else f'{count} new shop alerts'
    subject = f'Daily Ledger - {heading}'
    now = timezone.localtime()

    return {
        'subject': subject,
        'heading': heading,
        'count': count,
        'items': items,
        'owner_name': _owner_display_name(user),
        'shop_name': _shop_name(user),
        'date_label': now.strftime('%d %b %Y, %I:%M %p'),
        'year': now.year,
        'app_url': getattr(settings, 'FRONTEND_APP_URL', '') or '',
    }


def _digest_body(notifications) -> str:
    """Plain-text fallback (also used if template render fails)."""
    lines = ['Daily Ledger - new alerts for your shop:', '']
    for n in notifications:
        amount = f' (Rs.{n.amount})' if getattr(n, 'amount', None) is not None else ''
        lines.append(f'- {n.title}{amount}')
        if n.message:
            lines.append(f'  {n.message}')
        lines.append('')
    lines.append('Open the app > Notifications to review.')
    return '\n'.join(lines)


def build_sms_text(notifications: list) -> str:
    n = len(notifications)
    first = notifications[0].title if notifications else 'Alert'
    if n == 1:
        text = f'DLMS: {first}'
    else:
        text = f'DLMS: {n} alerts. 1) {first}'
    return text[:140]


def send_owner_email(user, notifications: list) -> dict:
    if not notifications:
        return {'ok': False, 'skipped': True, 'reason': 'no_notifications'}

    to = _owner_email(user)
    if not to:
        return {'ok': False, 'skipped': True, 'reason': 'no_owner_email'}

    # Prefetch customer for template
    notes = list(notifications)
    try:
        from notifications.models import Notification
        ids = [n.pk for n in notes if getattr(n, 'pk', None)]
        if ids:
            notes = list(
                Notification.objects.filter(pk__in=ids).select_related('customer')
            ) or notes
    except Exception:
        pass

    ctx = build_email_context(user, notes)
    subject = ctx['subject']
    try:
        text_body = render_to_string('notifications/owner_alert.txt', ctx)
        html_body = render_to_string('notifications/owner_alert.html', ctx)
    except Exception:
        logger.exception('Email template render failed — using plain text')
        text_body = _digest_body(notes)
        html_body = None

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        )
        if html_body:
            msg.attach_alternative(html_body, 'text/html')
        sent = msg.send(fail_silently=False)
        logger.info('Owner email sent to %s (%s)', to, sent)
        return {'ok': True, 'to': to, 'count': len(notes), 'template': bool(html_body)}
    except Exception as exc:
        logger.exception('Owner email failed')
        return {'ok': False, 'to': to, 'error': str(exc)}


def send_owner_sms(user, notifications: list) -> dict:
    if not notifications:
        return {'ok': False, 'skipped': True, 'reason': 'no_notifications'}

    mobile = _owner_mobile(user)
    if not mobile:
        return {'ok': False, 'skipped': True, 'reason': 'no_owner_mobile'}

    api_key = getattr(settings, 'FAST2SMS_API_KEY', '') or ''
    text = build_sms_text(notifications)

    if not api_key:
        logger.warning('[DLMS SMS] No FAST2SMS_API_KEY — would SMS %s: %s', mobile, text)
        if settings.DEBUG:
            print(f'[DLMS SMS -> {mobile}] {text}')
            return {
                'ok': True,
                'to': mobile,
                'demo': True,
                'message': text,
                'detail': 'Logged SMS (set FAST2SMS_API_KEY in backend/.env for real SMS)',
            }
        return {'ok': False, 'skipped': True, 'reason': 'no_sms_api_key'}

    payload = json.dumps({
        'route': 'q',
        'message': text,
        'language': 'english',
        'flash': 0,
        'numbers': mobile,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://www.fast2sms.com/dev/bulkV2',
        data=payload,
        headers={
            'authorization': api_key,
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
            data = json.loads(raw) if raw else {}
            ok = data.get('return') is True or data.get('status_code') == 200
            if not ok:
                logger.warning('Fast2SMS failed: %s', data)
                msg = data.get('message') if isinstance(data, dict) else data
                return {'ok': False, 'to': mobile, 'error': msg or data or raw}
            logger.info('Owner SMS sent to %s', mobile)
            return {'ok': True, 'to': mobile, 'provider': 'fast2sms'}
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode('utf-8', errors='replace')
        logger.warning('Fast2SMS HTTP error: %s %s', exc.code, err_body)
        try:
            err_json = json.loads(err_body)
            msg = err_json.get('message') or err_body
        except Exception:
            msg = err_body or str(exc)
        return {'ok': False, 'to': mobile, 'error': msg}
    except Exception as exc:
        logger.exception('Owner SMS failed')
        return {'ok': False, 'to': mobile, 'error': str(exc)}


def dispatch_owner_channels(user, notifications: list, business_settings=None) -> dict:
    """Email / SMS the shop owner about newly created in-app notifications."""
    from accounts.models import BusinessSettings

    if business_settings is None:
        business_settings, _ = BusinessSettings.objects.get_or_create(user=user)

    result = {'email': None, 'sms': None}
    notes = list(notifications or [])
    if not notes:
        return result

    if business_settings.email_notifications:
        result['email'] = send_owner_email(user, notes)
    else:
        result['email'] = {'ok': False, 'skipped': True, 'reason': 'disabled'}

    if business_settings.sms_notifications:
        result['sms'] = send_owner_sms(user, notes)
    else:
        result['sms'] = {'ok': False, 'skipped': True, 'reason': 'disabled'}

    return result
