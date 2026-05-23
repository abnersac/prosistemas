// db.js
// Configuración de la conexión a MongoDB usando Mongoose
// Este archivo define la función para conectar a la base de datos MongoDB utilizando Mongoose.
// Importamos Mongoose para manejar la conexión a MongoDB
const mongoose = require('mongoose');
// Función para conectar a MongoDB usando Mongoose
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno');
  }

  await mongoose.connect(uri);
  console.log('MongoDB conectado');
};

module.exports = { connectDB, mongoose };
