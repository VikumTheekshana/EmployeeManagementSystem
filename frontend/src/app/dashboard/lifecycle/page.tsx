'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  PlusCircle,
  Laptop,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  UserMinus,
  Check,
  Building,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function LifecyclePage() {
  const [activeTab, setActiveTab] = useState<'assets' | 'offboarding'>('assets');
  const [assets, setAssets] = useState<any[]>([]);
  const [offboardings, setOffboardings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Asset register modal
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({
    assetTag: `AST-LP-${Math.floor(Math.random() * 9000) + 1000}`,
    serialNumber: `SN-MACBOOK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    name: 'Apple MacBook Pro 16" M3 Max',
    category: 'Laptop',
    estimatedValueLKR: 850000,
    condition: 'BrandNew',
  });

  // Resignation modal
  const [showResignModal, setShowResignModal] = useState(false);
  const [resignForm, setResignForm] = useState({
    employeeId: '',
    resignationDate: new Date().toISOString().split('T')[0],
    lastWorkingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: 'Career transition and personal development',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetRes, offRes, empRes] = await Promise.all([
        api.getAssets(),
        api.getOffboardings(),
        api.getEmployees(),
      ]);

      if (assetRes.success) setAssets(assetRes.data);
      if (offRes.success) setOffboardings(offRes.data);
      if (empRes.success) {
        setEmployees(empRes.data);
        if (empRes.data.length > 0 && !resignForm.employeeId) {
          setResignForm((prev) => ({ ...prev, employeeId: empRes.data[0]._id }));
        }
      }
    } catch (e) {
      console.error('Failed to load lifecycle data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.registerAsset(assetForm);
      if (res.success) {
        setMessage('Company asset successfully registered into inventory.');
        setShowAssetModal(false);
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Asset registration failed');
    }
  };

  const handleResign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.resign(resignForm);
      if (res.success) {
        setMessage('Resignation recorded! Automated event hook dispatched offboarding clearance workflow.');
        setShowResignModal(false);
        setActiveTab('offboarding');
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Resignation request failed');
    }
  };

  const handleClearIT = async (id: string) => {
    try {
      const res = await api.clearITGate(id, 'All hardware assets recovered and corporate access credentials revoked.');
      if (res.success) {
        setMessage('IT Clearance approved successfully.');
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'IT clearance failed');
    }
  };

  const handleClearFinance = async (id: string) => {
    try {
      const res = await api.clearFinanceGate(id, 'Statutory gratuity calculated under Payment of Gratuity Act No. 12.');
      if (res.success) {
        setMessage('Finance Clearance approved with statutory settlement.');
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Finance clearance failed');
    }
  };

  const handleClearHR = async (id: string) => {
    try {
      const res = await api.clearHRGate(id, 'Exit interview completed. Certificate of Service released.');
      if (res.success) {
        setMessage('HR Exit approved. Employee status updated to Terminated and user login disabled.');
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'HR clearance failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            Asset Inventory & Lifecycle Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise hardware custody tracking, onboarding checklists, and automated multi-gate offboarding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResignModal(true)}
            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserMinus className="w-4 h-4" />
            <span>Initiate Offboarding</span>
          </button>
          <button
            onClick={() => setShowAssetModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 px-4 transition-all ${
            activeTab === 'assets'
              ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Company Hardware Assets ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('offboarding')}
          className={`pb-3 px-4 transition-all ${
            activeTab === 'offboarding'
              ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Offboarding Multi-Gate Approvals ({offboardings.length})
        </button>
      </div>

      {activeTab === 'assets' ? (
        /* Assets Table */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Asset Tag</th>
                  <th className="pb-3 font-semibold">Hardware Name</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Serial Number</th>
                  <th className="pb-3 font-semibold">Assigned Employee</th>
                  <th className="pb-3 font-semibold">Value (LKR)</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {assets.length > 0 ? (
                  assets.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-mono font-bold text-indigo-400">{a.assetTag}</td>
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{a.name}</span>
                      </td>
                      <td className="py-3 text-slate-400">{a.category}</td>
                      <td className="py-3 font-mono text-[11px] text-slate-400">{a.serialNumber}</td>
                      <td className="py-3">
                        {a.assignedTo ? (
                          <div>
                            <span className="font-semibold text-white">{a.assignedTo.fullName}</span>
                            <div className="text-[10px] text-slate-400">{a.assignedTo.designation}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">In Corporate Stock</span>
                        )}
                      </td>
                      <td className="py-3 font-mono">{a.estimatedValueLKR?.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            a.status === 'Allocated'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No assets registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Offboarding Clearance Pipeline */
        <div className="space-y-4">
          {offboardings.map((ob) => (
            <div key={ob._id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <div className="font-bold text-sm text-white">
                    {ob.employeeId?.fullName} ({ob.employeeId?.employeeCode})
                  </div>
                  <div className="text-xs text-slate-400">
                    Last Day: {new Date(ob.lastWorkingDate).toLocaleDateString()} • Reason: {ob.reason}
                  </div>
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Workflow Status: {ob.status}
                  </span>
                </div>
              </div>

              {/* 3 Clearance Gates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Gate 1: IT Gate */}
                <div
                  className={`p-4 rounded-xl border ${
                    ob.itGate?.cleared
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-200">1. IT Asset Recovery Gate</span>
                    {ob.itGate?.cleared ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Cleared
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400">Pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    {ob.itGate?.notes || 'Verify laptop and account revoke.'}
                  </p>
                  {!ob.itGate?.cleared && (
                    <button
                      onClick={() => handleClearIT(ob._id)}
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Sign Off IT Gate
                    </button>
                  )}
                </div>

                {/* Gate 2: Finance Gate */}
                <div
                  className={`p-4 rounded-xl border ${
                    ob.financeGate?.cleared
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-200">2. Finance & Gratuity Gate</span>
                    {ob.financeGate?.cleared ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Cleared
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400">Pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    Gratuity (Act 12):{' '}
                    <span className="text-emerald-400 font-bold">
                      LKR {ob.financeGate?.finalGratuityLKR?.toLocaleString() || 0}
                    </span>
                  </p>
                  {ob.itGate?.cleared && !ob.financeGate?.cleared && (
                    <button
                      onClick={() => handleClearFinance(ob._id)}
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Sign Off Finance Gate
                    </button>
                  )}
                </div>

                {/* Gate 3: HR Final Gate */}
                <div
                  className={`p-4 rounded-xl border ${
                    ob.hrGate?.cleared
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-200">3. HR Final Exit Gate</span>
                    {ob.hrGate?.cleared ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Exited
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400">Pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    Exit interview & service letter issuance.
                  </p>
                  {ob.financeGate?.cleared && !ob.hrGate?.cleared && (
                    <button
                      onClick={() => handleClearHR(ob._id)}
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Finalize Exit & Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4">Register Company Asset</h2>
            <form onSubmit={handleRegisterAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Tag</label>
                <input
                  type="text"
                  required
                  value={assetForm.assetTag}
                  onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hardware Name</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="MobilePhone">Mobile Phone</option>
                    <option value="AccessCard">Access Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Value (LKR)</label>
                  <input
                    type="number"
                    value={assetForm.estimatedValueLKR}
                    onChange={(e) => setAssetForm({ ...assetForm, estimatedValueLKR: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resignation Modal */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2">Initiate Offboarding Clearance</h2>
            <p className="text-xs text-slate-400 mb-4">
              Dispatches automated event hook to lock assets and open clearance gates.
            </p>

            <form onSubmit={handleResign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Employee</label>
                <select
                  value={resignForm.employeeId}
                  onChange={(e) => setResignForm({ ...resignForm, employeeId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.fullName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Last Working Day</label>
                <input
                  type="date"
                  required
                  value={resignForm.lastWorkingDate}
                  onChange={(e) => setResignForm({ ...resignForm, lastWorkingDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Resignation</label>
                <textarea
                  rows={3}
                  required
                  value={resignForm.reason}
                  onChange={(e) => setResignForm({ ...resignForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResignModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/30"
                >
                  Confirm & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
