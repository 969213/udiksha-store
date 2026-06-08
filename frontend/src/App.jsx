import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Catalog from './components/Catalog';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Admin from './components/Admin';
import LoginModal from './components/LoginModal';

export default function App() {
  const [view, setView] = useState('store'); // 'store' or 'admin'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('latest');
  
  // User Authentication State
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    const username = localStorage.getItem('userUsername') || localStorage.getItem('adminUsername');
    const role = localStorage.getItem('userRole') || (localStorage.getItem('adminToken') ? 'admin' : null);
    return token ? { token, username, role } : null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [smsAlert, setSmsAlert] = useState(null);

  const triggerSmsAlert = (phone, otp) => {
    setSmsAlert({ phone, otp });
    // Auto-dismiss after 10s
    setTimeout(() => {
      setSmsAlert(null);
    }, 10000);
  };

  const handleLoginSuccess = (userData) => {
    if (!userData) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userUsername');
      localStorage.removeItem('userRole');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
      setUser(null);
    } else {
      localStorage.setItem('userToken', userData.token);
      localStorage.setItem('userUsername', userData.username);
      localStorage.setItem('userRole', userData.role);
      if (userData.role === 'admin') {
        localStorage.setItem('adminToken', userData.token);
        localStorage.setItem('adminUsername', userData.username);
      }
      setUser(userData);
    }
  };

  const handleLogout = () => {
    handleLoginSuccess(null);
    setView('store');
  };
  
  // Data State loaded from APIs
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://udiksha-backend.onrender.com';

  // 1. Fetch Categories dynamically on Mount
  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));
  }, [view]); // reload when switching views (in case new categories are added in admin)

  // 2. Fetch Products dynamically with query filters (Debounced / Triggered by State Changes)
  useEffect(() => {
    setLoading(true);
    
    // Build query params
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
    if (sortOption) params.append('sort', sortOption);

    // Fetch call
    fetch(`${API_URL}/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products from API:', err);
        setLoading(false);
      });
  }, [searchQuery, selectedCategory, sortOption, view]); // auto-reload on filter/search/sort change

  // Cart operations
  const handleAddToCart = (product, size, color) => {
    setCartItems((prevItems) => {
      // Check if item already exists with same size and color
      const existingIdx = prevItems.findIndex(
        (item) => 
          item.product.id === product.id && 
          item.size === size && 
          item.color.name === color.name
      );

      if (existingIdx > -1) {
        const updated = [...prevItems];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [...prevItems, { product, size, color, quantity: 1 }];
      }
    });

    // Open Cart Drawer so user sees the addition
    setIsCartOpen(true);
  };

  const handleUpdateQty = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleExploreCategory = (category) => {
    setSelectedCategory(category);
    // Smooth scroll down to Catalog container
    const catalogElement = document.getElementById('store-catalog');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-brand-grey flex flex-col justify-between">
      
      <div>
        {/* Navigation Bar */}
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          cartCount={totalCartCount}
          openCart={() => setIsCartOpen(true)}
          currentView={view}
          setView={setView}
          user={user}
          onLogout={handleLogout}
          openLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* View Router */}
        {view === 'store' ? (
          <div>
            {/* Elegant Carousel Banner */}
            <Hero onExploreCategory={handleExploreCategory} />

            {/* Catalog Container Anchor */}
            <div id="store-catalog" className="scroll-mt-24">
              <Catalog
                products={products}
                categories={categories}
                loading={loading}
                selectedCategory={selectedCategory}
                setCategory={setSelectedCategory}
                sortOption={sortOption}
                setSort={setSortOption}
                onAddToCart={handleAddToCart}
              />
            </div>
          </div>
        ) : (
          /* Admin View Dashboard */
          <Admin onLoginSuccess={handleLoginSuccess} triggerSmsAlert={triggerSmsAlert} />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-brand-blue-dark text-slate-400 py-12 mt-16 px-4 md:px-8 border-t border-brand-blue/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <span className="font-serif-brand text-2xl font-extrabold tracking-widest text-white">
                उदीक्षा <span className="text-xs font-sans font-medium text-slate-400 tracking-normal ml-0.5">Garment</span>
              </span>
              <span className="text-[9px] font-bold text-brand-orange border border-brand-orange/30 px-1.5 py-0.5 rounded-full uppercase">
                Atelier
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1.5 font-sans">
              <p>💼 <strong>Shop Owner:</strong> Shivam Mishra (<a href="tel:+919519764098" className="text-brand-orange hover:underline font-bold">+91 9519764098</a>)</p>
              <p>💻 <strong>Developer:</strong> Harsh Mishra (<a href="tel:+918114247911" className="text-brand-orange hover:underline font-bold">+91 8114247911</a>)</p>
            </div>
          </div>

          <div className="text-left md:text-right text-xs leading-normal">
            <p>© 2026 उदीक्षा Garment Luxury Fashion Store. Crafted with pure Banarasi Silk & Royal Accents.</p>
            <p className="mt-1 text-slate-500">Built using React 18, Node.js, Express & PostgreSQL. Secure OTP system.</p>
          </div>
        </div>
      </footer>

      {/* Slide-out Shopping Bag Drawer */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Secure Checkout Wizard Modal */}
      <Checkout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onClearCart={handleClearCart}
        user={user}
        triggerSmsAlert={triggerSmsAlert}
      />

      {/* Unified Login modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        triggerSmsAlert={triggerSmsAlert}
      />

      {/* Dynamic SMS Notification Banner */}
      {smsAlert && (
        <div className="fixed top-24 right-4 z-[999] max-w-sm w-full bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 border border-brand-orange/40 animate-slide-in-right transition-all">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-brand-orange text-white rounded-xl">
              💬
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">SMS Gateway Simulator</span>
                <button onClick={() => setSmsAlert(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
              </div>
              <p className="text-xs font-bold mt-1 text-slate-100">Message to: {smsAlert.phone}</p>
              <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl mt-2 text-xs font-medium text-slate-200 leading-relaxed font-sans">
                👑 *उदीक्षा Garment* 👑<br/>
                Your security OTP for verification is <strong className="text-brand-orange text-sm tracking-wider">{smsAlert.otp}</strong>. Valid for 5 minutes.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}
