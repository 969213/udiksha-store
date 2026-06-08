import React, { useState } from 'react';
import { X, MapPin, CreditCard, KeyRound, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';

export default function Checkout({ isOpen, onClose, cartItems, onClearCart }) {
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: OTP, 4: Invoice
  const [addressForm, setAddressForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' or 'Card'
  const [paymentDetails, setPaymentDetails] = useState({
    vpa: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState(null);

  if (!isOpen) return null;

  const total = cartItems.reduce((sum, item) => {
    const finalPrice = item.product.base_price * (1 - item.product.discount_percent / 100);
    return sum + finalPrice * item.quantity;
  }, 0);

  // Handlers
  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.email || !addressForm.phone || !addressForm.address || !addressForm.city || !addressForm.zip) {
      alert('Please fill out all address details.');
      return;
    }
    setStep(2);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (paymentMethod === 'UPI' && !paymentDetails.vpa) {
      alert('Please enter your Virtual Payment Address (e.g. user@upi).');
      return;
    }
    if (paymentMethod === 'Card' && (!paymentDetails.cardNumber || !paymentDetails.expiry || !paymentDetails.cvv)) {
      alert('Please enter all card details.');
      return;
    }
    setStep(3);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Call backend OTP verification
      const otpRes = await fetch(`${API_URL}/api/orders/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode })
      });
      
      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        throw new Error(otpData.error || 'Incorrect OTP');
      }

      // OTP verified! Now create order on backend
      const orderPayload = {
        customer_name: addressForm.name,
        customer_email: addressForm.email,
        customer_phone: addressForm.phone,
        delivery_address: `${addressForm.address}, ${addressForm.city} - ${addressForm.zip}`,
        total_paid: total,
        payment_method: paymentMethod,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          product_title: item.product.title,
          size_label: item.size,
          color_name: item.color.name,
          quantity: item.quantity,
          price: item.product.base_price * (1 - item.product.discount_percent / 100)
        }))
      };

      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to place order');
      }

      // Order Success! Set invoice and go to Step 4
      setInvoice(orderData);
      setStep(4);
      onClearCart();
    } catch (error) {
      setOtpError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
      <div class="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-white/20">
        
        {/* Header */}
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">💳</span>
            <h2 class="font-serif-brand text-xl font-bold text-slate-800">Secure Checkout</h2>
          </div>
          {step < 4 && (
            <button 
              onClick={onClose}
              class="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Tracker Steps */}
        <div class="px-8 py-4 bg-slate-50 border-b border-slate-200/50 flex items-center justify-between text-xs font-bold text-slate-400">
          <div class={`flex items-center gap-1.5 ${step >= 1 ? 'text-brand-blue' : ''}`}>
            <span class={`w-5 h-5 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'}`}>1</span>
            <span>Address</span>
          </div>
          <ChevronRight class="w-3.5 h-3.5" />
          <div class={`flex items-center gap-1.5 ${step >= 2 ? 'text-brand-blue' : ''}`}>
            <span class={`w-5 h-5 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'}`}>2</span>
            <span>Payment</span>
          </div>
          <ChevronRight class="w-3.5 h-3.5" />
          <div class={`flex items-center gap-1.5 ${step >= 3 ? 'text-brand-blue' : ''}`}>
            <span class={`w-5 h-5 rounded-full flex items-center justify-center border ${step >= 3 ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'}`}>3</span>
            <span>Verification</span>
          </div>
          <ChevronRight class="w-3.5 h-3.5" />
          <div class={`flex items-center gap-1.5 ${step >= 4 ? 'text-brand-blue' : ''}`}>
            <span class={`w-5 h-5 rounded-full flex items-center justify-center border ${step >= 4 ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'}`}>4</span>
            <span>Receipt</span>
          </div>
        </div>

        {/* Step Contents */}
        <div class="p-6 md:p-8 overflow-y-auto max-h-[450px]">
          
          {/* STEP 1: ADDRESS DETAILS */}
          {step === 1 && (
            <form onSubmit={handleAddressSubmit} class="space-y-4">
              <div class="flex items-center gap-2 mb-2">
                <MapPin class="w-4 h-4 text-brand-orange" />
                <span class="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Delivery Details</span>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue text-sm"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue text-sm"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email for receipt"
                  value={addressForm.email}
                  onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue text-sm"
                />
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Street Address</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Enter full home address"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue text-sm resize-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="City name"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue text-sm"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zip Code</label>
                  <input
                    type="text"
                    required
                    placeholder="ZIP / Pin code"
                    value={addressForm.zip}
                    onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                class="w-full mt-4 py-3.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                <span>Select Payment</span>
                <ChevronRight class="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: SIMULATED PAYMENT SELECTION */}
          {step === 2 && (
            <form onSubmit={handlePaymentSubmit} class="space-y-6">
              <div class="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  class="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-brand-blue"
                >
                  <ArrowLeft class="w-3.5 h-3.5" />
                  <span>Back to Address</span>
                </button>
                <span class="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Select Payment</span>
              </div>

              {/* Selector tabs */}
              <div class="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  class={`p-4 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center gap-2 ${
                    paymentMethod === 'UPI'
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-bold shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span class="text-xl">📱</span>
                  <span class="text-xs uppercase tracking-wider">Simulated UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  class={`p-4 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center gap-2 ${
                    paymentMethod === 'Card'
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-bold shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <CreditCard class="w-5 h-5 text-brand-orange" />
                  <span class="text-xs uppercase tracking-wider">Simulated Card</span>
                </button>
              </div>

              {/* Dynamic input form depending on selection */}
              {paymentMethod === 'UPI' ? (
                <div class="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">UPI ID (VPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. name@okaxis"
                      value={paymentDetails.vpa}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, vpa: e.target.value })}
                      class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-blue text-sm"
                    />
                  </div>
                  <div class="text-center py-2 flex flex-col items-center gap-1.5">
                    <div class="w-24 h-24 bg-slate-200 border-2 border-slate-300 rounded-lg flex items-center justify-center font-bold text-[10px] text-slate-500">
                      QR SIMULATOR
                    </div>
                    <span class="text-[10px] text-slate-400 font-medium leading-relaxed">
                      UPI apps will simulate this transactions securely.
                    </span>
                  </div>
                </div>
              ) : (
                <div class="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Card Holder Name</label>
                    <input
                      type="text"
                      placeholder="Enter name on card"
                      class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={paymentDetails.cardNumber}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                      class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none text-sm"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={paymentDetails.expiry}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength="3"
                        value={paymentDetails.cvv}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                class="w-full py-3.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                <span>Request OTP</span>
                <ChevronRight class="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 3: SIMULATED OTP VERIFICATION */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} class="space-y-6 text-center">
              <div class="flex items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  class="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-brand-blue"
                >
                  <ArrowLeft class="w-3.5 h-3.5" />
                  <span>Back to Payment</span>
                </button>
              </div>

              <div class="flex flex-col items-center gap-3">
                <div class="p-3 bg-brand-orange/10 rounded-full text-brand-orange">
                  <KeyRound class="w-8 h-8" />
                </div>
                <h3 class="font-serif-brand text-xl font-bold text-slate-800">OTP Security Check</h3>
                <p class="text-xs text-slate-400 max-w-sm leading-relaxed">
                  We have simulated a crypt OTP session token dispatch to your phone. 
                  <br />
                  <span class="text-brand-orange font-bold">Use verification OTP: 1234</span>
                </p>
              </div>

              <div class="max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength="4"
                  placeholder="Enter 4-Digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  class="w-full text-center px-4 py-4 rounded-xl border-2 border-slate-200 font-mono text-2xl tracking-widest focus:outline-none focus:border-brand-blue"
                />
                {otpError && (
                  <p class="text-xs text-red-500 font-bold mt-2">{otpError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                class="w-full py-4 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-lg shadow-brand-orange/20"
              >
                {loading ? 'Verifying Secure Token...' : 'Confirm Payment & Order'}
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS INVOICE */}
          {step === 4 && invoice && (
            <div class="space-y-6 fade-in">
              <div class="flex flex-col items-center text-center gap-2">
                <CheckCircle2 class="w-12 h-12 text-emerald-500 fill-emerald-100" />
                <h3 class="font-serif-brand text-2xl font-bold text-slate-800">Order Placed Successfully!</h3>
                <span class="text-xs font-extrabold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">
                  Payment Confirmed
                </span>
              </div>

              {/* Invoice Specs */}
              <div class="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4 font-sans text-xs">
                
                <div class="flex justify-between items-center pb-3 border-b border-slate-200">
                  <div>
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Bill ID (Order ID)</span>
                    <span class="text-sm font-extrabold text-brand-blue">{invoice.bill_id}</span>
                  </div>
                  <div class="text-right">
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Receipt Date</span>
                    <span class="font-medium text-slate-600">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                  <div>
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                    <span class="font-bold text-slate-700">{invoice.customer_name}</span>
                    <span class="block text-slate-500 font-light mt-0.5">{invoice.customer_email}</span>
                  </div>
                  <div>
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Delivery Address</span>
                    <p class="font-light text-slate-500 leading-normal line-clamp-2">{invoice.delivery_address}</p>
                  </div>
                </div>

                {/* Items in Invoice */}
                <div>
                  <span class="block text-[10px] font-bold text-slate-400 uppercase mb-2">Order Items</span>
                  <div class="space-y-2 max-h-32 overflow-y-auto">
                    {cartItems.map((item, idx) => (
                      <div key={idx} class="flex justify-between text-slate-600 font-medium">
                        <span>
                          {item.product.title} (x{item.quantity}) - {item.size} / {item.color.name}
                        </span>
                        <span>
                          ₹{Math.round(
                            item.product.base_price * (1 - item.product.discount_percent / 100) * item.quantity
                          ).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span class="text-xs font-bold text-slate-700">Total Paid via {invoice.payment_method}</span>
                  <span class="text-base font-extrabold text-brand-blue">
                    ₹{Math.round(invoice.total_paid).toLocaleString()}
                  </span>
                </div>

              </div>

              {/* Status Tracker */}
              <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Delivery Dispatch Status</span>
                
                <div class="grid grid-cols-4 gap-2 relative">
                  {/* Status Indicator Bar */}
                  <div class="absolute top-2 left-6 right-6 h-0.5 bg-slate-200 -z-10" />

                  <div class="text-center flex flex-col items-center">
                    <span class="w-4.5 h-4.5 rounded-full bg-brand-blue text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                    <span class="text-[9px] font-bold text-brand-blue mt-1">Placed</span>
                  </div>
                  <div class="text-center flex flex-col items-center">
                    <span class="w-4.5 h-4.5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[8px] font-bold">2</span>
                    <span class="text-[9px] font-bold text-slate-400 mt-1">Processing</span>
                  </div>
                  <div class="text-center flex flex-col items-center">
                    <span class="w-4.5 h-4.5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[8px] font-bold">3</span>
                    <span class="text-[9px] font-bold text-slate-400 mt-1">Dispatched</span>
                  </div>
                  <div class="text-center flex flex-col items-center">
                    <span class="w-4.5 h-4.5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[8px] font-bold">4</span>
                    <span class="text-[9px] font-bold text-slate-400 mt-1">Delivered</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                class="w-full py-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Close & Return
              </button>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
