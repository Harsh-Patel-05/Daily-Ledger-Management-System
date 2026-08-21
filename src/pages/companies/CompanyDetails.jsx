import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaEdit, FaTrash, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaIdCard, FaGlobe, FaBuilding, FaCalendarAlt, FaIndustry,
} from 'react-icons/fa';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import {
  Breadcrumbs, Card, CardHeader, Button, Avatar, Badge,
  ConfirmationDialog, StatCard,
} from '../../components/ui';
import { formatPhone } from '../../utils/formatters';
import { getStatusColor } from '../../utils/helpers';
import { formatDisplayDate } from '../../data/companies';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function CompanyDetails() {
  const { id } = useParams();
  const { getById, removeCompany } = useCompanies();
  const toast = useToast();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const company = getById(id);

  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-2">Company not found</p>
        <Link to="/companies" className="text-primary text-sm">Back to companies</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      const __apiRes = await removeCompany(id);
      toast.success(getApiMessage(__apiRes, 'Company deleted'));
      navigate('/companies');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  const address = [company.addressLine1, company.addressLine2, company.city, company.state, company.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Companies', to: '/companies' },
        { label: company.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/companies" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <FaArrowLeft size={14} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Company Profile</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/companies/${id}/edit`}>
            <Button variant="outline" size="sm"><FaEdit size={12} /> Edit</Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <FaTrash size={12} /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={company.name} src={company.logo || undefined} size="lg" rounded="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white truncate">{company.name}</h2>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(company.subscriptionStatus)}`}>
                {company.subscriptionStatus || 'Active'}
              </span>
              <Badge variant={(company.ownership || 'own') === 'own' ? 'primary' : 'default'}>
                {(company.ownership || 'own') === 'own' ? 'Own' : 'Managed'}
              </Badge>
            </div>
            <p className="text-sm text-muted mt-1">{company.legalName || company.organizationType || 'No legal name on file'}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="GSTIN" value={company.gstin || 'Not registered'} icon={FaIdCard} color="blue" />
        <StatCard title="Organization" value={company.organizationType || '—'} icon={FaBuilding} color="purple" />
        <StatCard title="Industry" value={company.industryType || '—'} icon={FaIndustry} color="amber" />
        <StatCard title="Established" value={formatDisplayDate(company.establishDate)} icon={FaCalendarAlt} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Contact" />
          <ul className="space-y-3 text-sm">
            <InfoRow icon={FaPhone} label="Mobile" value={formatPhone(company.mobile)} />
            <InfoRow icon={FaPhone} label="Phone" value={company.phone || '—'} />
            <InfoRow icon={FaEnvelope} label="Email" value={company.email || '—'} />
            <InfoRow icon={FaGlobe} label="Website" value={company.website || '—'} />
          </ul>
        </Card>
        <Card>
          <CardHeader title="Address" />
          <div className="flex items-start gap-3 text-sm">
            <FaMapMarkerAlt className="mt-0.5 text-slate-400 shrink-0" />
            <p className="text-slate-700 dark:text-slate-200">{address || 'No address added yet'}</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Registration</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{company.registrationType || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">PAN</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{company.pan || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Business type</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{company.businessType || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Alias</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{company.alias || '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {(company.signature || (company.customFields || []).length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {company.signature && (
            <Card>
              <CardHeader title="Signature" />
              <img src={company.signature} alt="Signature" className="h-16 object-contain" />
            </Card>
          )}
          {(company.customFields || []).length > 0 && (
            <Card>
              <CardHeader title="Custom fields" />
              <dl className="space-y-2">
                {company.customFields.map((f) => (
                  <div key={f.id} className="flex justify-between gap-3 text-sm">
                    <dt className="text-muted">{f.label || 'Untitled'}</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-100">{f.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      )}

      <ConfirmationDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
        <Icon size={12} />
      </span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </li>
  );
}
