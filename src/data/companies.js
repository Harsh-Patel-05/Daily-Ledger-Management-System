export const GST_STATE_CODES = {
  '01': 'JAMMU AND KASHMIR',
  '02': 'HIMACHAL PRADESH',
  '03': 'PUNJAB',
  '04': 'CHANDIGARH',
  '05': 'UTTARAKHAND',
  '06': 'HARYANA',
  '07': 'DELHI',
  '08': 'RAJASTHAN',
  '09': 'UTTAR PRADESH',
  '10': 'BIHAR',
  '11': 'SIKKIM',
  '12': 'ARUNACHAL PRADESH',
  '13': 'NAGALAND',
  '14': 'MANIPUR',
  '15': 'MIZORAM',
  '16': 'TRIPURA',
  '17': 'MEGHALAYA',
  '18': 'ASSAM',
  '19': 'WEST BENGAL',
  '20': 'JHARKHAND',
  '21': 'ODISHA',
  '22': 'CHHATTISGARH',
  '23': 'MADHYA PRADESH',
  '24': 'GUJARAT',
  '25': 'DAMAN AND DIU',
  '26': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  '27': 'MAHARASHTRA',
  '29': 'KARNATAKA',
  '30': 'GOA',
  '31': 'LAKSHADWEEP',
  '32': 'KERALA',
  '33': 'TAMIL NADU',
  '34': 'PUDUCHERRY',
  '35': 'ANDAMAN AND NICOBAR ISLANDS',
  '36': 'TELANGANA',
  '37': 'ANDHRA PRADESH',
  '38': 'LADAKH',
};

export const INDIAN_STATES = [...new Set(Object.values(GST_STATE_CODES))].sort();

export const ORGANIZATION_TYPES = [
  'Proprietorship',
  'Partnership',
  'Public Limited Company',
  'Private Limited Company',
  'LLP',
  'HUF',
  'Trust',
  'Society',
  'Government',
];

export const REGISTRATION_TYPES = [
  'Regular (With GST)',
  'Composition',
  'Unregistered',
  'Consumer',
];

export const PARTY_TYPES = ['Not Applicable', 'SEZ', 'Deemed Export', 'Embassy'];

export const BUSINESS_TYPES = [
  'Retailer',
  'Wholesaler',
  'Manufacturer',
  'Distributor',
  'Service Provider',
  'Trader',
  'Exporter',
  'Importer',
];

export const INDUSTRY_TYPES = [
  'Electricals',
  'Electronics',
  'FMCG',
  'Textile',
  'Construction',
  'Automobile',
  'Healthcare',
  'IT / Software',
  'Agriculture',
  'Other',
];

export const COUNTRIES = ['India'];

export function emptyCompany(overrides = {}) {
  return {
    name: '',
    alias: '',
    gstin: '',
    pan: '',
    registrationType: 'Regular (With GST)',
    partyType: 'Not Applicable',
    gstApplicableFrom: '',
    legalName: '',
    organizationType: '',
    businessType: '',
    industryType: '',
    addressLine1: '',
    addressLine2: '',
    country: 'India',
    pincode: '',
    state: '',
    city: '',
    phone: '',
    mobile: '',
    fax: '',
    email: '',
    website: '',
    establishDate: '',
    logo: '',
    signature: '',
    customFields: [],
    ownership: 'own',
    subscriptionStatus: 'Active',
    ...overrides,
  };
}

export function normalizeGstin(value = '') {
  return String(value).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
}

export function validateGstin(value) {
  const gstin = normalizeGstin(value);
  const stateCode = gstin.slice(0, 2);
  const panPart = gstin.slice(2, 12);
  const checks = {
    length15: gstin.length === 15,
    stateCode: Boolean(GST_STATE_CODES[stateCode]),
    panFormat: /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panPart),
    portalActive: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin),
  };
  return {
    gstin,
    checks,
    valid: checks.length15 && checks.stateCode && checks.panFormat && checks.portalActive,
    state: GST_STATE_CODES[stateCode] || '',
    pan: checks.panFormat ? panPart : '',
  };
}

export function companyFromGstin(gstin, extras = {}) {
  const result = validateGstin(gstin);
  return emptyCompany({
    gstin: result.gstin,
    pan: result.pan,
    state: result.state,
    registrationType: 'Regular (With GST)',
    country: 'India',
    ownership: 'own',
    subscriptionStatus: 'Active',
    ...extras,
  });
}

export function formatDisplayDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function isDuplicateAlias(companies, name, alias, excludeId) {
  const n = (name || '').trim().toLowerCase();
  const a = (alias || '').trim().toLowerCase();
  if (!n || !a) return false;
  return companies.some(
    (c) =>
      String(c.id) !== String(excludeId) &&
      (c.name || '').trim().toLowerCase() === n &&
      (c.alias || '').trim().toLowerCase() === a
  );
}
