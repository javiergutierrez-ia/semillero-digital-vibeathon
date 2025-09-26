const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getConfig } = require('./config');
const routes = require('./routes');

dotenv.config();

const config = getConfig();

const app = express();

// Configuración CORS específica para Google OAuth
const corsOptions = {
  origin: [
    'http://localhost:5001',
    'http://127.0.0.1:5001',
    'https://accounts.google.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Headers de seguridad para OAuth
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static('public'));

app.use('/', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, _req, res, _next) => {
  console.error('Error no manejado', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(config.port, () => {
  console.log(`Servidor escuchando en puerto ${config.port}`);
});

