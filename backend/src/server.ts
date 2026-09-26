import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectToDatabase, disconnectDatabase } from './core/database/connection';
import authRoutes from './modules/auth/auth.routes';
import employeeRoutes from './modules/employee/employee.routes';
import auditRoutes from './modules/audit/audit.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leave/leave.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import lifecycleRoutes from './modules/lifecycle/lifecycle.routes';
import ragRoutes from './modules/rag/rag.routes';

const app = express();

// Security Hardening & Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enterprise Zero-Trust HRMS API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/lifecycle', lifecycleRoutes);
app.use('/api/rag', ragRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

let server: any;

export async function startServer() {
  await connectToDatabase();
  return new Promise((resolve) => {
    server = app.listen(env.PORT, () => {
      console.log(`🚀 [HRMS Server] Running on http://localhost:${env.PORT}`);
      resolve(server);
    });
  });
}

export async function stopServer() {
  if (server) {
    server.close();
  }
  await disconnectDatabase();
}

// Auto-run if directly executed
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
}

export default app;
