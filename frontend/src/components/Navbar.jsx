import React from 'react';
import { ShoppingBag, Search, ShieldCheck, ShoppingCart, UserCheck, LogOut } from 'lucide-react';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  cartCount, 
  openCart, 
  currentView, 
  setView,
  user,
  onLogout,
  openLoginModal
}) {
  return (
    <div className="flex flex-col w-full">
      {/* Premium Announcement / Contact Bar */}
      <div className="bg-gradient-to-r from-brand-blue-dark via-brand-blue to-brand-blue-dark text-slate-200 text-[9px] md:text-xs py-2 px-4 md:px-8 flex justify-center items-center gap-2 border-b border-brand-orange/20 shadow-sm z-50">
        <div className="flex items-center gap-1.5 justify-center text-center">
          <span className="text-brand-orange animate-bounce">👑</span>
          <span className="font-serif-brand font-bold tracking-wider text-slate-100 uppercase text-[9px] md:text-[10px]">
            उदीक्षा Garment Atelier - Luxury Heritage Store & Royal Apparel | Experience Royale Collection
          </span>
        </div>
      </div>

      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 px-4 md:px-8 py-4 flex items-center justify-between transition-all duration-300">
        
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => setView('store')}
        >
          <span className="text-2xl md:text-3xl filter drop-shadow">👑</span>
          <div className="flex items-center">
            <span className="font-serif-brand text-2xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-brand-blue via-brand-orange to-brand-blue-dark bg-clip-text text-transparent drop-shadow-sm">
              उदीक्षा
            </span>
            <span className="text-xs md:text-sm font-sans font-extrabold text-brand-blue-dark uppercase tracking-widest ml-2 pl-2 border-l border-slate-300">
              Garment
            </span>
          </div>
        </div>

        {/* Modern Minimal Search Bar (Only shown on store view) */}
        {currentView === 'store' ? (
          <div className="hidden md:flex items-center bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-full px-4 py-2 w-1/3 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:bg-white focus-within:border-brand-blue/50">
            <Search className="text-slate-400 w-4 h-4 mr-2" />
            <input 
              type="text" 
              placeholder="Search luxury fabrics, sherwanis, sarees..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>
        ) : (
          <div className="hidden md:block text-sm font-semibold text-brand-blue bg-brand-blue/5 px-4 py-1.5 rounded-full border border-brand-blue/20">
            Admin Management Suite
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3.5">
          {/* Toggle View Button (Store vs Admin) */}
          {user && user.role === 'admin' && (
            currentView === 'store' ? (
              <button 
                onClick={() => setView('admin')}
                className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-slate-600 hover:text-brand-blue border border-slate-300 hover:border-brand-blue rounded-full px-3 py-1.5 transition-all duration-200"
              >
                <ShieldCheck className="w-4 h-4 text-brand-orange" />
                <span>Admin Panel</span>
              </button>
            ) : (
              <button 
                onClick={() => setView('store')}
                className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-slate-600 hover:text-brand-blue border border-slate-300 hover:border-brand-blue rounded-full px-3 py-1.5 transition-all duration-200"
              >
                <ShoppingCart className="w-4 h-4 text-brand-blue" />
                <span>View Storefront</span>
              </button>
            )
          )}

          {/* Search Toggle for Mobile */}
          {currentView === 'store' && (
            <div className="md:hidden flex items-center bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
              <Search className="text-slate-400 w-3.5 h-3.5 mr-1" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-16 text-slate-800 placeholder-slate-400"
              />
            </div>
          )}

          {/* User Profile / Login Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end text-right text-xs">
                <span className="text-[8px] font-bold text-brand-orange uppercase tracking-wider">
                  {user.role === 'admin' ? '👑 Atelier Admin' : '👤 Customer'}
                </span>
                <span className="font-bold text-slate-700 max-w-[120px] truncate">{user.username}</span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-100 transition-colors"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-full px-4 py-1.5 transition-all duration-200 shadow-md shadow-brand-blue/15 hover:scale-105 active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}

          {/* Interactive Cart Badge Button */}
          <button 
            onClick={openCart}
            className="relative p-2.5 rounded-full bg-brand-blue text-white hover:bg-brand-blue-dark transition-all duration-300 shadow-md shadow-brand-blue/10 hover:shadow-lg hover:shadow-brand-blue/20 active:scale-95"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}




