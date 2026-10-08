import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { connectDb } from './db.js';
import { seedDefaultUsersIfMissing, seedInventoryIfEmpty } from './seed.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import metadataRoutes from './routes/metadataRoutes.js';
import transportMovementRoutes from './routes/transportMovementRoutes.js';
import stockBookingRoutes from './routes/stockBookingRoutes.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'stock-manager-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/transport-movements', transportMovementRoutes);
app.use('/api/stock-bookings', stockBookingRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Internal server error' });
});

async function startServer() {
  try {
    await connectDb();
    await seedDefaultUsersIfMissing();
    await seedInventoryIfEmpty();
    app.listen(config.port, () => {
      console.log(`API listening on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error.message || error);
    process.exit(1);
  }
}

startServer();
