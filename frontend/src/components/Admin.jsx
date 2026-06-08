import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, History, Settings, RefreshCw, Layers } from 'lucide-react';

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [adminUsername, setAdminUsername] = useState(localStorage.getItem('adminUsername') || '');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'orders'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // New garment form state
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    category: '',
    basePrice: '',
    discount: '0',
    stock: '',
    imageUrl: '',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Royal Blue', hex: '#1e3a8a' },
      { name: 'Electric Orange', hex: '#f97316' }
    ]
  });

  const [colorInput, setColorInput] = useState({ name: '', hex: '#000000' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    setToken('');
    setAdminUsername('');
  };

  // Handle Login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login.');
      }
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.username);
      setToken(data.token);
      setAdminUsername(data.username);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch admin stats on mount/refresh
  useEffect(() => {
    if (!token) return;

    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const prodRes = await fetch(`${API_URL}/api/products`);
        const prodData = await prodRes.json();
        setProducts(prodData);

        const catRes = await fetch(`${API_URL}/api/categories`);
        const catData = await catRes.json();
        setCategories(catData);

        const orderRes = await fetch(`${API_URL}/api/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (orderRes.status === 401 || orderRes.status === 403) {
          handleLogout();
          alert('Session expired. Please log in again.');
          return;
        }
        
        const orderData = await orderRes.json();
        setOrders(orderData);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [refreshTrigger, token]);

  // Handle new garment insert
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.description || !newProduct.category || !newProduct.basePrice || !newProduct.stock || !newProduct.imageUrl) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProduct)
      });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        alert('Unauthorized. Please log in again.');
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to insert garment specifications.');
      }
      
      alert('Luxury garment specifications added successfully!');
      setNewProduct({
        title: '',
        description: '',
        category: '',
        basePrice: '',
        discount: '0',
        stock: '',
        imageUrl: '',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Royal Blue', hex: '#1e3a8a' },
          { name: 'Electric Orange', hex: '#f97316' }
        ]
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert(error.message);
    }
  };

  // Add custom color item
  const handleAddColor = () => {
    if (!colorInput.name) {
      alert('Please enter a color name.');
      return;
    }
    setNewProduct({
      ...newProduct,
      colors: [...newProduct.colors, colorInput]
    });
    setColorInput({ name: '', hex: '#000000' });
  };

  // Handle stock updating
  const handleUpdateStock = async (productId, newQty) => {
    if (newQty < 0) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock: parseInt(newQty) })
      });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        alert('Unauthorized. Please log in again.');
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Stock update failed.');
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert(error.message);
    }
  };

  // Handle deleting item
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this garment from inventory?')) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        alert('Unauthorized. Please log in again.');
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete garment.');
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert(error.message);
    }
  };

  // Toggle courier stage status
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        alert('Unauthorized. Please log in again.');
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Courier status update failed.');
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      alert(error.message);
    }
  };

  // Render Login screen if not authenticated
  if (!token) {
    return (
      <div class="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-md bg-white border border-slate-200/60 rounded-[32px] p-8 shadow-xl shadow-brand-blue/5 fade-in">
          <div class="text-center mb-8">
            <span class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-blue/5 text-brand-blue mb-4 text-2xl">
              👑
            </span>
            <h2 class="font-serif-brand text-2xl font-extrabold text-brand-blue tracking-wide">
              UDIKSHA Atelier
            </h2>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Internal Production Login
            </p>
          </div>

          {loginError && (
            <div class="mb-5 p-4 bg-red-50 border border-red-200/50 rounded-2xl text-xs font-bold text-red-600 flex items-center gap-2">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} class="space-y-5">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Username</label>
              <input
                type="text"
                required
                placeholder="Enter username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-blue text-xs font-medium text-slate-700"
              />
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-blue text-xs font-medium text-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              class="w-full py-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-blue/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>

          <div class="mt-8 pt-6 border-t border-slate-100 text-center">
            <span class="text-[9px] font-extrabold text-brand-orange bg-brand-orange/5 border border-brand-orange/10 px-3 py-1 rounded-full uppercase">
              Demo Login: mbhola099@gmail.com / Panditain@#143
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="px-4 md:px-8 py-8 max-w-7xl mx-auto fade-in">
      
      {/* Admin Title & Tabs */}
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5 mb-8">
        <div>
          <h1 class="font-serif-brand text-3xl font-extrabold text-brand-blue tracking-wide flex items-center gap-2">
            UDIKSHA Atelier
            <span class="text-xs font-bold text-brand-orange bg-brand-orange/5 border border-brand-orange/15 px-2 py-0.5 rounded-full uppercase">
              Active: {adminUsername}
            </span>
          </h1>
          <p class="text-xs text-slate-400 font-medium tracking-wide mt-1 uppercase">
            Internal Production & Inventory Control Suite
          </p>
        </div>

        {/* Tab Buttons */}
        <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('inventory')}
            class={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === 'inventory'
                ? 'bg-white text-brand-blue shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-brand-blue'
            }`}
          >
            <Package class="w-3.5 h-3.5" />
            <span>Manage Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            class={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === 'orders'
                ? 'bg-white text-brand-blue shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-brand-blue'
            }`}
          >
            <History class="w-3.5 h-3.5" />
            <span>Customer Orders</span>
          </button>
          <button
            onClick={handleLogout}
            class="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 text-red-500 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      {loading ? (
        <div class="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw class="w-8 h-8 text-brand-blue animate-spin" />
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Syncing Atelier Logs...
          </span>
        </div>
      ) : activeTab === 'inventory' ? (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Add new Spec Form */}
          <div class="lg:col-span-1 bg-white border border-slate-200/60 rounded-bento p-6 shadow-sm self-start">
            <div class="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span class="text-xl">✨</span>
              <h2 class="font-serif-brand text-lg font-bold text-slate-800">Add Luxury Garment</h2>
            </div>

            <form onSubmit={handleAddProduct} class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Blue Silk Kurta"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                  class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs"
                />
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Detail craftmanship specs..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs resize-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kurta"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="1299"
                    value={newProduct.basePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })}
                    class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discount (%)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProduct.discount}
                    onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value })}
                    class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Qty</label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Image URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-blue text-xs"
                />
              </div>

              {/* Sizes checkboxes */}
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Available Sizes</label>
                <div class="flex gap-3">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                    const isChecked = newProduct.sizes.includes(size);
                    return (
                      <label key={size} class="flex items-center gap-1 text-xs text-slate-600 font-bold">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const sizes = isChecked
                              ? newProduct.sizes.filter((s) => s !== size)
                              : [...newProduct.sizes, size];
                            setNewProduct({ ...newProduct, sizes });
                          }}
                          class="rounded text-brand-blue focus:ring-brand-blue"
                        />
                        <span>{size}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Fabric Color tags setup */}
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Fabric Colors</label>
                <div class="flex flex-wrap gap-1.5 mb-2.5">
                  {newProduct.colors.map((color, idx) => (
                    <span 
                      key={idx} 
                      class="inline-flex items-center gap-1.5 text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
                    >
                      <span class="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: color.hex }} />
                      {color.name}
                      <button
                        type="button"
                        onClick={() => {
                          const colors = newProduct.colors.filter((_, i) => i !== idx);
                          setNewProduct({ ...newProduct, colors });
                        }}
                        class="text-slate-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div class="flex gap-2">
                  <input
                    type="text"
                    placeholder="Color name"
                    value={colorInput.name}
                    onChange={(e) => setColorInput({ ...colorInput, name: e.target.value })}
                    class="w-1/2 px-2 py-1.5 border border-slate-200 rounded text-xs"
                  />
                  <input
                    type="color"
                    value={colorInput.hex}
                    onChange={(e) => setColorInput({ ...colorInput, hex: e.target.value })}
                    class="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    class="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <button
                type="submit"
                class="w-full mt-4 py-3.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-brand-blue/10"
              >
                Add Garment Spec
              </button>
            </form>
          </div>

          {/* Right panel: Inventory List */}
          <div class="lg:col-span-2 bg-white border border-slate-200/60 rounded-bento p-6 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <div class="flex items-center gap-2">
                <span class="text-xl">👕</span>
                <h2 class="font-serif-brand text-lg font-bold text-slate-800">Inventory Status</h2>
              </div>
              <span class="text-xs font-bold text-brand-orange bg-brand-orange/5 border border-brand-orange/10 px-2.5 py-0.5 rounded-full">
                {products.length} Garments
              </span>
            </div>

            {products.length === 0 ? (
              <div class="text-center py-12 text-slate-400">
                No items in database. Use form to add your first design.
              </div>
            ) : (
              <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {products.map((p) => (
                  <div 
                    key={p.id}
                    class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl"
                  >
                    {/* Img and name */}
                    <div class="flex items-center gap-3.5">
                      <img 
                        src={p.image_url} 
                        alt={p.title} 
                        class="w-12 h-12 object-cover rounded-xl bg-slate-200" 
                      />
                      <div>
                        <h4 class="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                        <span class="text-[9px] font-extrabold text-brand-orange uppercase tracking-wider block mt-0.5">
                          {p.category}
                        </span>
                      </div>
                    </div>

                    {/* Stock level editing and Delete */}
                    <div class="flex items-center gap-6">
                      
                      {/* Price info */}
                      <div class="text-right">
                        <span class="block text-[9px] text-slate-400 font-bold uppercase">Base Price</span>
                        <span class="text-xs font-extrabold text-slate-700">₹{p.base_price}</span>
                      </div>

                      {/* Stock level editing */}
                      <div class="flex flex-col items-end">
                        <label class="text-[9px] text-slate-400 font-bold uppercase mb-1">Stock level</label>
                        <div class="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleUpdateStock(p.id, p.stock_qty - 1)}
                            class="px-2 py-1 hover:bg-slate-100 text-slate-500 font-bold text-xs"
                          >
                            -
                          </button>
                          <span class="px-3 text-xs font-extrabold text-slate-700">
                            {p.stock_qty}
                          </span>
                          <button
                            onClick={() => handleUpdateStock(p.id, p.stock_qty + 1)}
                            class="px-2 py-1 hover:bg-slate-100 text-slate-500 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Trash Button */}
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        class="p-2.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>

                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ORDERS LOGS VIEW */
        <div class="bg-white border border-slate-200/60 rounded-bento p-6 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <div class="flex items-center gap-2">
              <span class="text-xl">📜</span>
              <h2 class="font-serif-brand text-lg font-bold text-slate-800">Customer Transaction History</h2>
            </div>
            <span class="text-xs font-bold text-brand-blue bg-brand-blue/5 border border-brand-blue/10 px-2.5 py-0.5 rounded-full">
              {orders.length} Placed Bills
            </span>
          </div>

          {orders.length === 0 ? (
            <div class="text-center py-16 text-slate-400">
              No orders have been simulated on this store yet. Go storefront and place order!
            </div>
          ) : (
            <div class="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {orders.map((o) => (
                <div 
                  key={o.id}
                  class="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4"
                >
                  {/* Bill title and date */}
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-200 gap-2">
                    <div>
                      <span class="text-xs font-extrabold text-brand-blue uppercase">{o.bill_id}</span>
                      <span class="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Date: {new Date(o.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Status updater */}
                    <div class="flex items-center gap-2">
                      <span class="text-[9px] font-bold text-slate-400 uppercase">Courier dispatch stage:</span>
                      <select
                        value={o.order_status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="Placed">Placed</option>
                        <option value="Processing">Processing</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-slate-600">
                    <div>
                      <span class="block text-[8px] font-bold text-slate-400 uppercase">Customer Info</span>
                      <span class="font-bold text-slate-700">{o.customer_name}</span>
                      <span class="block font-light text-slate-400">{o.customer_email}</span>
                      <span class="block font-light text-slate-400">{o.customer_phone}</span>
                    </div>

                    <div>
                      <span class="block text-[8px] font-bold text-slate-400 uppercase">Delivery Address</span>
                      <span class="font-light">{o.delivery_address}</span>
                    </div>

                    <div class="text-right">
                      <span class="block text-[8px] font-bold text-slate-400 uppercase">Total Paid</span>
                      <span class="text-sm font-extrabold text-brand-blue">
                        ₹{Math.round(o.total_paid).toLocaleString()}
                      </span>
                      <span class="block text-[9px] font-medium text-slate-400 mt-0.5 uppercase">
                        via {o.payment_method}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Table inside order card */}
                  <div class="bg-white border border-slate-100 rounded-xl p-3">
                    <span class="block text-[8px] font-bold text-slate-400 uppercase mb-2">Purchased Items</span>
                    <div class="space-y-1.5 text-xs text-slate-600">
                      {o.items && o.items.map((item, idx) => (
                        <div key={idx} class="flex justify-between items-center">
                          <span>
                            • {item.product_title} <span class="font-bold">x{item.quantity}</span> ({item.size_label} / {item.color_name})
                          </span>
                          <span class="font-bold text-slate-700">
                            ₹{Math.round(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
