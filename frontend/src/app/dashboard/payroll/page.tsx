'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Play,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  Building,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function PayrollPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [month, setMonth] = useState(9);
  const [year, setYear] = useState(2026);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('hrms_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        if (u.role === 'Employee') {
          loadMyPayslips();
        } else {
          loadPayrollRuns();
        }
      } catch (e) {
        loadPayrollRuns();
      }
    } else {
      loadPayrollRuns();
    }
  }, []);

  const loadMyPayslips = async () => {
    setLoading(true);
    try {
      const res = await api.getMyPayslips();
      if (res.success) {
        setPayslips(res.data);
      }
    } catch (e: any) {
      console.error('Failed to load my payslips:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollRuns = async () => {
    setLoading(true);
    try {
      const res = await api.getPayrollRuns();
      if (res.success && res.data.length > 0) {
        setRuns(res.data);
        loadRunPayslips(res.data[0]);
      }
    } catch (e) {
      console.error('Failed to load payroll runs:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRunPayslips = async (run: any) => {
    setSelectedRun(run);
    try {
      const res = await api.getRunPayslips(run._id);
      if (res.success) {
        setPayslips(res.data);
      }
    } catch (e) {
      console.error('Failed to load payslips:', e);
    }
  };

  const handleExecutePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.executePayrollRun(month, year);
      if (res.success) {
        setMessage(`Payroll for ${month}/${year} executed and approved successfully!`);
        setShowRunModal(false);
        loadPayrollRuns();
      }
    } catch (err: any) {
      setError(err.message || 'Payroll execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote className="w-6 h-6 text-indigo-400" />
            {user?.role === 'Employee' ? 'My Confidential Payslips & Statutory Taxes' : 'Sri Lankan Statutory Compliance & Payroll Engine'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {user?.role === 'Employee'
              ? 'View and download official computer-generated PDF payslips with EPF, ETF, and APIT breakdown.'
              : 'EPF (8% Employee / 12% Employer), ETF (3%), Inland Revenue APIT progressive tax brackets, and SLIPS payment files.'}
          </p>
        </div>

        {user?.role !== 'Employee' && (
          <button
            onClick={() => setShowRunModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Execute Monthly Payroll</span>
          </button>
        )}
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

      {/* Statutory Formula Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold text-white mb-1">EPF (Provident Fund)</div>
          <p className="text-[11px] text-slate-400">
            Employee: <span className="text-indigo-400 font-bold">8%</span> • Employer:{' '}
            <span className="text-indigo-400 font-bold">12%</span>
          </p>
          <div className="text-[10px] text-slate-500 mt-2">EPF Act No. 15 of 1958</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold text-white mb-1">ETF (Trust Fund)</div>
          <p className="text-[11px] text-slate-400">
            Employer Contribution: <span className="text-emerald-400 font-bold">3%</span> (Non-deductible from employee)
          </p>
          <div className="text-[10px] text-slate-500 mt-2">ETF Act No. 46 of 1980</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold text-white mb-1">APIT / PAYE Progressive Tax</div>
          <p className="text-[11px] text-slate-400">
            0% up to LKR 100k • Progressive 6% - 36%
          </p>
          <div className="text-[10px] text-slate-500 mt-2">Inland Revenue Department Guidelines</div>
        </div>
      </div>

      {/* Historical Payroll Runs (Admin/HR Only) */}
      {user?.role !== 'Employee' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Historical Payroll Cycles</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Period</th>
                  <th className="pb-3 font-semibold">Headcount</th>
                  <th className="pb-3 font-semibold">Gross Total</th>
                  <th className="pb-3 font-semibold">EPF (Emp 8%)</th>
                  <th className="pb-3 font-semibold">EPF (Co 12%)</th>
                  <th className="pb-3 font-semibold">ETF (3%)</th>
                  <th className="pb-3 font-semibold">APIT Tax</th>
                  <th className="pb-3 font-semibold">Net Disbursed</th>
                  <th className="pb-3 font-semibold text-right">Exports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {runs.length > 0 ? (
                  runs.map((r) => (
                    <tr
                      key={r._id}
                      onClick={() => loadRunPayslips(r)}
                      className={`cursor-pointer transition-colors ${
                        selectedRun?._id === r._id ? 'bg-indigo-600/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-3 font-bold text-white">
                        {r.month}/{r.year}
                      </td>
                      <td className="py-3 font-mono">{r.totalEmployees}</td>
                      <td className="py-3 font-mono">LKR {r.totalGross?.toLocaleString()}</td>
                      <td className="py-3 font-mono text-indigo-400">LKR {r.totalEPFEmployee?.toLocaleString()}</td>
                      <td className="py-3 font-mono text-indigo-300">LKR {r.totalEPFEmployer?.toLocaleString()}</td>
                      <td className="py-3 font-mono text-emerald-400">LKR {r.totalETF?.toLocaleString()}</td>
                      <td className="py-3 font-mono text-amber-400">LKR {r.totalAPIT?.toLocaleString()}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        LKR {r.totalNetPay?.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={api.getSlipsUrl(r._id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg text-[11px] font-semibold transition-all"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>SLIPS CSV</span>
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500">
                      No payroll runs executed yet. Click &quot;Execute Monthly Payroll&quot; to compute.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Run Payslips Breakdown OR Employee Personal Payslips */}
      {(selectedRun || user?.role === 'Employee') && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                {user?.role === 'Employee'
                  ? 'My Monthly Payslips Archive'
                  : `Detailed Payslips for Cycle: ${selectedRun?.month}/${selectedRun?.year}`}
              </h2>
              <p className="text-xs text-slate-400">
                Encrypted salary calculation verified with cryptographic PDF export.
              </p>
            </div>
            {user?.role !== 'Employee' && selectedRun && (
              <a
                href={api.getSlipsUrl(selectedRun._id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                <Download className="w-4 h-4" />
                <span>Export SLIPS Bank File</span>
              </a>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Employee</th>
                  <th className="pb-3 font-semibold">Basic (LKR)</th>
                  <th className="pb-3 font-semibold">Gross (LKR)</th>
                  <th className="pb-3 font-semibold">EPF 8%</th>
                  <th className="pb-3 font-semibold">APIT Tax</th>
                  <th className="pb-3 font-semibold">Net Pay (LKR)</th>
                  <th className="pb-3 font-semibold">Cost to Company</th>
                  <th className="pb-3 font-semibold text-right">PDF Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payslips.map((ps) => (
                  <tr key={ps._id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-medium text-white">
                      <div>{ps.employeeId?.fullName}</div>
                      <div className="text-[11px] text-slate-400">{ps.employeeId?.employeeCode}</div>
                    </td>
                    <td className="py-3 font-mono">{ps.basicSalary?.toLocaleString()}</td>
                    <td className="py-3 font-mono">{ps.grossEarnings?.toLocaleString()}</td>
                    <td className="py-3 font-mono text-indigo-400">-{ps.epfEmployee?.toLocaleString()}</td>
                    <td className="py-3 font-mono text-amber-400">-{ps.apitTax?.toLocaleString()}</td>
                    <td className="py-3 font-mono font-bold text-emerald-400">{ps.netSalary?.toLocaleString()}</td>
                    <td className="py-3 font-mono text-slate-400">{ps.costToCompany?.toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <a
                        href={api.getPdfUrl(ps._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-[11px] font-semibold transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Execute Payroll Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2">Execute Statutory Payroll</h2>
            <p className="text-xs text-slate-400 mb-4">
              Computes EPF (8%/12%), ETF (3%), and progressive APIT brackets for all active employees.
            </p>

            <form onSubmit={handleExecutePayroll} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        Month {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {executing ? 'Processing Slabs...' : 'Compute & Disburse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
