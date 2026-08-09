import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import reservationRoutes from './routes/reservationRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import staffRoutes from './routes/staffRoutes';
import configRoutes from './routes/configRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Root welcome route
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>GourmetReserve — Backend API</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              background: rgba(30, 41, 59, 0.9);
              border: 1px solid #334155;
              border-radius: 20px;
              padding: 48px;
              max-width: 580px;
              text-align: center;
              box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            }
            .icon { font-size: 3.5rem; margin-bottom: 16px; }
            h1 { font-size: 2.2rem; font-weight: 700; color: #f59e0b; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 1.05rem; margin-bottom: 24px; line-height: 1.6; }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(16, 185, 129, 0.15);
              color: #34d399;
              border: 1px solid #10b981;
              padding: 6px 16px;
              border-radius: 30px;
              font-weight: 600;
              font-size: 0.9rem;
              margin-bottom: 32px;
            }
            .pulse {
              width: 8px;
              height: 8px;
              background-color: #10b981;
              border-radius: 50%;
              box-shadow: 0 0 10px #10b981;
            }
            .routes-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              text-align: left;
              background: #1e293b;
              padding: 20px;
              border-radius: 12px;
              border: 1px solid #334155;
              font-size: 0.85rem;
            }
            .method { font-weight: 700; color: #f59e0b; }
            .path { color: #cbd5e1; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">🍽️</div>
            <h1>GourmetReserve API</h1>
            <p>Bienvenido al servicio backend en tiempo real para la gestión inteligente de reservas y mesas de restaurante.</p>
            
            <div class="badge">
              <span class="pulse"></span> Servicio Operativo & WebSocket Listo
            </div>

            <div class="routes-grid">
              <div><span class="method">POST</span> <span class="path">/api/auth/login</span></div>
              <div><span class="method">GET</span> <span class="path">/api/reservations</span></div>
              <div><span class="method">POST</span> <span class="path">/api/waitlist</span></div>
              <div><span class="method">GET</span> <span class="path">/api/staff/board</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  return res.status(200).json({
    status: 'OK',
    message: '🍽️ Bienvenido a la API REST de GourmetReserve',
    documentation: 'Consulta el archivo README.md o ingresa desde un navegador para ver el panel de bienvenida.',
    version: '1.0.0',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'GourmetReserve Backend API is running' });
});

export default app;
