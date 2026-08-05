import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db.js';
import { apiLimiter } from './middlewares/rateLimiters.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import blockedSlotRoutes from './routes/blockedSlotRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

// `dotenv/config` above has already loaded .env into process.env by this point.
const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.disable('x-powered-by');
// Behind a reverse proxy (nginx, Render, etc.) in production so rate-limiting/IPs are correct.
app.set('trust proxy', 1);

// --- Security middleware, in the order every request passes through it ---
app.use(helmet()); // sets protective response headers (clickjacking, MIME sniffing, …)
app.use(
  cors({
    // Comma-separated list, e.g. "http://localhost:5173,https://example.com".
    origin: process.env
      .CORS_ORIGIN!.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' })); // parses JSON bodies into req.body
app.use(mongoSanitize()); // strips $/. from input — stops Mongo query injection
app.use(hpp()); // collapses duplicated query params (?date=a&date=b)
app.use(apiLimiter); // coarse per-IP request cap

// --- Routes. The prefix here + the paths inside each file = the full URL. ---
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' })); // uptime check
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/blocked-slots', blockedSlotRoutes);
app.use('/api/settings', settingsRoutes);

// --- Error handling. Must be last: Express only reaches these once no route
//     above has answered, and `errorHandler` catches whatever they threw. ---
app.use(notFound);
app.use(errorHandler);

await connectDB();

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `🚀 Server running on http://localhost:${PORT} [${process.env.NODE_ENV ?? 'development'}]`,
  );
});

server.on('error', (error: NodeJS.ErrnoException) => {
  // Nearly always a previous dev server that outlived its terminal, and the raw
  // stack trace buries the only thing you need: which port.
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use — stop the other server or set PORT in backend/.env`);
    process.exit(1);
  }
  throw error;
});

export default app;
