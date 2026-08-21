from django.contrib import admin
from .models import (
    AccountGroup,
    LedgerAccount,
    BankAccount,
    Transporter,
    Unit,
    HsnCode,
    Godown,
    ItemGroup,
    Voucher,
    VoucherLine,
    JournalEntry,
    ContraEntry,
    BankReconciliation,
    StockJournal,
    DocumentSeries,
    PrintTemplate,
)


class VoucherLineInline(admin.TabularInline):
    model = VoucherLine
    extra = 0


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ['number', 'doc_type', 'party', 'amount', 'gst_type', 'status', 'date']
    list_filter = ['doc_type', 'gst_type', 'status']
    inlines = [VoucherLineInline]


admin.site.register(AccountGroup)
admin.site.register(LedgerAccount)
admin.site.register(BankAccount)
admin.site.register(Transporter)
admin.site.register(Unit)
admin.site.register(HsnCode)
admin.site.register(Godown)
admin.site.register(ItemGroup)
admin.site.register(VoucherLine)
admin.site.register(JournalEntry)
admin.site.register(ContraEntry)
admin.site.register(BankReconciliation)
admin.site.register(StockJournal)
admin.site.register(DocumentSeries)
admin.site.register(PrintTemplate)
