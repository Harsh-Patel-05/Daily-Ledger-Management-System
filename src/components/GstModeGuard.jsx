import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCompanies } from '../context/CompaniesContext';
import { isGstOnlyPath } from '../utils/companyGst';

/** Redirect away from GST-only routes when active company is Unregistered / Non-GST. */
export default function GstModeGuard({ children }) {
  const { isGstEnabled, loading } = useCompanies();
  const location = useLocation();

  useEffect(() => {
    // no-op; Navigate handles redirect
  }, [isGstEnabled, location.pathname]);

  if (loading) return children;
  if (!isGstEnabled && isGstOnlyPath(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
