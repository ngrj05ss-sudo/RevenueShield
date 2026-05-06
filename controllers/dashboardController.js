const Creator = require('../models/Creator');
const Engagement = require('../models/Engagement');
const Revenue = require('../models/Revenue');
const Anomaly = require('../models/Anomaly');
const Distribution = require('../models/Distribution');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * ADMIN DASHBOARD
 * Access to all metrics, anomalies, and distribution controls
 */
exports.getAdminDashboard = asyncHandler(async (req, res) => {
  const [
    creators,
    totalCreators,
    latestRevenue,
    recentAnomalies,
    latestDistribution,
    totalDistributions,
  ] = await Promise.all([
    Creator.find().sort({ totalEarnings: -1 }),
    Creator.countDocuments(),
    Revenue.findOne().sort({ createdAt: -1 }),
    Anomaly.find({ flagged: true, resolved: false })
      .populate('creatorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(15),
    Distribution.findOne()
      .populate('payouts.creatorId', 'name email trustScore status')
      .sort({ distributedAt: -1 }),
    Distribution.countDocuments(),
  ]);

  const engagementTotals = await Engagement.aggregate([
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalShares: { $sum: '$shares' },
        totalWatchTime: { $sum: '$watchTime' },
        totalRecords: { $sum: 1 },
      },
    },
  ]);

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const engagementTimeline = await Engagement.aggregate([
    { $match: { timestamp: { $gte: fourteenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        views: { $sum: '$views' },
        likes: { $sum: '$likes' },
        shares: { $sum: '$shares' },
        watchTime: { $sum: '$watchTime' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const flaggedCount = await Anomaly.countDocuments({ flagged: true, resolved: false });
  const totalDistributed = await Distribution.aggregate([{ $group: { _id: null, total: { $sum: '$totalPool' } } }]);

  res.render('admin_dashboard', {
    title: 'Admin Command Center',
    role: 'admin',
    creators,
    totalCreators,
    latestRevenue,
    recentAnomalies,
    latestDistribution,
    totalDistributions,
    engagementTotals: engagementTotals[0] || { totalViews: 0, totalLikes: 0, totalShares: 0, totalWatchTime: 0, totalRecords: 0 },
    engagementTimeline,
    flaggedCount,
    totalDistributed: totalDistributed[0]?.total || 0,
  });
});

/**
 * CREATOR PORTAL
 * Personalized view for the logged-in creator
 */
exports.getCreatorPortal = asyncHandler(async (req, res) => {
  // Use creatorId from session
  const creatorId = req.session.creatorId;
  
  if (!creatorId) {
    return res.status(403).render('error', { title: 'Access Denied', message: 'No creator profile linked to this account' });
  }

  const creator = await Creator.findById(creatorId);
  if (!creator) return res.status(404).render('error', { title: 'Not Found', message: 'Creator profile not found' });

  const [engagements, payoutHistory] = await Promise.all([
    Engagement.find({ creatorId: creator._id }).sort({ timestamp: -1 }).limit(30),
    Distribution.find({ 'payouts.creatorId': creator._id }).sort({ distributedAt: -1 }).limit(10),
  ]);

  const creatorPayouts = payoutHistory.map((dist) => {
    const payout = dist.payouts.find((p) => p.creatorId.toString() === creator._id.toString());
    return {
      date: dist.distributedAt,
      totalPool: dist.totalPool,
      payout: payout?.payout || 0,
      percentage: payout?.percentage || 0,
      penaltyApplied: payout?.penaltyApplied || 0,
    };
  });

  const totals = await Engagement.aggregate([
    { $match: { creatorId: creator._id } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalShares: { $sum: '$shares' },
        totalWatchTime: { $sum: '$watchTime' },
      },
    },
  ]);

  res.render('creator_portal', {
    title: 'My Dashboard',
    role: 'creator',
    creator,
    engagements,
    creatorPayouts,
    totals: totals[0] || { totalViews: 0, totalLikes: 0, totalShares: 0, totalWatchTime: 0 },
  });
});

/**
 * ADMIN ONLY: SPECIFIC CREATOR DRILL-DOWN
 */
exports.getAdminCreatorView = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) return res.status(404).render('error', { title: 'Not Found', message: 'Creator not found' });

  const [engagements, anomalies, payoutHistory] = await Promise.all([
    Engagement.find({ creatorId: creator._id }).sort({ timestamp: -1 }).limit(50),
    Anomaly.find({ creatorId: creator._id }).sort({ createdAt: -1 }),
    Distribution.find({ 'payouts.creatorId': creator._id }).sort({ distributedAt: -1 }),
  ]);

  const creatorPayouts = payoutHistory.map((dist) => {
    const payout = dist.payouts.find((p) => p.creatorId.toString() === creator._id.toString());
    return {
      date: dist.distributedAt,
      totalPool: dist.totalPool,
      payout: payout?.payout || 0,
      percentage: payout?.percentage || 0,
      penaltyApplied: payout?.penaltyApplied || 0,
      breakdown: payout?.breakdown || {},
    };
  });

  const totals = await Engagement.aggregate([
    { $match: { creatorId: creator._id } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalShares: { $sum: '$shares' },
        totalWatchTime: { $sum: '$watchTime' },
      },
    },
  ]);

  res.render('admin_creator_view', {
    title: `Monitoring: ${creator.name}`,
    role: 'admin',
    creator,
    engagements,
    anomalies,
    creatorPayouts,
    totals: totals[0] || { totalViews: 0, totalLikes: 0, totalShares: 0, totalWatchTime: 0 },
  });
});
