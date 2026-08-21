import { api, fetchAll } from './client';

function pick(data, ...keys) {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
  }
  return undefined;
}

export function toCompanyPayload(data) {
  const parentId = pick(data, 'parentId', 'parent_id', 'parent');
  return {
    name: data.name,
    alias: data.alias || '',
    gstin: data.gstin || '',
    pan: data.pan || '',
    registration_type: pick(data, 'registrationType', 'registration_type') || 'Regular (With GST)',
    party_type: pick(data, 'partyType', 'party_type') || 'Not Applicable',
    gst_applicable_from: pick(data, 'gstApplicableFrom', 'gst_applicable_from') || null,
    legal_name: pick(data, 'legalName', 'legal_name') || '',
    organization_type: pick(data, 'organizationType', 'organization_type') || '',
    business_type: pick(data, 'businessType', 'business_type') || '',
    industry_type: pick(data, 'industryType', 'industry_type') || '',
    address_line1: pick(data, 'addressLine1', 'address_line1') || '',
    address_line2: pick(data, 'addressLine2', 'address_line2') || '',
    country: data.country || 'India',
    pincode: data.pincode || '',
    state: data.state || '',
    city: data.city || '',
    phone: data.phone || '',
    mobile: data.mobile || '',
    fax: data.fax || '',
    email: data.email || '',
    website: data.website || '',
    establish_date: pick(data, 'establishDate', 'establish_date') || null,
    custom_fields: pick(data, 'customFields', 'custom_fields') || [],
    ownership: data.ownership || 'own',
    subscription_status: pick(data, 'subscriptionStatus', 'subscription_status') || 'Active',
    is_default: Boolean(pick(data, 'isDefault', 'is_default')),
    parentId: parentId != null && parentId !== '' ? Number(parentId) : undefined,
  };
}

export function normalizeCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parentId ?? row.parent_id ?? row.parent ?? null,
    isPrimary: Boolean(row.isPrimary ?? row.is_primary),
    hasGst: (() => {
      if (row.hasGst === false || row.has_gst === false) return false;
      if (row.hasGst === true || row.has_gst === true) return true;
      const reg = String(row.registrationType || row.registration_type || '').toLowerCase();
      if (reg.includes('unregistered') || reg.includes('without')) return false;
      return Boolean(row.gstin);
    })(),
    subCompanyCount: row.subCompanyCount ?? row.sub_company_count ?? 0,
    name: row.name || '',
    alias: row.alias || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    registrationType: row.registrationType || row.registration_type || '',
    partyType: row.partyType || row.party_type || '',
    gstApplicableFrom: row.gstApplicableFrom || row.gst_applicable_from || '',
    legalName: row.legalName || row.legal_name || '',
    organizationType: row.organizationType || row.organization_type || '',
    businessType: row.businessType || row.business_type || '',
    industryType: row.industryType || row.industry_type || '',
    addressLine1: row.addressLine1 || row.address_line1 || '',
    addressLine2: row.addressLine2 || row.address_line2 || '',
    country: row.country || 'India',
    pincode: row.pincode || '',
    state: row.state || '',
    city: row.city || '',
    phone: row.phone || '',
    mobile: row.mobile || '',
    fax: row.fax || '',
    email: row.email || '',
    website: row.website || '',
    establishDate: row.establishDate || row.establish_date || '',
    logo: row.logo || '',
    signature: row.signature || '',
    customFields: row.customFields || row.custom_fields || [],
    ownership: row.ownership || 'own',
    subscriptionStatus: row.subscriptionStatus || row.subscription_status || 'Active',
    isDefault: row.isDefault ?? row.is_default ?? false,
    fiscalYears: (row.fiscal_years || []).map((fy) => ({
      id: fy.id,
      label: fy.label,
      startDate: fy.start_date,
      endDate: fy.end_date,
      isActive: fy.is_active,
    })),
  };
}

export function listCompanies() {
  return fetchAll('/companies/').then((rows) => rows.map(normalizeCompany));
}

export function getCompany(id) {
  return api.get(`/companies/${id}/`).then(normalizeCompany);
}

export function createCompany(data) {
  return api.post('/companies/', toCompanyPayload(data)).then(normalizeCompany);
}

export function updateCompany(id, data) {
  return api.patch(`/companies/${id}/`, toCompanyPayload(data)).then(normalizeCompany);
}

export function deleteCompany(id) {
  return api.delete(`/companies/${id}/`);
}

export function setDefaultCompany(id) {
  return api.post(`/companies/${id}/set_default/`).then(normalizeCompany);
}

export function listFiscalYears(companyId) {
  return api.get(`/companies/${companyId}/fiscal-years/`);
}

export function createFiscalYear(companyId, label) {
  return api.post(`/companies/${companyId}/fiscal-years/`, { label, is_active: true });
}
