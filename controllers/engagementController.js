const Engagement = require('../models/Engagement');
const Creator = require('../models/Creator');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// POST /api/engagement — Record engagement data
exports.createEngagement = asyncHandler(async (req, res) => {
  const { creatorId, views, likes, shares, watchTime } = req.body;

  if (!creatorId) throw new AppError('Creator ID is required', 400);

  const creator = await Creator.findById(creatorId);
  if (!creator) throw new AppError('Creator not found', 404);

  const engagement = await Engagement.create({
    creatorId,
    views: views || 0,
    likes: likes || 0,
    shares: shares || 0,
    watchTime: watchTime || 0,
  });

  req.app.get('io')?.emit('engagementRecorded', { creatorId, engagement });

  res.status(201).json({ success: true, data: engagement });
});

// GET /api/engagement/:creatorId — Get engagement history for a creator
exports.getEngagementByCreator = asyncHandler(async (req, res) => {
  const { creatorId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const creator = await Creator.findById(creatorId);
  if (!creator) throw new AppError('Creator not found', 404);

  // Date filters
  const dateFilter = {};
  if (req.query.startDate) dateFilter.$gte = new Date(req.query.startDate);
  if (req.query.endDate) dateFilter.$lte = new Date(req.query.endDate);

  const query = { creatorId };
  if (Object.keys(dateFilter).length > 0) query.timestamp = dateFilter;

  const [engagements, total] = await Promise.all([
    Engagement.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    Engagement.countDocuments(query),
  ]);

  // Compute aggregated totals
  const aggregated = await Engagement.aggregate([
    { $match: { creatorId: creator._id } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalShares: { $sum: '$shares' },
        totalWatchTime: { $sum: '$watchTime' },
        count: { $sum: 1 },
      },
    },
  ]);

  res.json({
    success: true,
    creator: { id: creator._id, name: creator.name, email: creator.email },
    totals: aggregated[0] || { totalViews: 0, totalLikes: 0, totalShares: 0, totalWatchTime: 0, count: 0 },
    data: engagements,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/engagement — Get all engagement records (with optional filters)
exports.getAllEngagement = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.startDate || req.query.endDate) {
    query.timestamp = {};
    if (req.query.startDate) query.timestamp.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.timestamp.$lte = new Date(req.query.endDate);
  }

  const [engagements, total] = await Promise.all([
    Engagement.find(query).populate('creatorId', 'name email').sort({ timestamp: -1 }).skip(skip).limit(limit),
    Engagement.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: engagements,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
