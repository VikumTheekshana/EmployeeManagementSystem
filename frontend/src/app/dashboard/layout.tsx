'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CalendarDays,
  Banknote,
  Package,
  Bot,
  ShieldAlert,
  LogOut,
  Building,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { clearAuthToken } from '../../lib/api';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/employees', label: 'Employee 360 & Directory', icon: Users },
  { href: '/dashboard/attendance', label: 'Attendance & QR Kiosk', icon: QrCode },
  { href: '/dashboard/leave', label: 'Leave Management', icon: CalendarDays },
  { href: '/dashboard/payroll', label: 'Statutory Payroll (SL)', icon: Banknote },
  { href: '/dashboard/lifecycle', label: 'Assets & Offboarding', icon: Package },
  { href: '/dashboard/rag', label: 'HR Policy AI (RAG)', icon: Bot },
  { href: '/dashboard/audit', label: 'Security Audit Trail', icon: ShieldAlert },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('hrms_user');
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950/80 border-r border-slate-800/80 p-4 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white">ZERO-TRUST HRMS</h2>
            <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AES-256 FLE Active
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="mt-auto pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-3">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.email || 'Administrator'}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user?.role || 'SuperAdmin'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">
                {user?.tenantId || 'Tenant'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-sm text-white">ZERO-TRUST HRMS</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  active ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 mt-4"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar info */}
        <div className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Enterprise HRMS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 capitalize font-medium">
              {pathname.split('/')[2] || 'Overview'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Atlas M0 Isolated Pool (10)
            </span>
            <span className="text-slate-400 font-mono">
              Tenant: <span className="text-indigo-400 font-bold">{user?.tenantId || 'Default'}</span>
            </span>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
