import React from 'react';
import { X, Trash2, Plus, Minus, ShieldCheck } from 'lucide-react';

export default function Cart({ 
  isOpen, 
  onClose, 
  cartItems, 
  onUpdateQty, 
  onRemoveItem, 
  onCheckout 
}) {
  if (!isOpen) return null;

  const total = cartItems.reduce((sum, item) => {
    const finalPrice = item.product.base_price * (1 - item.product.discount_percent / 100);
    return sum + finalPrice * item.quantity;
  }, 0);

  return (
    <div class="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
      />

      <div class="absolute inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer Panel */}
        <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col slide-in-right">
          
          {/* Header */}
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">🛍️</span>
              <h2 class="font-serif-brand text-xl font-bold text-slate-800">Shopping Bag</h2>
              <span class="text-xs font-bold bg-brand-blue/5 text-brand-blue px-2 py-0.5 rounded-full border border-brand-blue/10">
                {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} Items
              </span>
            </div>
            <button 
              onClick={onClose}
              class="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          {/* List of Cart Items */}
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div class="h-full flex flex-col items-center justify-center text-center">
                <span class="text-5xl">🏷️</span>
                <h3 class="font-serif-brand text-lg font-bold text-slate-700 mt-4">Your bag is empty</h3>
                <p class="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                  Fill it with our premium handcrafted luxury fabrics and classic garments.
                </p>
                <button
                  onClick={onClose}
                  class="mt-6 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item, index) => {
                const finalPrice = item.product.base_price * (1 - item.product.discount_percent / 100);
                
                return (
                  <div 
                    key={index}
                    class="flex gap-4 p-3.5 bg-slate-50 rounded-[20px] border border-slate-200/50 hover:border-slate-300/60 transition-all duration-200"
                  >
                    {/* Item Image */}
                    <img 
                      src={item.product.image_url} 
                      alt={item.product.title} 
                      class="w-20 h-20 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                    />

                    {/* Item Description & Adjustments */}
                    <div class="flex-1 flex flex-col justify-between">
                      <div>
                        <div class="flex justify-between items-start">
                          <h4 class="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">
                            {item.product.title}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(index)}
                            class="text-slate-400 hover:text-red-500 p-0.5 transition-colors"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Specs */}
                        <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold uppercase">
                          <span>Size: {item.size}</span>
                          <span>•</span>
                          <div class="flex items-center gap-1">
                            <span>Tone:</span>
                            <span 
                              class="w-2.5 h-2.5 rounded-full border border-slate-300"
                              style={{ backgroundColor: item.color.hex }}
                            />
                            <span>{item.color.name}</span>
                          </div>
                        </div>
                      </div>

                      <div class="flex justify-between items-center mt-2">
                        {/* Quantity controls */}
                        <div class="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => onUpdateQty(index, item.quantity - 1)}
                            class="p-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
                          >
                            <Minus class="w-3 h-3" />
                          </button>
                          <span class="px-3 text-xs font-extrabold text-slate-700">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQty(index, item.quantity + 1)}
                            class="p-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
                          >
                            <Plus class="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price computation */}
                        <span class="text-xs font-extrabold text-brand-blue">
                          ₹{Math.round(finalPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Footer containing Pricing & Checkout Trigger */}
          {cartItems.length > 0 && (
            <div class="p-6 border-t border-slate-100 bg-slate-50/50">
              
              <div class="space-y-2.5 mb-6">
                <div class="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Bag Subtotal</span>
                  <span>₹{Math.round(total).toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Luxury Delivery</span>
                  <span class="text-emerald-600 font-bold uppercase tracking-wider">Free Shipping</span>
                </div>
                <div class="h-px bg-slate-200/80 my-2" />
                <div class="flex justify-between items-baseline">
                  <span class="text-sm font-bold text-slate-800">Total Payable</span>
                  <span class="text-xl font-extrabold text-brand-blue">
                    ₹{Math.round(total).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={onCheckout}
                class="w-full flex items-center justify-center gap-2 py-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95"
              >
                <ShieldCheck class="w-4.5 h-4.5 text-brand-orange" />
                Proceed to Checkout
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
