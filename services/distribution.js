const Engagement = require('../models/Engagement');
const Anomaly = require('../models/Anomaly');
const Creator = require('../models/Creator');
const Revenue = require('../models/Revenue');
const Distribution = require('../models/Distribution');

/**
 * Normalize metric using log(1 + metric)
 */
function normalizeMetric(value) {
  return Math.log(1 + value);
}

/**
 * Get penalty factor for flagged creators based on their anomaly score
 * Penalizes between 30-70% based on severity
 */
async function getPenaltyFactor(creatorId) {
  const creator = await Creator.findById(creatorId);
  if (!creator) return 1.0;

  // 1. Hard Block: If creator revenue is frozen, 100% penalty (factor 0)
  if (creator.isFrozen) return 0.0;

  // 2. Proportional Penalty: Based on malicious score set by Admin
  // (e.g., 20% malicious score = 0.8 penalty factor)
  let maliciousPenalty = 1.0 - (creator.maliciousScore / 100);

  // 3. Dynamic Penalty: Based on detected anomalies
  const recentAnomaly = await Anomaly.findOne({
    creatorId,
    flagged: true,
    resolved: false,
  }).sort({ createdAt: -1 });

  let anomalyPenalty = 1.0;
  if (recentAnomaly) {
    const score = recentAnomaly.anomalyScore;
    if (score >= 5) anomalyPenalty = 0.3; // 70% penalty
    else if (score >= 4) anomalyPenalty = 0.4;
    else if (score >= 3) anomalyPenalty = 0.5;
    else anomalyPenalty = 0.7;
  }

  // Return the most severe penalty
  return Math.min(maliciousPenalty, anomalyPenalty);
}

/**
 * Run full revenue distribution
 */
async function distributeRevenue(revenueId) {
  const revenue = await Revenue.findById(revenueId);
  if (!revenue) throw new Error('Revenue pool not found');
  if (revenue.status === 'distributed') throw new Error('Revenue already distributed');

  const creators = await Creator.find({ status: { $ne: 'suspended' } });
  if (creators.length === 0) throw new Error('No active creators found');

  const weights = revenue.distributionRules;

  // Get all engagements since last distribution or pool creation
  const engagements = await Engagement.find({
    timestamp: { $gte: revenue.createdAt },
  });

  // Aggregate engagement per creator
  const creatorMetrics = {};
  for (const eng of engagements) {
    const id = eng.creatorId.toString();
    if (!creatorMetrics[id]) {
      creatorMetrics[id] = { views: 0, likes: 0, shares: 0, watchTime: 0 };
    }
    creatorMetrics[id].views += eng.views;
    creatorMetrics[id].likes += eng.likes;
    creatorMetrics[id].shares += eng.shares;
    creatorMetrics[id].watchTime += eng.watchTime;
  }

  // Calculate normalized weighted scores for each creator
  const payouts = [];
  let totalScore = 0;

  for (const creator of creators) {
    const id = creator._id.toString();
    const metrics = creatorMetrics[id] || { views: 0, likes: 0, shares: 0, watchTime: 0 };

    // Normalize with log(1 + metric)
    const normViews = normalizeMetric(metrics.views);
    const normLikes = normalizeMetric(metrics.likes);
    const normShares = normalizeMetric(metrics.shares);
    const normWatchTime = normalizeMetric(metrics.watchTime);

    // Apply weights
    const viewsScore = normViews * weights.views;
    const likesScore = normLikes * weights.likes;
    const sharesScore = normShares * weights.shares;
    const watchTimeScore = normWatchTime * weights.watchTime;

    const rawScore = viewsScore + likesScore + sharesScore + watchTimeScore;

    // Apply penalty for flagged creators
    const penalty = await getPenaltyFactor(creator._id);
    const adjustedScore = rawScore * penalty;
    const penaltyApplied = rawScore > 0 ? parseFloat(((1 - penalty) * 100).toFixed(1)) : 0;

    totalScore += adjustedScore;

    payouts.push({
      creatorId: creator._id,
      rawScore: parseFloat(rawScore.toFixed(4)),
      adjustedScore: parseFloat(adjustedScore.toFixed(4)),
      penaltyApplied,
      payout: 0,
      percentage: 0,
      breakdown: {
        viewsScore: parseFloat(viewsScore.toFixed(4)),
        likesScore: parseFloat(likesScore.toFixed(4)),
        sharesScore: parseFloat(sharesScore.toFixed(4)),
        watchTimeScore: parseFloat(watchTimeScore.toFixed(4)),
      },
    });
  }

  // Calculate final payouts
  for (const p of payouts) {
    if (totalScore > 0) {
      p.percentage = parseFloat(((p.adjustedScore / totalScore) * 100).toFixed(2));
      p.payout = parseFloat(((p.adjustedScore / totalScore) * revenue.totalPool).toFixed(2));
    }
  }

  // Update creator total earnings
  for (const p of payouts) {
    await Creator.findByIdAndUpdate(p.creatorId, { $inc: { totalEarnings: p.payout } });
  }

  // Save distribution record
  const distribution = await Distribution.create({
    revenueId: revenue._id,
    totalPool: revenue.totalPool,
    totalCreators: creators.length,
    payouts,
  });

  // Mark revenue as distributed
  revenue.status = 'distributed';
  revenue.distributedAt = new Date();
  await revenue.save();

  return distribution;
}

module.exports = { distributeRevenue, normalizeMetric, getPenaltyFactor };
