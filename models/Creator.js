const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Creator name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must be at most 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  trustScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  avatar: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'flagged'],
    default: 'active',
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  isFrozen: {
    type: Boolean,
    default: false,
  },
  maliciousScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

creatorSchema.index({ trustScore: -1 });

module.exports = mongoose.model('Creator', creatorSchema);
