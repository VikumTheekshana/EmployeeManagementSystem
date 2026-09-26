import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise Zero-Trust HRMS | Human Resource Management System',
  description: 'Enterprise-grade Zero-Trust HRMS with Field-Level Encryption, Sri Lankan Statutory Payroll, Dynamic Attendance, and AI Policy Assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
