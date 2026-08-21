from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters

from accounts.ownership import data_owner
from customers.models import Customer
from .models import Notification, ActivityLog
from .serializers import NotificationSerializer, ActivityLogSerializer
from .services import sync_notifications


class NotificationFilter(filters.FilterSet):
    type = filters.CharFilter(field_name='type')
    is_read = filters.BooleanFilter(field_name='is_read')

    class Meta:
        model = Notification
        fields = ['type', 'is_read']


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    filterset_class = NotificationFilter
    search_fields = ['title', 'message']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    http_method_names = ['get', 'patch', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(owner=data_owner(self.request.user)).select_related('customer')

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('notif_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('notif_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        serializer.save(owner=data_owner(self.request.user))

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'updated': updated})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['post'], url_path='send-reminder')
    def send_reminder(self, request):
        raw_id = request.data.get('customerId') or request.data.get('customer')
        channel = (request.data.get('channel') or 'inapp').lower()
        message = (request.data.get('message') or '').strip()
        if not raw_id:
            return Response({'detail': 'customerId is required'}, status=status.HTTP_400_BAD_REQUEST)

        pk = str(raw_id).replace('cust_', '')
        try:
            customer = Customer.objects.get(pk=pk, owner=data_owner(request.user))
        except (Customer.DoesNotExist, ValueError):
            return Response({'detail': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

        title = f'Payment reminder — {customer.name}'
        body = message or (
            f'Reminder sent to {customer.name} for outstanding '
            f'₹{customer.current_balance} via {channel}.'
        )
        notif = Notification.objects.create(
            owner=data_owner(request.user),
            type=Notification.Type.PAYMENT_REMINDER,
            title=title,
            message=body,
            customer=customer,
            amount=customer.current_balance,
        )
        ActivityLog.objects.create(
            owner=data_owner(request.user),
            type='reminder',
            message=f'Reminder sent to {customer.name} via {channel}',
        )
        return Response({
            'notification': NotificationSerializer(notif).data,
            'channel': channel,
            'detail': 'Reminder recorded',
            'customer': {
                'id': customer.pk,
                'name': customer.name,
                'mobile': customer.mobile,
                'email': customer.email,
            },
            # Forever-free deep links (client opens WhatsApp / SMS / Mail)
            'free': True,
            'provider': 'native_deep_link',
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post', 'get'], url_path='sync')
    def sync(self, request):
        """Scan ledger and create missing alerts for the current user."""
        result = sync_notifications(data_owner(request.user))
        rows = NotificationSerializer(result['notifications'], many=True).data
        unread = self.get_queryset().filter(is_read=False).count()
        return Response({
            'created': result['created'],
            'unreadCount': unread,
            'notifications': rows,
            'ownerChannels': result.get('ownerChannels'),
        })

    @action(detail=False, methods=['post'], url_path='test-owner-alert')
    def test_owner_alert(self, request):
        """Force-send a test email/SMS to the logged-in shop owner (for setup checks)."""
        from .owner_channels import dispatch_owner_channels
        from accounts.models import BusinessSettings

        settings_obj, _ = BusinessSettings.objects.get_or_create(user=request.user)
        force = str(request.query_params.get('force') or request.data.get('force') or '').lower() in (
            '1', 'true', 'yes',
        )
        if force:
            settings_obj.email_notifications = True
            settings_obj.sms_notifications = True

        notif = Notification.objects.create(
            owner=data_owner(request.user),
            type=Notification.Type.PAYMENT_REMINDER,
            title='Test alert - Daily Ledger',
            message='Yeh test message hai. Agar yeh email/SMS mila to owner alerts theek kaam kar rahe hain.',
        )
        channels = dispatch_owner_channels(request.user, [notif], settings_obj)
        return Response({
            'detail': 'Test alert dispatched',
            'notification': NotificationSerializer(notif).data,
            'ownerChannels': channels,
            'hints': {
                'email': 'Check inbox + spam. SMTP must be in backend/.env (not .env.example).',
                'sms': 'Needs FAST2SMS_API_KEY in backend/.env and Fast2SMS wallet credit.',
            },
        }, status=status.HTTP_201_CREATED)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Notification created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'Notification updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Notification deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class ActivityLogViewSet(viewsets.ModelViewSet):
    """Activity feed — ModelSerializer + ModelViewSet."""

    serializer_class = ActivityLogSerializer
    http_method_names = ['get', 'post', 'head', 'options']
    pagination_class = None

    def get_queryset(self):
        return ActivityLog.objects.filter(
            owner=data_owner(self.request.user)
        ).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())[:50]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(owner=data_owner(self.request.user))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Activity created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'Activity updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Activity deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
