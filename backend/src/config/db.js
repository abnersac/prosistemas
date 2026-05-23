const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno');
  }

  await mongoose.connect(uri);
  console.log('MongoDB conectado');
};

module.exports = { connectDB, mongoose };
