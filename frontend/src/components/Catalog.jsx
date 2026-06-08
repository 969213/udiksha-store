import React, { useState } from 'react';
import { Eye, Star, Plus, X, ShoppingBag } from 'lucide-react';

export default function Catalog({ 
  products, 
  categories, 
  loading, 
  selectedCategory, 
  setCategory, 
  sortOption, 
  setSort, 
  onAddToCart 
}) {
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);

  const openQuickView = (product) => {
    setQuickViewProduct(product);
    setSelectedSize(product.sizes ? product.sizes[0] : '');
    setSelectedColor(product.colors ? product.colors[0] : null);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    setSelectedSize('');
    setSelectedColor(null);
  };

  const handleQuickViewAdd = () => {
    if (!selectedSize) {
      alert('Please select a size first.');
      return;
    }
    if (!selectedColor) {
      alert('Please select a color first.');
      return;
    }
    onAddToCart(quickViewProduct, selectedSize, selectedColor);
    closeQuickView();
  };

  // Render Shimmer skeleton cards while loading (makes page feel instantaneous)
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, i) => (
      <div key={i} class="bg-white rounded-bento border border-slate-200/60 overflow-hidden p-4 flex flex-col gap-4">
        <div class="h-64 rounded-[16px] shimmer-loader w-full" />
        <div class="h-4 w-1/3 rounded shimmer-loader" />
        <div class="h-6 w-3/4 rounded shimmer-loader" />
        <div class="h-4 w-1/2 rounded shimmer-loader" />
        <div class="flex justify-between items-center mt-2">
          <div class="h-6 w-24 rounded shimmer-loader" />
          <div class="h-10 w-10 rounded-full shimmer-loader" />
        </div>
      </div>
    ));
  };

  return (
    <div class="px-4 md:px-8 py-8">
      
      {/* Category Tab Filter Bar & Sorting */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        
        {/* Category Tabs */}
        <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              class={`px-5 py-2.5 rounded-full text-xs md:text-sm font-bold tracking-wider uppercase transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div class="flex items-center gap-2 self-end md:self-auto">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Sort By:</span>
          <select
            value={sortOption}
            onChange={(e) => setSort(e.target.value)}
            class="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs md:text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-brand-blue"
          >
            <option value="latest">Newest Arrivals</option>
            <option value="price-low-high">Price: Low to High</option>
            <option value="price-high-low">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

      </div>

      {/* Catalog Grid */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          renderSkeletons()
        ) : products.length === 0 ? (
          <div class="col-span-full py-16 text-center">
            <span class="text-5xl">🛍️</span>
            <h3 class="font-serif-brand text-2xl font-bold text-slate-700 mt-4">No garments found</h3>
            <p class="text-slate-400 mt-2 text-sm">Try adjusting your search filters or check back later.</p>
          </div>
        ) : (
          products.map((product) => {
            const finalPrice = product.base_price * (1 - product.discount_percent / 100);
            
            return (
              <div 
                key={product.id}
                class="group relative bg-white rounded-bento border border-slate-200/50 overflow-hidden hover-lift flex flex-col justify-between"
              >
                {/* Product Image Area */}
                <div class="relative h-72 w-full overflow-hidden bg-slate-100">
                  <img
                    src={product.image_url}
                    alt={product.title}
                    class="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                  />

                  {/* Discount Badge */}
                  {product.discount_percent > 0 && (
                    <span class="absolute top-4 left-4 bg-brand-orange text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-md z-20">
                      {product.discount_percent}% OFF
                    </span>
                  )}

                  {/* Rating Badge */}
                  <div class="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold text-slate-700 shadow-sm z-20">
                    <Star class="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{product.rating.toFixed(1)}</span>
                  </div>

                  {/* Hover Quick View Trigger */}
                  <div class="absolute inset-0 bg-brand-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                    <button
                      onClick={() => openQuickView(product)}
                      class="px-4 py-2.5 bg-white text-brand-blue rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-brand-blue hover:text-white"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      Quick View
                    </button>
                  </div>
                </div>

                {/* Product Detail Area */}
                <div class="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span class="text-[10px] font-extrabold text-brand-orange uppercase tracking-wider">
                      {product.category}
                    </span>
                    <h3 class="font-serif-brand font-bold text-slate-800 text-base mt-1 line-clamp-1 group-hover:text-brand-blue transition-colors duration-200">
                      {product.title}
                    </h3>
                    
                    {/* Sizes preview */}
                    <div class="flex gap-1 mt-2 mb-3">
                      {product.sizes && product.sizes.map(size => (
                        <span key={size} class="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/30">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    {/* Price tag */}
                    <div>
                      {product.discount_percent > 0 ? (
                        <div class="flex items-baseline gap-1.5">
                          <span class="text-base font-extrabold text-brand-blue">
                            ₹{Math.round(finalPrice).toLocaleString()}
                          </span>
                          <span class="text-xs text-slate-400 line-through">
                            ₹{product.base_price.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span class="text-base font-extrabold text-brand-blue">
                          ₹{product.base_price.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Simple Add button */}
                    <button
                      onClick={() => openQuickView(product)}
                      class="p-2.5 rounded-full bg-slate-100 hover:bg-brand-orange hover:text-white text-slate-700 transition-all duration-300"
                    >
                      <Plus class="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* QUICK VIEW OVERLAY MODAL */}
      {quickViewProduct && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
          <div class="relative bg-white w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/20">
            
            {/* Close Button */}
            <button 
              onClick={closeQuickView}
              class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>

            {/* Left side Image */}
            <div class="w-full md:w-1/2 h-64 md:h-[450px] bg-slate-100">
              <img
                src={quickViewProduct.image_url}
                alt={quickViewProduct.title}
                class="w-full h-full object-cover"
              />
            </div>

            {/* Right side Info */}
            <div class="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
              
              <div>
                <span class="text-[10px] font-extrabold text-brand-orange uppercase tracking-widest bg-brand-orange/5 px-2.5 py-1 rounded-full border border-brand-orange/10">
                  {quickViewProduct.category}
                </span>

                <h2 class="font-serif-brand text-2xl md:text-3xl font-bold text-slate-800 mt-4 leading-snug">
                  {quickViewProduct.title}
                </h2>

                {/* Rating */}
                <div class="flex items-center gap-1 mt-2 text-sm text-slate-500 font-semibold">
                  <Star class="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{quickViewProduct.rating.toFixed(1)} Rating</span>
                  <span class="text-slate-300">|</span>
                  <span class="text-xs text-emerald-600 font-bold">
                    {quickViewProduct.stock_qty > 0 ? `In Stock (${quickViewProduct.stock_qty})` : 'Out of Stock'}
                  </span>
                </div>

                {/* Description */}
                <p class="text-xs md:text-sm text-slate-500 mt-4 line-clamp-4 leading-relaxed font-light">
                  {quickViewProduct.description}
                </p>

                {/* Size Selection */}
                {quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && (
                  <div class="mt-4">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Size</span>
                    <div class="flex gap-2 mt-1.5">
                      {quickViewProduct.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          class={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-all duration-150 ${
                            selectedSize === size
                              ? 'border-brand-blue bg-brand-blue text-white shadow-sm'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Selection */}
                {quickViewProduct.colors && quickViewProduct.colors.length > 0 && (
                  <div class="mt-4">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Fabric Tone</span>
                    <div class="flex items-center gap-3 mt-1.5">
                      {quickViewProduct.colors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColor(color)}
                          title={color.name}
                          class={`relative w-8 h-8 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                            selectedColor?.name === color.name
                              ? 'border-brand-blue scale-110 shadow-md'
                              : 'border-transparent'
                          }`}
                        >
                          <span 
                            class="w-6 h-6 rounded-full border border-slate-200"
                            style={{ backgroundColor: color.hex }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price & Add to Cart button */}
              <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Premium Price</span>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-extrabold text-brand-blue">
                      ₹{Math.round(
                        quickViewProduct.base_price * (1 - quickViewProduct.discount_percent / 100)
                      ).toLocaleString()}
                    </span>
                    {quickViewProduct.discount_percent > 0 && (
                      <span class="text-sm text-slate-400 line-through">
                        ₹{quickViewProduct.base_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleQuickViewAdd}
                  disabled={quickViewProduct.stock_qty === 0}
                  class={`flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md ${
                    quickViewProduct.stock_qty === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-brand-orange hover:bg-brand-orange-dark text-white hover:scale-105 shadow-brand-orange/20'
                  }`}
                >
                  <ShoppingBag class="w-4 h-4" />
                  Add to Bag
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
