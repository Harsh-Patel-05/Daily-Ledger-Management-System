import CrudListPage from '../../components/pages/CrudListPage';
import PageHeader from '../../components/pages/PageHeader';
import { useLocalModules } from '../../context/LocalModulesContext';
import { Card, Table } from '../../components/ui';

export function UsersPage() {
  const { users } = useLocalModules();
  return (
    <CrudListPage
      title="Users"
      subtitle="Staff accounts (API)"
      breadcrumbs={[{ label: 'Users & Roles', to: '/users' }, { label: 'Users' }]}
      externalCollection={users}
      addLabel="Add User"
      searchKeys={['name', 'email', 'role']}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'email', label: 'Email', required: true },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          required: ({ editing }) => !editing,
          placeholder: ({ editing }) => (editing ? 'Leave blank to keep current' : 'Min 6 characters'),
        },
        { key: 'phone', label: 'Phone' },
        {
          key: 'role',
          label: 'Role',
          type: 'select',
          options: [
            { value: 'owner', label: 'Owner' },
            { value: 'staff', label: 'Staff' },
            { value: 'accountant', label: 'Accountant' },
          ],
          defaultValue: 'staff',
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
          defaultValue: 'active',
        },
      ]}
    />
  );
}

export function RolesPage() {
  const { roles } = useLocalModules();
  return (
    <CrudListPage
      title="Roles"
      subtitle="Access roles for your team (API)"
      breadcrumbs={[{ label: 'Users & Roles', to: '/users' }, { label: 'Roles' }]}
      externalCollection={roles}
      addLabel="Add Role"
      searchKeys={['name', 'description']}
      fields={[
        { key: 'name', label: 'Role Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

export function PermissionsPage() {
  const { permissions } = useLocalModules();

  const toggle = (id, key) => {
    const row = permissions.items.find((r) => r.id === id);
    if (!row) return;
    // Merges with existing row and PATCHes view/create/edit/delete to API
    permissions.update(id, { [key]: !row[key] });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Permissions"
        subtitle="Module access matrix (API)"
        breadcrumbs={[{ label: 'Users & Roles', to: '/users' }, { label: 'Permissions' }]}
      />
      <Card>
        <Table
          columns={[
            { key: 'module', label: 'Module' },
            {
              key: 'view',
              label: 'View',
              render: (v, row) => (
                <input type="checkbox" checked={!!v} onChange={() => toggle(row.id, 'view')} />
              ),
            },
            {
              key: 'create',
              label: 'Create',
              render: (v, row) => (
                <input type="checkbox" checked={!!v} onChange={() => toggle(row.id, 'create')} />
              ),
            },
            {
              key: 'edit',
              label: 'Edit',
              render: (v, row) => (
                <input type="checkbox" checked={!!v} onChange={() => toggle(row.id, 'edit')} />
              ),
            },
            {
              key: 'delete',
              label: 'Delete',
              render: (v, row) => (
                <input type="checkbox" checked={!!v} onChange={() => toggle(row.id, 'delete')} />
              ),
            },
          ]}
          data={permissions.items}
        />
      </Card>
    </div>
  );
}
