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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AttendX API' });
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

app.listen(port as number, '0.0.0.0', () => console.log(`🚀 Server running on port ${port}`));
