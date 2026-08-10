import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { Breadcrumbs, Card } from '../../components/ui';
import ProductForm from './ProductForm';

export default function EditProduct() {
  const { id } = useParams();
  const { categories, suppliers, products, getProduct, updateProduct } = useInventory();
  const product = getProduct(id);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        categoryId: product.categoryId != null && product.categoryId !== '' ? String(product.categoryId) : '',
        supplierId: product.supplierId != null && product.supplierId !== '' ? String(product.supplierId) : '',
        description: product.description || '',
        purchaseDate: product.purchaseDate || '',
        purchasePrice: product.purchasePrice,
        purchasePriceWithGst: product.purchasePriceWithGst ?? product.purchasePrice,
        sellingPrice: product.sellingPrice,
        sellingPriceWithGst: product.sellingPriceWithGst ?? product.sellingPrice,
        taxRate: product.taxRate,
        reorderLevel: product.reorderLevel,
        reorderQty: product.reorderQty,
        location: product.location || '',
        status: product.status || 'active',
        hsn: product.hsn || '',
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
    if (
      form.sku?.trim() &&
      products.some(
        (p) =>
          String(p.id) !== String(id) &&
          p.sku &&
          p.sku.toLowerCase() === form.sku.trim().toLowerCase()
      )
    ) {
      errs.sku = 'SKU already exists';
    }
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
      await updateProduct(id, form);
      toast.success('Product updated');
      navigate(`/inventory/${id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update');
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
          suppliers={suppliers}
          loading={loading}
          submitLabel="Update Product"
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/inventory/${id}`)}
        />
      </Card>
    </div>
  );
}
