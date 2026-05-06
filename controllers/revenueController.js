const Revenue = require('../models/Revenue');
const Distribution = require('../models/Distribution');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// POST /api/revenue — Create or update revenue pool
exports.createRevenue = asyncHandler(async (req, res) => {
  const { totalPool, distributionRules, cycle } = req.body;

  if (!totalPool || totalPool <= 0) {
    throw new AppError('Total pool must be a positive number', 400);
  }

  const revenue = await Revenue.create({
    totalPool,
    distributionRules: distributionRules || { views: 0.3, likes: 0.25, shares: 0.2, watchTime: 0.25 },
    cycle: cycle || 'weekly',
  });

  req.app.get('io')?.emit('revenueUpdated', revenue);
  res.status(201).json({ success: true, data: revenue });
});

// GET /api/revenue — Get all revenue pools
exports.getRevenue = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [revenues, total] = await Promise.all([
    Revenue.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Revenue.countDocuments(),
  ]);

  res.json({
    success: true,
    data: revenues,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// PUT /api/revenue/:id — Update revenue pool
exports.updateRevenue = asyncHandler(async (req, res) => {
  const revenue = await Revenue.findById(req.params.id);
  if (!revenue) throw new AppError('Revenue pool not found', 404);
  
  Object.assign(revenue, req.body);
  await revenue.save();

  req.app.get('io')?.emit('revenueUpdated', revenue);
  res.json({ success: true, data: revenue });
});

/**
 * ADMIN: RESET REVENUE FOR REDISTRIBUTION
 * Allows re-running distribution logic by marking pool as pending and removing previous distribution record
 */
exports.resetRevenue = asyncHandler(async (req, res) => {
  const revenue = await Revenue.findById(req.params.id);
  if (!revenue) throw new AppError('Revenue pool not found', 404);

  // Remove existing distribution record for this revenue
  await Distribution.deleteOne({ revenueId: revenue._id });

  revenue.status = 'pending';
  revenue.distributedAt = undefined;
  await revenue.save();

  res.json({ success: true, message: 'Revenue pool reset for redistribution' });
});
