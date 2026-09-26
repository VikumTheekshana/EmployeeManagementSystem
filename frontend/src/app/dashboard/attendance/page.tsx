'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  MapPin,
  Clock,
  CheckCircle,
  RefreshCw,
  LogIn,
  LogOut,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function AttendancePage() {
  const [qrData, setQrData] = useState<{ token: string; expiresAt: string } | null>(null);
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(30);

  // Office Geofence coords (Colombo HQ)
  const officeCoords = { lat: 6.9333, lon: 79.8433 };

  useEffect(() => {
    loadQRToken();
    loadTodayAttendance();
    loadHistory();

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          loadQRToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadQRToken = async () => {
    try {
      const res = await api.generateQR();
      if (res.success) {
        setQrData(res.data);
      }
    } catch (e) {
      console.error('Failed to generate QR token:', e);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const res = await api.getTodayAttendance();
      if (res.success) {
        setTodayRecord(res.data);
      }
    } catch (e) {
      console.error('Failed to load today record:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getAttendanceHistory();
      if (res.success) {
        setHistory(res.data);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  const handleCheckIn = async () => {
    if (!qrData?.token) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.checkIn({
        source: 'DynamicQR',
        qrToken: qrData.token,
        location: { latitude: officeCoords.lat, longitude: officeCoords.lon },
      });
      if (res.success) {
        setMessage(`Checked in successfully at ${new Date(res.data.checkInTime).toLocaleTimeString()} (${res.data.status})`);
        loadTodayAttendance();
        loadHistory();
      }
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.checkOut({
        source: 'DynamicQR',
        location: { latitude: officeCoords.lat, longitude: officeCoords.lon },
      });
      if (res.success) {
        setMessage(`Checked out successfully! Total work hours: ${res.data.workHours} hrs.`);
        loadTodayAttendance();
        loadHistory();
      }
    } catch (err: any) {
      setError(err.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-400" />
          Hybrid Attendance & Geofenced QR Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically signed, rotating 30-second tokens to prevent proxy attendance and screenshot fraud.
        </p>
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

      {/* Main Grid: Live Kiosk QR + Status Punch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Rotating QR Kiosk Screen */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold mb-4">
            <RefreshCw className={`w-3.5 h-3.5 ${timerSeconds <= 3 ? 'animate-spin' : ''}`} />
            <span>Refreshes in {timerSeconds}s</span>
          </div>

          {/* QR Box Visual Simulation */}
          <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-2xl flex flex-col items-center justify-center relative">
            {/* Visual SVG QR representation */}
            <div className="w-full h-full bg-slate-950 rounded-xl p-2 flex flex-col justify-between items-center text-indigo-400">
              <QrCode className="w-28 h-28 text-white mt-2" />
              <div className="text-[9px] font-mono text-slate-400 truncate w-full px-1">
                HMAC:{qrData?.token.slice(0, 16)}...
              </div>
            </div>
          </div>

          <h3 className="font-bold text-sm text-white mt-4">Office Kiosk Dynamic QR</h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
            Employees scan this QR via mobile device within 500m geofence radius of Colombo World Trade Center.
          </p>
        </div>

        {/* Attendance Punch Simulator */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Daily Attendance Punch</h3>
                <p className="text-xs text-slate-400">Verify GPS and clock in/out</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <MapPin className="w-3.5 h-3.5" />
                <span>Geofence: Inside Colombo HQ (6.9333° N, 79.8433° E)</span>
              </div>
            </div>

            {/* Current Today Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Check-In Status</span>
                <div className="text-base font-bold text-white">
                  {todayRecord?.checkInTime
                    ? new Date(todayRecord.checkInTime).toLocaleTimeString()
                    : 'Not Checked In Yet'}
                </div>
                {todayRecord?.status && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                    Status: {todayRecord.status}
                  </span>
                )}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Check-Out Status</span>
                <div className="text-base font-bold text-white">
                  {todayRecord?.checkOutTime
                    ? new Date(todayRecord.checkOutTime).toLocaleTimeString()
                    : 'Active Shift'}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Total Recorded Hours: <span className="text-emerald-400 font-bold">{todayRecord?.workHours || 0} hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Punch Buttons */}
          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={handleCheckIn}
              disabled={loading || !!todayRecord?.checkInTime}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{todayRecord?.checkInTime ? 'Already Checked In' : 'Simulate QR Check-In'}</span>
            </button>

            <button
              onClick={handleCheckOut}
              disabled={loading || !todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
              className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{todayRecord?.checkOutTime ? 'Already Checked Out' : 'Simulate QR Check-Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Recent Attendance Ledger
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Employee</th>
                <th className="pb-3 font-semibold">Check-In</th>
                <th className="pb-3 font-semibold">Check-Out</th>
                <th className="pb-3 font-semibold">Work Hours</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.length > 0 ? (
                history.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-mono text-[11px] text-slate-400">{rec.date}</td>
                    <td className="py-3 font-medium text-white">
                      {rec.employeeId?.fullName || 'Current User'}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-emerald-400">
                      {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-amber-400">
                      {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 font-mono font-semibold">{rec.workHours} hrs</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[10px]">{rec.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No attendance records logged yet.
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
