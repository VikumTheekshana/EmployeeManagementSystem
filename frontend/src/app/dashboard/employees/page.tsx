'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Eye,
  EyeOff,
  Search,
  Building2,
  FileText,
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
  Lock,
  GitBranch,
  X,
  Upload,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'hierarchy'>('directory');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Onboard modal state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [form, setForm] = useState({
    employeeCode: `EMP-000${Math.floor(Math.random() * 900) + 100}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '+94 77 123 4567',
    department: 'Engineering',
    designation: 'Software Engineer',
    reportsTo: '',
    nationalId: '199512345678',
    basicSalary: '250000',
    bankName: 'Commercial Bank of Ceylon',
    bankBranch: 'Head Office - Colombo',
    bankAccountNumber: '800123456789',
    bankAccountHolder: '',
    createUserAccount: true,
    userRole: 'Employee',
  });

  // Selected Employee 360 Drawer
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [revealSensitive]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empRes, hierRes] = await Promise.all([
        api.getEmployees(revealSensitive),
        api.getHierarchyTree(),
      ]);

      if (empRes.success) setEmployees(empRes.data);
      if (hierRes.success) setHierarchy(hierRes.data);
    } catch (e) {
      console.error('Failed to load employees:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createEmployee({
        ...form,
        bankAccountHolder: form.bankAccountHolder || `${form.firstName} ${form.lastName}`,
      });
      if (res.success) {
        setShowOnboardModal(false);
        fetchEmployees();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to onboard employee');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept ? emp.department === selectedDept : true;
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  // Recursive Tree Component for Hierarchy
  const renderTree = (node: any) => {
    return (
      <div key={node._id} className="ml-6 pl-4 border-l-2 border-indigo-500/20 my-2">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3 w-fit">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
            {node.fullName?.charAt(0)}
          </div>
          <div>
            <div className="text-xs font-bold text-white">{node.fullName}</div>
            <div className="text-[10px] text-slate-400">
              {node.designation} • <span className="text-indigo-400">{node.employeeCode}</span>
            </div>
          </div>
        </div>
        {node.subordinates && node.subordinates.length > 0 && (
          <div className="space-y-1">{node.subordinates.map(renderTree)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Employee 360 & Organization Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust encrypted personal identifiable information (PII) with dynamic role-based data masking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Masking Toggle */}
          <button
            onClick={() => setRevealSensitive(!revealSensitive)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              revealSensitive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {revealSensitive ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
            <span>{revealSensitive ? 'Sensitive Data Revealed (Audited)' : 'Mask Sensitive Data'}</span>
          </button>

          {/* Onboard Button */}
          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 px-4 transition-all ${
            activeTab === 'directory'
              ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Directory Table
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`pb-3 px-4 transition-all flex items-center gap-1.5 ${
            activeTab === 'hierarchy'
              ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Organization Tree</span>
        </button>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, code, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Directory Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Department & Title</th>
                    <th className="py-3 px-4 font-semibold">National ID (FLE)</th>
                    <th className="py-3 px-4 font-semibold">Basic Salary (FLE)</th>
                    <th className="py-3 px-4 font-semibold">Bank Account (FLE)</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">360 View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{emp.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{emp.employeeCode} • {emp.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{emp.designation}</div>
                          <div className="text-[11px] text-indigo-400">{emp.department}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {emp.nationalId}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                          {emp.isMasked ? emp.basicSalary : `LKR ${Number(emp.basicSalary).toLocaleString()}`}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {emp.bankAccountNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              emp.status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedEmp(emp)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[11px] font-medium rounded-lg transition-all cursor-pointer"
                          >
                            View 360
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No employees found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Hierarchy Graph View */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Organizational Reporting Tree</h2>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
            {hierarchy.length > 0 ? (
              hierarchy.map(renderTree)
            ) : (
              <div className="text-xs text-slate-500">No hierarchy tree available.</div>
            )}
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Onboard New Employee with Zero-Trust FLE
              </h2>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={form.employeeCode}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Secure FLE Section */}
              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Confidential Financial & Identification (Encrypted with AES-256-GCM)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">National ID / Passport</label>
                    <input
                      type="text"
                      required
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Monthly Basic Salary (LKR)</label>
                    <input
                      type="number"
                      required
                      value={form.basicSalary}
                      onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      required
                      value={form.bankAccountNumber}
                      onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  Confirm & Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee 360 Drawer */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Employee 360 Profile</h2>
              <button onClick={() => setSelectedEmp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="text-center pb-4 border-b border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-600/30">
                  {selectedEmp.fullName?.charAt(0)}
                </div>
                <div className="text-sm font-bold text-white">{selectedEmp.fullName}</div>
                <div className="text-slate-400">{selectedEmp.designation} • {selectedEmp.department}</div>
                <div className="text-indigo-400 font-mono mt-1">{selectedEmp.employeeCode}</div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Encrypted Confidential Vault</span>
                <div className="bg-slate-950 p-3 rounded-xl space-y-2 border border-slate-800 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">NIC:</span>
                    <span className="text-slate-200">{selectedEmp.nationalId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Basic Salary:</span>
                    <span className="text-emerald-400">{selectedEmp.basicSalary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank Account:</span>
                    <span className="text-slate-200">{selectedEmp.bankAccountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank:</span>
                    <span className="text-slate-200">{selectedEmp.bankName}</span>
                  </div>
                </div>
              </div>

              {/* Document Vault */}
              <div>
                <span className="text-slate-500 block mb-1">Document Vault & Expiry Tracker</span>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedEmp.documents && selectedEmp.documents.length > 0 ? (
                    selectedEmp.documents.map((doc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-900 last:border-0">
                        <span className="text-slate-300">{doc.title}</span>
                        <span className="text-[10px] text-slate-500">{doc.documentType}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-center py-2">No documents currently uploaded.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
