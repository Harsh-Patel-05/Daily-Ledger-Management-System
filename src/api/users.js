import { api, fetchAll } from './client';
import { toPk } from './ids';

function stripId(id) {
  return toPk(id) ?? id;
}

export function toUserPayload(data) {
  const payload = {
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    role: data.role || 'staff',
    status: data.status || 'active',
  };
  if (data.password) payload.password = data.password;
  return payload;
}

export function toRolePayload(data) {
  return {
    name: data.name,
    description: data.description || '',
  };
}

export function toPermissionPayload(data) {
  return {
    module: data.module,
    view: Boolean(data.view),
    create: Boolean(data.create),
    edit: Boolean(data.edit),
    delete: Boolean(data.delete),
  };
}

export function listUsers(params = '') {
  return fetchAll(`/auth/users/${params ? `?${params}` : ''}`);
}

export function createUser(data) {
  return api.post('/auth/users/', toUserPayload(data));
}

export function updateUser(id, data) {
  return api.patch(`/auth/users/${stripId(id)}/`, toUserPayload(data));
}

export function deleteUser(id) {
  return api.delete(`/auth/users/${stripId(id)}/`);
}

export function listRoles(params = '') {
  return fetchAll(`/auth/roles/${params ? `?${params}` : ''}`);
}

export function createRole(data) {
  return api.post('/auth/roles/', toRolePayload(data));
}

export function updateRole(id, data) {
  return api.patch(`/auth/roles/${stripId(id)}/`, toRolePayload(data));
}

export function deleteRole(id) {
  return api.delete(`/auth/roles/${stripId(id)}/`);
}

export function listPermissions(params = '') {
  return fetchAll(`/auth/permissions/${params ? `?${params}` : ''}`);
}

export function createPermission(data) {
  return api.post('/auth/permissions/', toPermissionPayload(data));
}

export function updatePermission(id, data) {
  return api.patch(`/auth/permissions/${stripId(id)}/`, toPermissionPayload(data));
}

export function deletePermission(id) {
  return api.delete(`/auth/permissions/${stripId(id)}/`);
}
