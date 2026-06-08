import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Catalog from './components/Catalog';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Admin from './components/Admin';

export default function App() {
  const [view, setView] = useState('store'); // 'store' or 'admin'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('latest');
  
  // Data State loaded from APIs
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    <div class="min-h-screen bg-brand-grey flex flex-col justify-between">
      
      <div>
        {/* Navigation Bar */}
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          cartCount={totalCartCount}
          openCart={() => setIsCartOpen(true)}
          currentView={view}
          setView={setView}
        />

        {/* View Router */}
        {view === 'store' ? (
          <div>
            {/* Elegant Carousel Banner */}
            <Hero onExploreCategory={handleExploreCategory} />

            {/* Catalog Container Anchor */}
            <div id="store-catalog" class="scroll-mt-24">
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
          <Admin />
        )}
      </div>

      {/* Footer */}
      <footer class="bg-brand-blue-dark text-slate-400 py-12 mt-16 px-4 md:px-8 border-t border-brand-blue/20">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex items-center gap-2">
            <span class="text-xl">👑</span>
            <span class="font-serif-brand text-xl font-bold tracking-widest text-white">UDIKSHA</span>
            <span class="text-[9px] font-bold text-brand-orange border border-brand-orange/30 px-1.5 py-0.5 rounded-full uppercase">
              Atelier
            </span>
          </div>

          <div class="text-center md:text-right text-xs leading-normal">
            <p>© 2026 UDIKSHA Luxury Fashion Store. Crafted with pure Banarasi Silk & Royal Accents.</p>
            <p class="mt-1 text-slate-500">Built using React 18, Node.js, Express & SQLite. Secure transaction simulation.</p>
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
      />

    </div>
  );
}
