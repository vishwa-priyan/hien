import React, { useState, useEffect } from 'react';
import { ProductService } from '../../services/productService';
import { Product } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { Plus, Package, Edit3, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ProductCatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);

  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Consumer Electronics');
  const [brand, setBrand] = useState('');
  const [variant, setVariant] = useState('');
  const [sellingPrice, setSellingPrice] = useState('199.99');
  const [policy, setPolicy] = useState('Standard 30-day return policy. Mandatory QA sign-off.');
  const [checksText, setChecksText] = useState('Physical casing integrity check\nFunctional hardware response test\nSanitization verification');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80');

  const { showToast } = useToast();

  const loadProducts = async () => {
    setIsLoading(true);
    const data = await ProductService.getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingSku(null);
    setSku(`SKU-GEN-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory('Consumer Electronics');
    setBrand('');
    setVariant('Standard Edition');
    setSellingPrice('149.99');
    setPolicy('Standard 30-day return. Physical QA required.');
    setChecksText('Physical casing integrity check\nFunctional power & battery test\nFactory reset sanitization');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingSku(p.sku);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setBrand(p.brand);
    setVariant(p.variant);
    setSellingPrice(String(p.sellingPrice));
    setPolicy(p.returnEligibilityPolicy);
    setChecksText(p.inspectionRequirements.join('\n'));
    setImageUrl(p.imageUrl);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(sellingPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast({ title: 'Invalid Price', description: 'Price must be a valid positive number.', type: 'error' });
      return;
    }

    const checksArray = checksText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      if (editingSku) {
        await ProductService.updateProduct(editingSku, {
          name,
          category,
          brand,
          variant,
          sellingPrice: parsedPrice,
          returnEligibilityPolicy: policy,
          inspectionRequirements: checksArray,
          imageUrl,
        });
        showToast({ title: 'Product Updated', description: `${name} has been updated.`, type: 'success' });
      } else {
        await ProductService.createProduct({
          sku,
          name,
          category,
          brand,
          variant,
          sellingPrice: parsedPrice,
          originalPrice: Math.round(parsedPrice * 1.35),
          returnEligibilityPolicy: policy,
          inspectionRequirements: checksArray,
          active: true,
          imageUrl,
        });
        showToast({ title: 'Product Created', description: `SKU ${sku} added to catalog.`, type: 'success' });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));
  const filteredProducts = categoryFilter === 'all'
    ? products
    : products.filter(p => p.category === categoryFilter);

  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product Details',
      sortable: true,
      render: p => (
        <div className="flex items-center gap-3">
          <img
            src={p.imageUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
          />
          <div>
            <span className="font-semibold text-slate-900 block">{p.name}</span>
            <span className="text-[11px] text-slate-500">{p.brand} &bull; {p.variant}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: p => <span className="font-mono text-xs font-semibold text-blue-700">{p.sku}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: p => <span className="text-slate-700">{p.category}</span>,
    },
    {
      key: 'price',
      header: 'Resale Price',
      sortable: true,
      render: p => (
        <div>
          <span className="font-bold text-slate-900">${p.sellingPrice.toFixed(2)}</span>
          <span className="text-[10px] text-slate-400 block line-through">${p.originalPrice.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'inspectionRequirements',
      header: 'Mandatory QA Checks',
      render: p => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {p.inspectionRequirements.slice(0, 2).map((chk, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 truncate">
              {chk}
            </span>
          ))}
          {p.inspectionRequirements.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700">
              +{p.inspectionRequirements.length - 2} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: p => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEditModal(p)}
          leftIcon={<Edit3 className="w-3.5 h-3.5" />}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Product Catalog & QA Policies
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Define SKUs, category specifications, resale pricing, and required inspection checklists.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          Showing <strong>{filteredProducts.length}</strong> catalog items
        </span>
      </div>

      <Table
        columns={columns}
        data={filteredProducts}
        keyExtractor={p => p.sku}
        isLoading={isLoading}
        searchKeys={['name', 'sku', 'brand', 'category']}
        searchPlaceholder="Search catalog by name, brand, or SKU..."
        pageSize={8}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSku ? `Edit Product: ${editingSku}` : 'Register New Catalog Product'}
        description="Configure item parameters, inspection requirements, and return policies."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="SKU Identifier *"
              required
              disabled={Boolean(editingSku)}
              value={sku}
              onChange={e => setSku(e.target.value)}
            />
            <Input
              label="Product Name *"
              required
              placeholder="e.g. ProAcoustic SoundStation 5"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Category *"
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
            <Input
              label="Brand *"
              required
              value={brand}
              onChange={e => setBrand(e.target.value)}
            />
            <Input
              label="Variant / Spec"
              value={variant}
              onChange={e => setVariant(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Resale Target Price ($) *"
              required
              type="number"
              step="0.01"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
            />
            <Input
              label="Product Image URL"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Physical QA Checks (One checkpoint per line) *
            </label>
            <textarea
              rows={4}
              required
              value={checksText}
              onChange={e => setChecksText(e.target.value)}
              className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950"
              placeholder="e.g. Battery life test&#10;Packaging integrity check&#10;Display backlight scan"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Inspectors must sign off 100% of mandatory checks before the item can enter sellable stock.
            </p>
          </div>

          <Input
            label="Return Eligibility Policy"
            value={policy}
            onChange={e => setPolicy(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingSku ? 'Save Changes' : 'Add to Catalog'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
