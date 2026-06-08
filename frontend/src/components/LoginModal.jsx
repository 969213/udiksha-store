import React, { useState } from 'react';
import { X, Phone, KeyRound, Mail, ShieldAlert } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, triggerSmsAlert }) {
  const [loginTab, setLoginTab] = useState('phone'); // 'phone' or 'password'
  
  // Phone OTP Auth State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Email Password Auth State (Legacy Admin Login)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      
      setOtpSent(true);
      // Trigger the mock SMS notification on the screen
      if (data.otp && triggerSmsAlert) {
        triggerSmsAlert(phone, data.otp);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP.');
      }

      onLoginSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      onLoginSuccess({
        token: data.token,
        username: data.username,
        role: 'admin' // By definition, password logins here are admin
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-white/20">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h2 className="font-serif-brand text-xl font-bold text-slate-800">Secure Portal Login</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 m-4 rounded-xl border border-slate-200">
          <button
            onClick={() => { setLoginTab('phone'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              loginTab === 'phone'
                ? 'bg-white text-brand-blue shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-brand-blue'
            }`}
          >
            Phone & OTP
          </button>
          <button
            onClick={() => { setLoginTab('password'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              loginTab === 'password'
                ? 'bg-white text-brand-blue shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-brand-blue'
            }`}
          >
            Admin Password
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 pt-2">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200/50 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {error}
            </div>
          )}

          {loginTab === 'phone' ? (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Phone Number</label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9519764098"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-blue text-xs font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-blue/10 disabled:opacity-50"
                  >
                    {otpLoading ? 'Generating OTP...' : 'Send Verification OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Enter OTP Code</label>
                    <div className="relative flex items-center">
                      <KeyRound className="absolute left-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={4}
                        placeholder="Enter 4-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-blue text-xs font-medium text-slate-700 tracking-[0.5em] text-center"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400 mt-1.5 text-center font-medium">
                      Enter the OTP code shown in your screen SMS pop-up.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-1/3 py-4 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-full font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={verifyLoading}
                      className="w-2/3 py-4 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-orange/10 disabled:opacity-50"
                    >
                      {verifyLoading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                Enter <strong className="text-brand-blue">+919519764098</strong> (Owner) or <strong className="text-brand-blue">+918114247911</strong> (Developer) to log in as Admin. Any other number logs you in as a Customer.
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Admin Username</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email (mbhola099@gmail.com)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-blue text-xs font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Password</label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-blue text-xs font-medium text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-blue/10 disabled:opacity-50"
              >
                {passwordLoading ? 'Authenticating...' : 'Secure Password Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
