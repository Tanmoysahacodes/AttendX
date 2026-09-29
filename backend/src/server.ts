import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import statsRoutes from './routes/stats';
import playersRoutes from './routes/players';
import attendanceRoutes from './routes/attendance';
import scheduleRoutes from './routes/schedule';
import announcementsRoutes from './routes/announcements';
import auditRoutes from './routes/audit';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Validate critical environment variables at startup and exit with a clear message
const missingEnvVars: string[] = [];
if (!process.env.DATABASE_URL) missingEnvVars.push('DATABASE_URL');
if (!process.env.JWT_ACCESS_SECRET) missingEnvVars.push('JWT_ACCESS_SECRET');
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Set these in Render → Environment tab, then redeploy.');
  process.exit(1);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check — no auth, no DB dependency, always responds first
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

app.listen(port as number, '0.0.0.0', () => {
  console.log(`🚀 AttendX API running on port ${port}`);
  console.log(`   Health: http://0.0.0.0:${port}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
