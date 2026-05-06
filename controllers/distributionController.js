const { distributeRevenue } = require('../services/distribution');
const Distribution = require('../models/Distribution');
const Revenue = require('../models/Revenue');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/distribute — Run distribution for the latest pending revenue pool
exports.runDistribution = asyncHandler(async (req, res) => {
  // Find latest pending revenue pool, or use specific id
  const revenueId = req.query.revenueId;
  let revenue;

  if (revenueId) {
    revenue = await Revenue.findById(revenueId);
  } else {
    revenue = await Revenue.findOne({ status: 'pending' }).sort({ createdAt: -1 });
  }

  if (!revenue) throw new AppError('No pending revenue pool found', 404);

  const distribution = await distributeRevenue(revenue._id);
  const populated = await Distribution.findById(distribution._id).populate('payouts.creatorId', 'name email trustScore status');

  req.app.get('io')?.emit('distributionComplete', populated);

  res.json({ success: true, data: populated });
});

// GET /api/distributions — Get all past distributions
exports.getDistributions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [distributions, total] = await Promise.all([
    Distribution.find()
      .populate('payouts.creatorId', 'name email trustScore')
      .sort({ distributedAt: -1 })
      .skip(skip)
      .limit(limit),
    Distribution.countDocuments(),
  ]);

  res.json({
    success: true,
    data: distributions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
