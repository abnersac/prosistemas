// index.js
// Punto de entrada para el backend de robot-logs
// Este archivo carga las variables de entorno, conecta a la base de datos y arranca el servidor Express.
// Importamos dotenv para cargar las variables de entorno desde el archivo .env
require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;
// Función para iniciar el servidor después de conectar a la base de datos
const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('No se pudo conectar a MongoDB al iniciar:', error.message);
    console.error('El servidor arrancará; /api/health reportará el estado.');
  }
// Arrancamos el servidor Express
  app.listen(PORT, () => {
    console.log(`Backend escuchando en puerto ${PORT}`);
  });
};

startServer();
