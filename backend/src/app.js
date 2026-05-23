const express = require('express');
const cors = require('cors');
const logsRouter = require('./routes/logs');
const healthRouter = require('./routes/health');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'robot-logs-backend',
    endpoints: ['/api/logs', '/api/health'],
  });
});

//verificando codigo de app para la conexion

app.use('/api/logs', logsRouter);
app.use('/api/health', healthRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use((err, _req, res, _next) => {
  console.error('Error no controlado:', err.message);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

module.exports = app;
