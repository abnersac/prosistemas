const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbConnected = dbState === 1;

    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        status: 'degraded',
        database: 'disconnected',
        readyState: dbState,
      });
    }

    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      success: true,
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('GET /api/health error:', error.message);
    return res.status(500).json({
      success: false,
      status: 'error',
      database: 'unreachable',
      error: error.message,
    });
  }
});

module.exports = router;
