const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');

const router = express.Router();

const isBodyEmpty = (body) => {
  if (!body || typeof body !== 'object') return true;
  return Object.keys(body).length === 0;
};

router.post('/', async (req, res) => {
  try {
    if (isBodyEmpty(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'El cuerpo de la petición no puede estar vacío',
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    const { device_id, event_type, description, timestamp, data_payload } = req.body;

    if (!device_id || !event_type) {
      return res.status(400).json({
        success: false,
        message: 'device_id y event_type son obligatorios',
      });
    }

    const event = await Event.create({
      device_id: String(device_id),
      event_type: String(event_type),
      description: description ? String(description) : '',
      timestamp: timestamp ? new Date(timestamp) : undefined,
      data_payload: data_payload ?? {},
    });

    return res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('POST /api/logs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar el evento',
      error: error.message,
    });
  }
});

router.get('/commands/pending', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    const { device_id } = req.query;
    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: 'device_id es obligatorio',
      });
    }

    const data = await Event.find({
      device_id: String(device_id),
      event_type: 'Comando',
      'data_payload.status': 'sent',
      'data_payload.source': 'dashboard',
    })
      .sort({ timestamp: 1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('GET /api/logs/commands/pending error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener comandos pendientes',
    });
  }
});

router.post('/commands/:id/ack', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Comando no encontrado',
      });
    }

    const newStatus = req.body?.status === 'timeout' ? 'timeout' : 'acknowledged';

    event.data_payload = {
      ...event.data_payload,
      status: newStatus,
      acknowledged_at: new Date().toISOString(),
      robot_response: req.body?.response ?? {},
    };
    event.markModified('data_payload');
    await event.save();

    return res.status(200).json({
      success: true,
      data: event.toObject(),
    });
  } catch (error) {
    console.error('POST /api/logs/commands/:id/ack error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al confirmar comando',
    });
  }
});

router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);

    const [events, total] = await Promise.all([
      Event.find().sort({ timestamp: -1 }).limit(limit).lean(),
      Event.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      total,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('GET /api/logs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los eventos',
      error: error.message,
    });
  }
});

module.exports = router;
