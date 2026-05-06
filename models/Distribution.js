const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
  },
  rawScore: { type: Number, required: true },
  adjustedScore: { type: Number, required: true },
  penaltyApplied: { type: Number, default: 0 },
  payout: { type: Number, required: true },
  percentage: { type: Number, required: true },
  breakdown: {
    viewsScore: { type: Number, default: 0 },
    likesScore: { type: Number, default: 0 },
    sharesScore: { type: Number, default: 0 },
    watchTimeScore: { type: Number, default: 0 },
  },
});

const distributionSchema = new mongoose.Schema({
  revenueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Revenue',
    required: true,
  },
  totalPool: {
    type: Number,
    required: true,
  },
  totalCreators: {
    type: Number,
    required: true,
  },
  payouts: [payoutSchema],
  distributedAt: {
    type: Date,
    default: Date.now,
  },
});

distributionSchema.index({ distributedAt: -1 });

module.exports = mongoose.model('Distribution', distributionSchema);
