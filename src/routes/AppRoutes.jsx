import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';

import Login from '../pages/auth/Login';
import SignUp from '../pages/auth/SignUp';
import ForgotPassword from '../pages/auth/ForgotPassword';
import OTPVerification from '../pages/auth/OTPVerification';
import ResetPassword from '../pages/auth/ResetPassword';

import Dashboard from '../pages/Dashboard';
import CustomerList from '../pages/customers/CustomerList';
import AddCustomer from '../pages/customers/AddCustomer';
import EditCustomer from '../pages/customers/EditCustomer';
import CustomerDetails from '../pages/customers/CustomerDetails';
import TransactionList from '../pages/transactions/TransactionList';
import AddTransaction from '../pages/transactions/AddTransaction';
import InvoiceList from '../pages/invoices/InvoiceList';
import CreateInvoice from '../pages/invoices/CreateInvoice';
import InvoiceView from '../pages/invoices/InvoiceView';
import UploadInvoice from '../pages/invoices/UploadInvoice';
import Ledger from '../pages/Ledger';
import Reports from '../pages/Reports';
import Analytics from '../pages/Analytics';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import ProductList from '../pages/inventory/ProductList';
import AddProduct from '../pages/inventory/AddProduct';
import EditProduct from '../pages/inventory/EditProduct';
import ProductDetails from '../pages/inventory/ProductDetails';
import Categories from '../pages/inventory/Categories';
import Suppliers from '../pages/inventory/Suppliers';
import StockMovements from '../pages/inventory/StockMovements';
import LowStock from '../pages/inventory/LowStock';
import StockAdjustment from '../pages/inventory/StockAdjustment';
import Outstanding from '../pages/parties/Outstanding';
import SalesPayments from '../pages/sales/SalesPayments';
import SalesReturns from '../pages/sales/SalesReturns';
import PurchaseBills from '../pages/purchase/PurchaseBills';
import PurchasePayments from '../pages/purchase/PurchasePayments';
import PurchaseReturns from '../pages/purchase/PurchaseReturns';
import PaymentHistory, { PaymentIn, PaymentOut } from '../pages/payments/PaymentPages';
import {
  CashBook, DayBook, OpeningBalancePage, ClosingBalance,
} from '../pages/ledger/AccountingPages';
import {
  ExpenseCategories, ExpenseList, ExpenseReports,
} from '../pages/expenses/ExpensePages';
import {
  GstDashboard, GstSummary, HsnSacSummary, TaxSummary, GstSales, GstPurchase,
} from '../pages/gst/GstPages';
import {
  ReportsHub, SalesReports, PurchaseReports, PaymentReports, OutstandingReports,
  InventoryReports, ExpenseReportPage, ProfitLossSummary, GstReports,
} from '../pages/reports/ReportPages';
import { UsersPage, RolesPage, PermissionsPage } from '../pages/users/UserPages';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OTPVerification />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Parties */}
        <Route path="/parties/customers" element={<CustomerList />} />
        <Route path="/parties/suppliers" element={<Suppliers />} />
        <Route path="/parties/outstanding" element={<Outstanding />} />
        <Route path="/customers" element={<Navigate to="/parties/customers" replace />} />
        <Route path="/customers/add" element={<AddCustomer />} />
        <Route path="/customers/:id" element={<CustomerDetails />} />
        <Route path="/customers/:id/edit" element={<EditCustomer />} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<ProductList />} />
        <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />
        <Route path="/inventory/add" element={<AddProduct />} />
        <Route path="/inventory/categories" element={<Categories />} />
        <Route path="/inventory/suppliers" element={<Navigate to="/parties/suppliers" replace />} />
        <Route path="/inventory/stock" element={<StockMovements />} />
        <Route path="/inventory/low-stock" element={<LowStock />} />
        <Route path="/inventory/stock-adjustment" element={<StockAdjustment />} />
        <Route path="/inventory/:id" element={<ProductDetails />} />
        <Route path="/inventory/:id/edit" element={<EditProduct />} />

        {/* Sales */}
        <Route path="/sales/invoices" element={<InvoiceList />} />
        <Route path="/sales/payments" element={<SalesPayments />} />
        <Route path="/sales/returns" element={<SalesReturns />} />
        <Route path="/invoices" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="/invoices/create" element={<CreateInvoice />} />
        <Route path="/invoices/upload" element={<UploadInvoice />} />
        <Route path="/invoices/:id" element={<InvoiceView />} />

        {/* Purchase */}
        <Route path="/purchase/bills" element={<PurchaseBills />} />
        <Route path="/purchase/payments" element={<PurchasePayments />} />
        <Route path="/purchase/returns" element={<PurchaseReturns />} />

        {/* Payments */}
        <Route path="/payments/in" element={<PaymentIn />} />
        <Route path="/payments/out" element={<PaymentOut />} />
        <Route path="/payments/history" element={<PaymentHistory />} />

        {/* Ledger */}
        <Route path="/ledger/party" element={<Ledger />} />
        <Route path="/ledger" element={<Navigate to="/ledger/party" replace />} />
        <Route path="/ledger/cash-book" element={<CashBook />} />
        <Route path="/ledger/day-book" element={<DayBook />} />
        <Route path="/ledger/opening-balance" element={<OpeningBalancePage />} />
        <Route path="/ledger/closing-balance" element={<ClosingBalance />} />

        {/* Expenses */}
        <Route path="/expenses/categories" element={<ExpenseCategories />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/reports" element={<ExpenseReports />} />

        {/* GST */}
        <Route path="/gst" element={<GstDashboard />} />
        <Route path="/gst/summary" element={<GstSummary />} />
        <Route path="/gst/hsn-sac" element={<HsnSacSummary />} />
        <Route path="/gst/tax-summary" element={<TaxSummary />} />
        <Route path="/gst/sales" element={<GstSales />} />
        <Route path="/gst/purchase" element={<GstPurchase />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsHub />} />
        <Route path="/reports/sales" element={<SalesReports />} />
        <Route path="/reports/purchase" element={<PurchaseReports />} />
        <Route path="/reports/payments" element={<PaymentReports />} />
        <Route path="/reports/outstanding" element={<OutstandingReports />} />
        <Route path="/reports/inventory" element={<InventoryReports />} />
        <Route path="/reports/expenses" element={<ExpenseReportPage />} />
        <Route path="/reports/profit-loss" element={<ProfitLossSummary />} />
        <Route path="/reports/gst" element={<GstReports />} />
        <Route path="/reports/classic" element={<Reports />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* Users */}
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/roles" element={<RolesPage />} />
        <Route path="/users/permissions" element={<PermissionsPage />} />

        {/* Settings */}
        <Route path="/settings" element={<Navigate to="/settings/business" replace />} />
        <Route path="/settings/:section" element={<Settings />} />

        {/* Legacy */}
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/transactions/add" element={<AddTransaction />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
