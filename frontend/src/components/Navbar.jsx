import React from 'react';
import { ShoppingBag, Search, ShieldCheck, ShoppingCart } from 'lucide-react';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  cartCount, 
  openCart, 
  currentView, 
  setView 
}) {
  return (
    <nav class="sticky top-0 z-50 glass-panel border-b border-slate-200/80 px-4 md:px-8 py-4 flex items-center justify-between transition-all duration-300">
      
      {/* Brand Identity / Logo */}
      <div 
        class="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setView('store')}
      >
        <span class="text-2xl md:text-3xl">👑</span>
        <span class="font-serif-brand text-2xl md:text-3xl font-extrabold tracking-widest bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">
          UDIKSHA
        </span>
        <span class="hidden sm:inline-block text-[9px] font-bold tracking-widest text-brand-orange border border-brand-orange px-1.5 py-0.5 rounded-full uppercase ml-1">
          Luxury
        </span>
      </div>

      {/* Modern Minimal Search Bar (Only shown on store view) */}
      {currentView === 'store' ? (
        <div class="hidden md:flex items-center bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-full px-4 py-2 w-1/3 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:bg-white focus-within:border-brand-blue/50">
          <Search class="text-slate-400 w-4 h-4 mr-2" />
          <input 
            type="text" 
            placeholder="Search luxury fabrics, sherwanis, sarees..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            class="bg-transparent border-none outline-none text-sm w-full text-slate-800 placeholder-slate-400 font-medium"
          />
        </div>
      ) : (
        <div class="hidden md:block text-sm font-semibold text-brand-blue bg-brand-blue/5 px-4 py-1.5 rounded-full border border-brand-blue/20">
          Admin Management Suite
        </div>
      )}

      {/* Action Buttons */}
      <div class="flex items-center gap-4">
        {/* Toggle View Button (Store vs Admin) */}
        {currentView === 'store' ? (
          <button 
            onClick={() => setView('admin')}
            class="flex items-center gap-1.5 text-xs md:text-sm font-bold text-slate-600 hover:text-brand-blue border border-slate-300 hover:border-brand-blue rounded-full px-3 py-1.5 transition-all duration-200"
          >
            <ShieldCheck class="w-4 h-4 text-brand-orange" />
            <span>Admin Panel</span>
          </button>
        ) : (
          <button 
            onClick={() => setView('store')}
            class="flex items-center gap-1.5 text-xs md:text-sm font-bold text-slate-600 hover:text-brand-blue border border-slate-300 hover:border-brand-blue rounded-full px-3 py-1.5 transition-all duration-200"
          >
            <ShoppingCart class="w-4 h-4 text-brand-blue" />
            <span>View Storefront</span>
          </button>
        )}

        {/* Search Toggle for Mobile */}
        {currentView === 'store' && (
          <div class="md:hidden flex items-center bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
            <Search class="text-slate-400 w-3.5 h-3.5 mr-1" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              class="bg-transparent border-none outline-none text-xs w-20 text-slate-800 placeholder-slate-400"
            />
          </div>
        )}

        {/* Interactive Cart Badge Button */}
        <button 
          onClick={openCart}
          class="relative p-2.5 rounded-full bg-brand-blue text-white hover:bg-brand-blue-dark transition-all duration-300 shadow-md shadow-brand-blue/10 hover:shadow-lg hover:shadow-brand-blue/20 active:scale-95"
        >
          <ShoppingBag class="w-5 h-5" />
          {cartCount > 0 && (
            <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
              {cartCount}
            </span>
          )}
        </button>
      </div>

    </nav>
  );
}
