'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Building2, User, KeyRound, ArrowRight, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [tenantId, setTenantId] = useState('apex-ceylon');
  const [email, setEmail] = useState('admin@apexceylon.com');
  const [password, setPassword] = useState('Admin@12345');

  // Register form state
  const [orgName, setOrgName] = useState('Apex Global Technologies');
  const [newTenantId, setNewTenantId] = useState('apex-global');
  const [adminFullName, setAdminFullName] = useState('Kavinda Perera');
  const [adminEmail, setAdminEmail] = useState('kavinda@apexglobal.com');
  const [adminPassword, setAdminPassword] = useState('Admin@12345');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ tenantId, email, password });
      if (res.success && res.data.accessToken) {
        setAuthToken(res.data.accessToken);
        localStorage.setItem('hrms_user', JSON.stringify(res.data.user));
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.registerOrg({
        tenantId: newTenantId,
        organizationName: orgName,
        adminFullName,
        adminEmail,
        adminPassword,
      });

      if (res.success && res.data.tokens?.accessToken) {
        setAuthToken(res.data.tokens.accessToken);
        localStorage.setItem('hrms_user', JSON.stringify(res.data.user));
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleLogin = async (role: 'Employee' | 'Manager' | 'Admin') => {
    setLoading(true);
    setError(null);

    const creds = {
      Admin: { email: 'admin@apexceylon.com', password: 'Admin@12345' },
      Manager: { email: 'dulari@apexceylon.com', password: 'Manager@123' },
      Employee: { email: 'roshan@apexceylon.com', password: 'Employee@123' },
    }[role];

    try {
      const res = await api.login({
        tenantId: 'apex-ceylon',
        email: creds.email,
        password: creds.password,
      });

      if (res.success && res.data.accessToken) {
        setAuthToken(res.data.accessToken);
        localStorage.setItem('hrms_user', JSON.stringify(res.data.user));
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(`Failed to sign in as ${role}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Branding */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Shield className="w-4 h-4 text-indigo-400" />
          Zero-Trust Security & Sri Lankan Statutory HRMS
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2">
          Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">HRMS</span>
        </h1>
        <p className="text-slate-400 max-w-md mx-auto text-sm sm:text-base">
          AES-256-GCM Field-Level Encryption, Statutory Payroll (EPF/ETF/APIT), Dynamic QR Attendance & Local AI RAG.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Toggle Mode */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Organization
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tenant Slug</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="e.g. apex-ceylon"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organization Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Apex Global Technologies"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tenant ID Slug</label>
              <input
                type="text"
                required
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                placeholder="e.g. apex-global"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">SuperAdmin Full Name</label>
              <input
                type="text"
                required
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                placeholder="e.g. Kavinda Perera"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? 'Initializing Zero-Trust Workspace...' : 'Register Organization'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Instant Role Selectors */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400 mb-3 font-medium">Try out role perspectives with one click:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickRoleLogin('Employee')}
              disabled={loading}
              className="py-2 px-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-xl text-[11px] font-semibold text-indigo-300 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Employee</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleLogin('Manager')}
              disabled={loading}
              className="py-2 px-2 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 rounded-xl text-[11px] font-semibold text-purple-300 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleLogin('Admin')}
              disabled={loading}
              className="py-2 px-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 rounded-xl text-[11px] font-semibold text-emerald-300 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>SuperAdmin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Guarantees Footer */}
      <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500 relative z-10">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>MongoDB Atlas M0 MaxPool: 10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256-GCM FLE Encryption</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sri Lanka EPF / ETF / APIT Ready</span>
        </div>
      </div>
    </main>
  );
}
