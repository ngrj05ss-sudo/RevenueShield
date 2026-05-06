const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: [true, 'Creator ID is required'],
    index: true,
  },
  anomalyScore: {
    type: Number,
    required: true,
    min: 0,
  },
  flagged: {
    type: Boolean,
    default: false,
  },
  reason: {
    type: String,
    required: [true, 'Reason for anomaly is required'],
  },
  metrics: {
    zScoreViews: { type: Number, default: 0 },
    zScoreLikes: { type: Number, default: 0 },
    zScoreShares: { type: Number, default: 0 },
    zScoreWatchTime: { type: Number, default: 0 },
    likesViewsRatio: { type: Number, default: 0 },
    sharesViewsRatio: { type: Number, default: 0 },
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

anomalySchema.index({ creatorId: 1, createdAt: -1 });
anomalySchema.index({ flagged: 1 });

module.exports = mongoose.model('Anomaly', anomalySchema);
