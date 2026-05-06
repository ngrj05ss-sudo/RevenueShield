const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  totalPool: {
    type: Number,
    required: [true, 'Total revenue pool is required'],
    min: [0, 'Revenue pool cannot be negative'],
  },
  distributionRules: {
    views: {
      type: Number,
      required: true,
      default: 0.3,
      min: 0,
      max: 1,
    },
    likes: {
      type: Number,
      required: true,
      default: 0.25,
      min: 0,
      max: 1,
    },
    shares: {
      type: Number,
      required: true,
      default: 0.2,
      min: 0,
      max: 1,
    },
    watchTime: {
      type: Number,
      required: true,
      default: 0.25,
      min: 0,
      max: 1,
    },
  },
  cycle: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
    default: 'weekly',
  },
  status: {
    type: String,
    enum: ['pending', 'distributed', 'cancelled'],
    default: 'pending',
  },
  distributedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

revenueSchema.pre('validate', function (next) {
  const rules = this.distributionRules;
  const sum = rules.views + rules.likes + rules.shares + rules.watchTime;
  if (Math.abs(sum - 1) > 0.01) {
    return next(new Error(`Distribution weights must sum to 1.0 (current: ${sum.toFixed(2)})`));
  }
  next();
});

module.exports = mongoose.model('Revenue', revenueSchema);
