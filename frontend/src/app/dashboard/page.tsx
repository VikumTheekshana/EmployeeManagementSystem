'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Banknote,
  CalendarCheck,
  Package,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';

export default function OverviewDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [revealSensitive, setRevealSensitive] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [myBalances, setMyBalances] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('hrms_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [revealSensitive, user]);

  const loadDashboardData = async () => {
    setLoading(true);
    const isEmployee = user?.role === 'Employee';

    try {
      if (isEmployee) {
        // Employee-specific non-privileged endpoints
        const [empRes, balRes, attRes, payRes, assetRes] = await Promise.allSettled([
          api.getEmployees(false),
          api.getMyLeaveBalances(),
          api.getTodayAttendance(),
          api.getMyPayslips(),
          api.getAssets(),
        ]);

        if (empRes.status === 'fulfilled' && empRes.value.success) setEmployees(empRes.value.data);
        if (balRes.status === 'fulfilled' && balRes.value.success) setMyBalances(balRes.value.data);
        if (attRes.status === 'fulfilled' && attRes.value.success) setTodayAttendance(attRes.value.data);
        if (payRes.status === 'fulfilled' && payRes.value.success) setMyPayslips(payRes.value.data);
        if (assetRes.status === 'fulfilled' && assetRes.value.success) setAssets(assetRes.value.data);
      } else {
        // Admin / Manager endpoints
        const [empRes, leaveRes, payRes, assetRes, auditRes] = await Promise.allSettled([
          api.getEmployees(revealSensitive),
          api.getLeaveRequests('Pending'),
          api.getPayrollRuns(),
          api.getAssets(),
          api.getAuditLogs(10),
        ]);

        if (empRes.status === 'fulfilled' && empRes.value.success) setEmployees(empRes.value.data);
        if (leaveRes.status === 'fulfilled' && leaveRes.value.success) setLeaveRequests(leaveRes.value.data);
        if (payRes.status === 'fulfilled' && payRes.value.success) setPayrollRuns(payRes.value.data);
        if (assetRes.status === 'fulfilled' && assetRes.value.success) setAssets(assetRes.value.data);
        if (auditRes.status === 'fulfilled' && auditRes.value.success) setAuditLogs(auditRes.value.data.logs || []);
      }
    } catch (e) {
      console.error('Error fetching dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  const latestPayroll = payrollRuns[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Zero-Trust Security Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">HR Executive Operations Hub</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time multi-tenant monitoring, encrypted employee 360, Sri Lankan statutory payroll, and local RAG AI.
          </p>
        </div>

        {/* Dynamic Data Masking Switch */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 relative z-10">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200">Sensitive Data Masking</div>
            <div className="text-[10px] text-slate-400">
              {revealSensitive ? 'Unmasked (Audited)' : 'Masked (Default)'}
            </div>
          </div>
          <button
            onClick={() => setRevealSensitive(!revealSensitive)}
            className={`p-2 rounded-lg transition-all ${
              revealSensitive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
            }`}
            title="Toggle Zero-Trust Data Masking"
          >
            {revealSensitive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Headcount */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Active Headcount</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{employees.length}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>100% tenant isolated (M0 indexed)</span>
          </div>
        </div>

        {/* Monthly Payroll Total */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Latest Net Payroll</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {latestPayroll
              ? revealSensitive
                ? `LKR ${latestPayroll.totalNetPay.toLocaleString()}`
                : 'LKR ••••••••'
              : 'LKR 0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            EPF (8%/12%) + ETF (3%) Compliant
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Pending Leave Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{leaveRequests.length}</div>
          <div className="text-[11px] text-amber-400 mt-1">
            {leaveRequests.length > 0 ? 'Requires Manager/HR Action' : 'All Requests Cleared'}
          </div>
        </div>

        {/* Company Assets Tracked */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">IT Hardware Assets</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{assets.length}</div>
          <div className="text-[11px] text-purple-400 mt-1">
            {assets.filter((a) => a.status === 'Allocated').length} Allocated •{' '}
            {assets.filter((a) => a.status === 'Available').length} Available
          </div>
        </div>
      </div>

      {/* Quick Launchpad & RAG Assistant Promo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Workflows */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Enterprise Quick Workflows
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/dashboard/employees"
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all group flex items-start justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">
                  Onboard New Employee
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  FLE encrypted salary, bank details & document vault.
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </a>

            <a
              href="/dashboard/attendance"
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all group flex items-start justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">
                  Dynamic QR Attendance Kiosk
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Live rotating 30-sec tokens & geofence mobile punch.
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </a>

            <a
              href="/dashboard/payroll"
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all group flex items-start justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">
                  Run Statutory Payroll
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Compute APIT slabs, PDF payslips & SLIPS bank file.
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </a>

            <a
              href="/dashboard/lifecycle"
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all group flex items-start justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">
                  Offboarding Multi-Gate Clearance
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  IT recovery, Finance gratuity & HR sign-off gates.
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </a>
          </div>
        </div>

        {/* AI Policy Assistant Callout */}
        <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-900/30 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Internal HR Policy Assistant</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Instant answers grounded in Sri Lankan labor law (Shop & Office Employees Act, Gratuity Act No. 12) & company policies using local TF-IDF semantic vector search.
            </p>
          </div>
          <a
            href="/dashboard/rag"
            className="mt-4 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold text-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Launch Policy AI Assistant
          </a>
        </div>
      </div>

      {/* Recent Security Audit Trail */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Live Zero-Trust Audit Trail</h2>
          </div>
          <a href="/dashboard/audit" className="text-xs text-indigo-400 hover:underline">
            View Full Trail &rarr;
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2.5 font-medium">Timestamp</th>
                <th className="pb-2.5 font-medium">Action</th>
                <th className="pb-2.5 font-medium">Actor</th>
                <th className="pb-2.5 font-medium">Resource</th>
                <th className="pb-2.5 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.length > 0 ? (
                auditLogs.map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-mono text-indigo-300 font-semibold">{log.action}</td>
                    <td className="py-2.5 text-slate-400">{log.userName || log.userRole || 'System'}</td>
                    <td className="py-2.5 text-slate-400">{log.resource}</td>
                    <td className="py-2.5 font-mono text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No recent audit logs recorded for this tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
