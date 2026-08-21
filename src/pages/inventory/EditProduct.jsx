import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { booksList } from '../../api/books';
import { Breadcrumbs, Card } from '../../components/ui';
import ProductForm from './ProductForm';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function EditProduct() {
  const { id } = useParams();
  const { categories, brands, suppliers, getProduct, updateProduct } = useInventory();
  const product = getProduct(id);
  const [form, setForm] = useState(null);
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

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        brandId: product.brandId != null && product.brandId !== '' ? String(product.brandId) : '',
        categoryId: product.categoryId != null && product.categoryId !== '' ? String(product.categoryId) : '',
        itemGroupId: product.itemGroupId != null && product.itemGroupId !== '' ? String(product.itemGroupId) : '',
        supplierId: product.supplierId != null && product.supplierId !== '' ? String(product.supplierId) : '',
        unitId: product.unitId != null && product.unitId !== '' ? String(product.unitId) : '',
        alternateUnits: (product.alternateUnits || []).map((u) => ({
          unitId: String(u.unitId),
          conversionFactor: u.conversionFactor ?? 1,
          barcode: u.barcode || '',
        })),
        description: product.description || '',
        purchaseDate: product.purchaseDate || '',
        purchasePrice: product.purchasePrice,
        purchasePriceWithGst: product.purchasePriceWithGst ?? product.purchasePrice,
        sellingPrice: product.sellingPrice,
        sellingPriceWithGst: product.sellingPriceWithGst ?? product.sellingPrice,
        taxRate: product.taxRate,
        purchasedQuantity: product.purchasedQuantity ?? 0,
        reorderLevel: product.reorderLevel ?? 0,
        status: product.status || 'active',
      });
    }
  }, [product]);

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-2">Product not found</p>
        <Link to="/inventory" className="text-primary text-sm">Back to inventory</Link>
      </div>
    );
  }

  if (!form) return null;

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (Number(form.purchasePrice) < 0) errs.purchasePrice = 'Invalid price';
    if (Number(form.sellingPrice) < 0) errs.sellingPrice = 'Invalid price';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const __apiRes = await updateProduct(id, form);
      toast.success(getApiMessage(__apiRes, 'Product updated'));
      navigate(`/inventory/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs items={[
        { label: 'Inventory', to: '/inventory' },
        { label: product.name, to: `/inventory/${id}` },
        { label: 'Edit' },
      ]} />
      <div className="flex items-center gap-3">
        <Link to={`/inventory/${id}`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Product</h1>
          <p className="text-sm text-muted">Update product details (use Stock page for qty changes)</p>
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
          submitLabel="Update Product"
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/inventory/${id}`)}
        />
      </Card>
    </div>
  );
}
