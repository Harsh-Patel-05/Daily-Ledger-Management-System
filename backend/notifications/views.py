from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters import rest_framework as filters
from .models import Notification, ActivityLog
from .serializers import NotificationSerializer, ActivityLogSerializer


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
        return Notification.objects.filter(owner=self.request.user).select_related('customer')

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('notif_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('notif_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

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


class ActivityLogListView(APIView):
    def get(self, request):
        qs = ActivityLog.objects.filter(owner=request.user)[:50]
        return Response(ActivityLogSerializer(qs, many=True).data)
