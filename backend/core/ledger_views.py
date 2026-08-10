from rest_framework import viewsets
from accounts.ownership import data_owner
from notifications.models import ActivityLog
from .models import OpeningBalance
from .serializers import OpeningBalanceSerializer


class OpeningBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = OpeningBalanceSerializer
    search_fields = ['party_name', 'party_type']
    ordering_fields = ['as_of', 'amount', 'created_at']
    ordering = ['-as_of', '-created_at']

    def get_queryset(self):
        return OpeningBalance.objects.filter(
            owner=data_owner(self.request.user)
        ).select_related('customer')

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        ob = serializer.save(owner=owner)
        ActivityLog.objects.create(
            owner=owner,
            type='ledger',
            message=f'Opening balance: {ob.party_name} · {ob.type} ₹{ob.amount}',
        )

    def perform_destroy(self, instance):
        name = instance.party_name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='ledger',
            message=f'Opening balance deleted: {name}',
        )
