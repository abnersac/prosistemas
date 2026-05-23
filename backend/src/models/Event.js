// models/Event.js
// Modelo de datos para eventos generados por el brazo robótico
// Cada evento representa una acción o estado del dispositivo, con información relevante para su monitoreo y análisis
// Campos:
// - device_id: Identificador único del dispositivo que generó el evento
// - event_type: Tipo de evento (ejemplo: "movimiento", "error", "estado")
// - description: Descripción detallada del evento
// - timestamp: Fecha y hora en que ocurrió el evento
// - data_payload: Información adicional relevante al evento (puede ser un objeto con detalles específicos)
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    device_id: {
      type: String,
      required: true,
      trim: true,
    },
    event_type: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    data_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'events',
    versionKey: false,
  }
);

eventSchema.index({ timestamp: -1 });
eventSchema.index({ device_id: 1, event_type: 1 });

module.exports = mongoose.model('Event', eventSchema);

//fin
