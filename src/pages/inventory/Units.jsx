import CrudListPage from '../../components/pages/CrudListPage';
import { useLocalModules } from '../../context/LocalModulesContext';

export default function Units() {
  const { units } = useLocalModules();

  return (
    <CrudListPage
      title="Units"
      subtitle="Measurement units used on products"
      breadcrumbs={[{ label: 'Inventory', to: '/inventory/products' }, { label: 'Units' }]}
      externalCollection={units}
      addLabel="Add Unit"
      searchKeys={['name', 'shortName']}
      fields={[
        { key: 'name', label: 'Unit Name', required: true },
        { key: 'shortName', label: 'Short Name', required: true },
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
      emptyTitle="No units yet"
      emptyDescription="Add units like Pcs, Kg, Ltr — they appear on product forms."
    />
  );
}
