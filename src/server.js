const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getConfig } = require('./config');
const routes = require('./routes');

dotenv.config();

const config = getConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
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

