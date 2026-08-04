import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';

import Login from '../pages/auth/Login';
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
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OTPVerification />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/add" element={<AddCustomer />} />
        <Route path="/customers/:id" element={<CustomerDetails />} />
        <Route path="/customers/:id/edit" element={<EditCustomer />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/transactions/add" element={<AddTransaction />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/create" element={<CreateInvoice />} />
        <Route path="/invoices/upload" element={<UploadInvoice />} />
        <Route path="/invoices/:id" element={<InvoiceView />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
