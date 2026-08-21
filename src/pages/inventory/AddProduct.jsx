import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { emptyProduct } from '../../data/inventoryDefaults';
import { booksList } from '../../api/books';
import { Breadcrumbs, Card } from '../../components/ui';
import ProductForm from './ProductForm';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function AddProduct() {
  const { categories, brands, suppliers, addProduct } = useInventory();
  const [form, setForm] = useState({ ...emptyProduct });
  const [units, setUnits] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    booksList('units').then((d) => setUnits(Array.isArray(d) ? d : d?.results || [])).catch(() => setUnits([]));
    booksList('godowns').then((d) => setGodowns(Array.isArray(d) ? d : d?.results || [])).catch(() => setGodowns([]));
    booksList('item-groups').then((d) => setItemGroups(Array.isArray(d) ? d : d?.results || [])).catch(() => setItemGroups([]));
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (form.purchasePrice !== '' && Number(form.purchasePrice) < 0) errs.purchasePrice = 'Invalid price';
    if (form.sellingPrice !== '' && Number(form.sellingPrice) < 0) errs.sellingPrice = 'Invalid price';
    if (form.stockQty !== '' && Number(form.stockQty) < 0) errs.stockQty = 'Invalid stock';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const product = await addProduct(form);
      toast.success(getApiMessage(product, 'Product added'));
      navigate(`/inventory/${product.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Add Product' }]} />
      <div className="flex items-center gap-3">
        <Link to="/inventory" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Add Product</h1>
          <p className="text-sm text-muted">Create a new inventory item</p>
        </div>
      </div>

      <Card>
        <ProductForm
          form={form}
          setForm={setForm}
          errors={errors}
          categories={categories}
          brands={brands}
          itemGroups={itemGroups}
          suppliers={suppliers}
          units={units}
          godowns={godowns}
          loading={loading}
          submitLabel="Save Product"
          showOpeningStock
          onSubmit={handleSubmit}
          onCancel={() => navigate('/inventory')}
        />
      </Card>
    </div>
  );
}
