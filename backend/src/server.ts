// ============================================================
// STARTUP: Step 1 — Node.js process alive
// ============================================================
console.log('[STARTUP 1/6] Node.js process started');
console.log(`  Node version: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  CWD: ${process.cwd()}`);

import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// ============================================================
// STARTUP: Step 2 — Load dotenv (no-op on Render, env already injected)
// ============================================================
console.log('[STARTUP 2/6] Running dotenv.config()');
dotenv.config();
console.log('[STARTUP 2/6] dotenv.config() completed');

// ============================================================
// STARTUP: Step 3 — Environment variable audit (values NEVER logged)
// ============================================================
console.log('[STARTUP 3/6] Auditing environment variables...');
const envAudit = {
  DATABASE_URL:       !!process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0,
  JWT_ACCESS_SECRET:  !!process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length > 0,
  JWT_REFRESH_SECRET: !!process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length > 0,
  PORT:               process.env.PORT || '(not set, will use 3000)',
  NODE_ENV:           process.env.NODE_ENV || '(not set)',
};
console.log('  DATABASE_URL present:       ', envAudit.DATABASE_URL);
console.log('  JWT_ACCESS_SECRET present:  ', envAudit.JWT_ACCESS_SECRET);
console.log('  JWT_REFRESH_SECRET present: ', envAudit.JWT_REFRESH_SECRET);
console.log('  PORT:                       ', envAudit.PORT);
console.log('  NODE_ENV:                   ', envAudit.NODE_ENV);

const missing = Object.entries(envAudit)
  .filter(([k, v]) => ['DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET'].includes(k) && v === false)
  .map(([k]) => k);

if (missing.length > 0) {
  console.error(`[STARTUP 3/6] ❌ FATAL: Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('[STARTUP 3/6] ✅ All required environment variables present');

// ============================================================
// STARTUP: Step 4 — Load route modules (PrismaClient instantiated here)
// ============================================================
console.log('[STARTUP 4/6] Loading route modules and PrismaClient...');

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import statsRoutes from './routes/stats';
import playersRoutes from './routes/players';
import attendanceRoutes from './routes/attendance';
import scheduleRoutes from './routes/schedule';
import announcementsRoutes from './routes/announcements';
import auditRoutes from './routes/audit';

console.log('[STARTUP 4/6] ✅ Route modules loaded');

// ============================================================
// STARTUP: Step 5 — Configure Express
// ============================================================
console.log('[STARTUP 5/6] Configuring Express...');
const app = express();
const port = Number(process.env.PORT) || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://attend-x-woad.vercel.app'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});
app.use(express.json());
app.use(cookieParser());

// Health check — no auth, no DB, always first
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AttendX API' });
});

app.get('/', (req, res) => {
  res.json({ service: 'AttendX API', version: '1.0.0', health: '/health' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/audit', auditRoutes);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

console.log('[STARTUP 5/6] ✅ Express configured, all routes registered');

// ============================================================
// STARTUP: Step 6 — Listen
// ============================================================
console.log(`[STARTUP 6/6] Calling app.listen on port ${port}, host 0.0.0.0...`);
app.listen(port, '0.0.0.0', () => {
  console.log(`[STARTUP 6/6] ✅ AttendX API is LIVE on port ${port}`);
  console.log(`  Health: http://0.0.0.0:${port}/health`);
});
