require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('No se pudo conectar a MongoDB al iniciar:', error.message);
    console.error('El servidor arrancará; /api/health reportará el estado.');
  }

  app.listen(PORT, () => {
    console.log(`Backend escuchando en puerto ${PORT}`);
  });
};

startServer();
