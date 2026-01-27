
import React, { useState, useEffect } from 'react';
import type { ProductMaster } from '../types';
import { supabase } from '../supabaseClient';

const ProductMasterPage: React.FC = () => {
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    productName: '',
    category: '',
    price: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductMaster>>({});
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('product_master')
        .select('*')
        .order('product_id', { ascending: true });

      if (fetchError) throw fetchError;
      if (data) {
        // Normalize data to avoid nulls
        setProducts(data.map((p: any) => ({
          ...p,
          product_name: p.product_name || '',
          category: p.category || '',
          description: p.description || '',
          status: p.status || 'Active',
          unit: p.unit || ''
        })));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct({
      product_name: '',
      category: 'Cattle Feed',
      price: 0,
      weight: 0,
      unit: 'kg',
      gst_percentage: 18,
      status: 'Active',
      description: ''
    });
    setIsNewProduct(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: ProductMaster) => {
    setEditingProduct({ ...product });
    setIsNewProduct(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      if (isNewProduct) {
        const { error } = await supabase.from('product_master').insert([editingProduct]);
        if (error) throw error;
      } else {
        const { product_id, ...updates } = editingProduct;
        const { error } = await supabase
          .from('product_master')
          .update(updates)
          .eq('product_id', editingProduct.product_id);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert('Error saving product: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('product_master').delete().eq('product_id', id);
      if (error) throw error;
      fetchProducts();
    } catch (err: any) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredProducts = products.filter(p => {
    // 1. Global Search (OR)
    const matchesSearch =
      (p.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Column Filters (AND)
    if (filters.productName && !(p.product_name || '').toLowerCase().includes(filters.productName.toLowerCase())) return false;
    if (filters.category && !(p.category || '').toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.price && !p.price?.toString().includes(filters.price)) return false;
    if (filters.status && !(p.status || '').toLowerCase().includes(filters.status.toLowerCase())) return false;

    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn">
      {/* Header / Toolbar */}
      {/* Header / Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-sm backdrop-blur-md transition-colors duration-300 gap-4">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-sm">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-wide">Product Master</h1>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Manage global catalog and pricing</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative group w-full md:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">search</span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] w-full md:w-64 transition-all placeholder-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:opacity-90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] backdrop-blur-md overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--bg-panel)] border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider backdrop-blur-xl">
              <tr className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Price (₹)</th>
                <th className="px-6 py-4">Weight / Unit</th>
                <th className="px-6 py-4 text-center">GST %</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                <th className="px-4 py-2">
                  <input
                    placeholder="Filter Product..."
                    value={filters.productName}
                    onChange={e => handleFilterChange('productName', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-4 py-2">
                  <select
                    value={filters.category}
                    onChange={e => handleFilterChange('category', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none appearance-none"
                  >
                    <option value="">All Categories</option>
                    {Array.from(new Set(products.map(p => p.category || '').filter(Boolean)))
                      .sort()
                      .map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                  </select>
                </th>
                <th className="px-4 py-2 text-right">
                  <input
                    placeholder="Filter Price"
                    value={filters.price}
                    onChange={e => handleFilterChange('price', e.target.value)}
                    className="w-20 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none text-right ml-auto placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">
                  <input
                    placeholder="Status"
                    value={filters.status}
                    onChange={e => handleFilterChange('status', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-sm">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">Loading catalog...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">No products found.</td></tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.product_id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                    <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                      {product.product_name}
                      {product.description && <p className="text-[10px] text-[var(--text-muted)] font-normal mt-0.5 max-w-xs truncate">{product.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--color-primary)]">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[var(--text-primary)] font-bold">
                      {product.price?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">
                      {product.weight} {product.unit}
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--text-muted)]">
                      {product.gst_percentage}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${product.status === 'Active'
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {product.status || 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(product.product_id)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 transition-all"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {isNewProduct ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form id="productForm" onSubmit={handleSave} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Product Name</label>
                  <input
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingProduct.product_name}
                    onChange={e => setEditingProduct({ ...editingProduct, product_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Category</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all appearance-none"
                    value={editingProduct.category}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {Array.from(new Set(products.map(p => p.category || '').filter(Boolean)))
                      .sort()
                      .map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all text-right font-mono text-green-500 font-bold placeholder-[var(--text-muted)]"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Weight</label>
                  <input
                    type="number"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingProduct.weight}
                    onChange={e => setEditingProduct({ ...editingProduct, weight: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Unit</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all"
                    value={editingProduct.unit}
                    onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                  >
                    <option value="kg">Kg</option>
                    <option value="ltr">Ltr</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">GST %</label>
                  <input
                    type="number"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingProduct.gst_percentage}
                    onChange={e => setEditingProduct({ ...editingProduct, gst_percentage: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Status</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all"
                    value={editingProduct.status}
                    onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all resize-none placeholder-[var(--text-muted)]"
                    value={editingProduct.description || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={saveLoading}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-all font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"
              >
                {saveLoading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMasterPage;
