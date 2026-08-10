import { api, fetchAll } from './client';
import { toPk } from './ids';

function stripId(id) {
  return toPk(id) ?? id;
}

export function toOpeningBalancePayload(data) {
  return {
    partyType: data.partyType || '',
    partyName: data.partyName || '',
    customerId: data.customerId ? stripId(data.customerId) : null,
    amount: Number(data.amount) || 0,
    type: data.type || '',
    asOf: data.asOf,
  };
}

export function listOpeningBalances(params = '') {
  return fetchAll(`/opening-balances/${params ? `?${params}` : ''}`);
}

export function createOpeningBalance(data) {
  return api.post('/opening-balances/', toOpeningBalancePayload(data));
}

export function updateOpeningBalance(id, data) {
  return api.patch(`/opening-balances/${stripId(id)}/`, toOpeningBalancePayload(data));
}

export function deleteOpeningBalance(id) {
  return api.delete(`/opening-balances/${stripId(id)}/`);
}
