/**
 * Vendor Menu Management Page
 * 
 * Client component for managing products/menu
 */

'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Power, Search, Image as ImageIcon } from 'lucide-react';

type Product = {
  id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  price: number;
  currency: string;
  is_active: boolean;
  photo_url: string | null;
};

type ProductFormData = {
  category_id: string;
  name: string;
  price: number;
  photo_url?: string;
  is_active: boolean;
};

export default function VendorMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch('/api/vendor/products?limit=100');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAvailability(productId: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/vendor/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p))
        );
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  }

  async function handleBulkToggle(isActive: boolean) {
    if (selectedProducts.size === 0) return;

    try {
      const response = await fetch('/api/vendor/products/bulk-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: Array.from(selectedProducts),
          is_active: isActive,
        }),
      });

      if (response.ok) {
        await fetchProducts();
        setSelectedProducts(new Set());
      }
    } catch (error) {
      console.error('Failed to bulk update:', error);
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/vendor/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  }

  function handleSelectProduct(productId: string) {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-16 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Menu Management</p>
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-600">Manage your menu items and availability</p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Add Product
            </button>
          </div>
        </header>

        {/* Bulk Actions */}
        {selectedProducts.size > 0 && (
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedProducts.size} selected
            </span>
            <button
              onClick={() => handleBulkToggle(true)}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
            >
              Enable All
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
            >
              Disable All
            </button>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="ml-auto text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-500">No products found. Click "Add Product" to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-lg ${
                  selectedProducts.has(product.id) ? 'border-orange-400' : 'border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <div className="absolute left-4 top-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    className="h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </div>

                {/* Image */}
                <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100">
                  {product.photo_url ? (
                    <img
                      src={product.photo_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="mb-4 text-lg font-bold text-orange-600">
                    {new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: product.currency,
                    }).format(product.price)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.is_active)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        product.is_active
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      <Power className="h-4 w-4" />
                      {product.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setShowForm(true);
                      }}
                      className="rounded-lg bg-blue-100 p-2 text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal - Placeholder for now */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <p className="text-sm text-gray-600">
                Form implementation coming soon. This is a placeholder for T021-4.
              </p>
              <button
                onClick={() => setShowForm(false)}
                className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
