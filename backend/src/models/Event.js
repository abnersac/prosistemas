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
