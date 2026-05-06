const mongoose = require('mongoose');

const engagementSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: [true, 'Creator ID is required'],
    index: true,
  },
  views: {
    type: Number,
    required: true,
    min: [0, 'Views cannot be negative'],
    default: 0,
  },
  likes: {
    type: Number,
    required: true,
    min: [0, 'Likes cannot be negative'],
    default: 0,
  },
  shares: {
    type: Number,
    required: true,
    min: [0, 'Shares cannot be negative'],
    default: 0,
  },
  watchTime: {
    type: Number,
    required: true,
    min: [0, 'Watch time cannot be negative'],
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

engagementSchema.index({ creatorId: 1, timestamp: -1 });

module.exports = mongoose.model('Engagement', engagementSchema);
