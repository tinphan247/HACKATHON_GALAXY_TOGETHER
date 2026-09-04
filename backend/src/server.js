/**
 * Galaxy Together — Express Server
 * Phase 2: Group Session Backend
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import sessionRoutes from './routes/session_routes.js';
import inviteRoutes from './routes/invite_routes.js';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logging in dev
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT 1 as healthy');
    res.json({
      status: 'ok',
      service: 'galaxy-together-backend',
      version: '2.0.0',
      database: dbRes.rows[0].healthy === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Mount Routes
app.use('/api/group-sessions', sessionRoutes);
app.use('/api/invites', inviteRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error('Server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || null
  });
});

import http from 'http';
import { realtimeGateway } from './realtime/gateway.js';

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Mount WebSocket Realtime Gateway
realtimeGateway.init(server);

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🎬 Galaxy Together Backend running on http://localhost:${PORT}`);
    console.log(`📡 Connected to Neon PostgreSQL at: ${process.env.DATABASE_URL?.split('@')[1]}`);
    console.log(`⚡ WebSocket Server listening on ws://localhost:${PORT}/ws`);
  });
}

export { server, app, realtimeGateway };
export default app;
