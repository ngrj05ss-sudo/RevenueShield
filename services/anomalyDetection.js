const Engagement = require('../models/Engagement');
const Anomaly = require('../models/Anomaly');
const Creator = require('../models/Creator');

/**
 * Calculate mean and standard deviation for an array of numbers
 */
function calcStats(values) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Calculate z-score for a value given mean and standard deviation
 */
function zScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Detect engagement spike — compare recent vs historical
 */
function detectSpike(recent, historical, threshold = 2.5) {
  if (historical.length < 3) return { spiked: false, ratio: 0 };
  const { mean } = calcStats(historical);
  if (mean === 0) return { spiked: recent > 0, ratio: recent > 0 ? Infinity : 0 };
  const ratio = recent / mean;
  return { spiked: ratio > threshold, ratio };
}

/**
 * Run anomaly detection for all creators
 * Looks at engagement in the specified time window
 */
async function runAnomalyDetection(windowDays = 7) {
  const creators = await Creator.find({ status: { $ne: 'suspended' } });
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const historicalStart = new Date(now.getTime() - windowDays * 4 * 24 * 60 * 60 * 1000);

  // Get all engagements in the analysis window
  const recentEngagements = await Engagement.find({
    timestamp: { $gte: windowStart, $lte: now },
  });

  const historicalEngagements = await Engagement.find({
    timestamp: { $gte: historicalStart, $lt: windowStart },
  });

  // Aggregate recent metrics per creator
  const recentByCreator = {};
  for (const eng of recentEngagements) {
    const id = eng.creatorId.toString();
    if (!recentByCreator[id]) {
      recentByCreator[id] = { views: 0, likes: 0, shares: 0, watchTime: 0, count: 0 };
    }
    recentByCreator[id].views += eng.views;
    recentByCreator[id].likes += eng.likes;
    recentByCreator[id].shares += eng.shares;
    recentByCreator[id].watchTime += eng.watchTime;
    recentByCreator[id].count++;
  }

  // Aggregate historical metrics per creator
  const historicalByCreator = {};
  for (const eng of historicalEngagements) {
    const id = eng.creatorId.toString();
    if (!historicalByCreator[id]) {
      historicalByCreator[id] = { views: [], likes: [], shares: [], watchTime: [] };
    }
    historicalByCreator[id].views.push(eng.views);
    historicalByCreator[id].likes.push(eng.likes);
    historicalByCreator[id].shares.push(eng.shares);
    historicalByCreator[id].watchTime.push(eng.watchTime);
  }

  // Calculate z-scores across all creators' recent totals
  const allViews = Object.values(recentByCreator).map((c) => c.views);
  const allLikes = Object.values(recentByCreator).map((c) => c.likes);
  const allShares = Object.values(recentByCreator).map((c) => c.shares);
  const allWatchTime = Object.values(recentByCreator).map((c) => c.watchTime);

  const viewsStats = calcStats(allViews);
  const likesStats = calcStats(allLikes);
  const sharesStats = calcStats(allShares);
  const watchTimeStats = calcStats(allWatchTime);

  const anomalyResults = [];
  const Z_THRESHOLD = 3;
  const RATIO_THRESHOLD_HIGH = 0.8; // likes/views ratio too high
  const RATIO_THRESHOLD_SHARES = 0.5; // shares/views ratio too high

  for (const creator of creators) {
    const creatorId = creator._id.toString();
    const recent = recentByCreator[creatorId];
    if (!recent) continue;

    const reasons = [];
    let maxZScore = 0;

    // Z-score analysis
    const zViews = zScore(recent.views, viewsStats.mean, viewsStats.stdDev);
    const zLikes = zScore(recent.likes, likesStats.mean, likesStats.stdDev);
    const zShares = zScore(recent.shares, sharesStats.mean, sharesStats.stdDev);
    const zWatchTime = zScore(recent.watchTime, watchTimeStats.mean, watchTimeStats.stdDev);

    if (Math.abs(zViews) > Z_THRESHOLD) {
      reasons.push(`Abnormal views (z-score: ${zViews.toFixed(2)})`);
      maxZScore = Math.max(maxZScore, Math.abs(zViews));
    }
    if (Math.abs(zLikes) > Z_THRESHOLD) {
      reasons.push(`Abnormal likes (z-score: ${zLikes.toFixed(2)})`);
      maxZScore = Math.max(maxZScore, Math.abs(zLikes));
    }
    if (Math.abs(zShares) > Z_THRESHOLD) {
      reasons.push(`Abnormal shares (z-score: ${zShares.toFixed(2)})`);
      maxZScore = Math.max(maxZScore, Math.abs(zShares));
    }
    if (Math.abs(zWatchTime) > Z_THRESHOLD) {
      reasons.push(`Abnormal watch time (z-score: ${zWatchTime.toFixed(2)})`);
      maxZScore = Math.max(maxZScore, Math.abs(zWatchTime));
    }

    // Ratio analysis — likes/views mismatch
    const likesViewsRatio = recent.views > 0 ? recent.likes / recent.views : 0;
    const sharesViewsRatio = recent.views > 0 ? recent.shares / recent.views : 0;

    if (likesViewsRatio > RATIO_THRESHOLD_HIGH) {
      reasons.push(`Suspicious likes/views ratio: ${likesViewsRatio.toFixed(2)} (threshold: ${RATIO_THRESHOLD_HIGH})`);
      maxZScore = Math.max(maxZScore, likesViewsRatio * 3);
    }

    if (sharesViewsRatio > RATIO_THRESHOLD_SHARES) {
      reasons.push(`Suspicious shares/views ratio: ${sharesViewsRatio.toFixed(2)} (threshold: ${RATIO_THRESHOLD_SHARES})`);
      maxZScore = Math.max(maxZScore, sharesViewsRatio * 4);
    }

    // Spike detection (compare recent to historical)
    const historical = historicalByCreator[creatorId];
    if (historical) {
      const recentViewsAvg = recent.views / (recent.count || 1);
      const recentLikesAvg = recent.likes / (recent.count || 1);
      const viewsSpike = detectSpike(recentViewsAvg, historical.views);
      const likesSpike = detectSpike(recentLikesAvg, historical.likes);
      if (viewsSpike.spiked) {
        reasons.push(`Sudden views spike (${viewsSpike.ratio.toFixed(1)}x normal)`);
        maxZScore = Math.max(maxZScore, viewsSpike.ratio);
      }
      if (likesSpike.spiked) {
        reasons.push(`Sudden likes spike (${likesSpike.ratio.toFixed(1)}x normal)`);
        maxZScore = Math.max(maxZScore, likesSpike.ratio);
      }
    }

    // Determine severity
    let severity = 'low';
    if (maxZScore >= 5) severity = 'critical';
    else if (maxZScore >= 4) severity = 'high';
    else if (maxZScore >= 3) severity = 'medium';

    const flagged = reasons.length > 0;

    if (flagged) {
      const anomaly = await Anomaly.create({
        creatorId: creator._id,
        anomalyScore: parseFloat(maxZScore.toFixed(2)),
        flagged: true,
        reason: reasons.join('; '),
        metrics: {
          zScoreViews: parseFloat(zViews.toFixed(2)),
          zScoreLikes: parseFloat(zLikes.toFixed(2)),
          zScoreShares: parseFloat(zShares.toFixed(2)),
          zScoreWatchTime: parseFloat(zWatchTime.toFixed(2)),
          likesViewsRatio: parseFloat(likesViewsRatio.toFixed(4)),
          sharesViewsRatio: parseFloat(sharesViewsRatio.toFixed(4)),
        },
        severity,
      });

      // Update creator trust score (reduce by severity)
      const trustReduction = severity === 'critical' ? 30 : severity === 'high' ? 20 : severity === 'medium' ? 10 : 5;
      creator.trustScore = Math.max(0, creator.trustScore - trustReduction);
      if (severity === 'critical') creator.status = 'flagged';
      await creator.save();

      anomalyResults.push(anomaly);
    }
  }

  return anomalyResults;
}

/**
 * Calculate a 0-100 Malicious Activity Score based on raw engagement logs
 */
async function calculateAutoMaliciousScore(creatorId) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // Analyze last 14 days

  const engagements = await Engagement.find({
    creatorId,
    timestamp: { $gte: windowStart }
  }).sort({ timestamp: -1 });

  if (engagements.length < 3) return 0;

  let score = 0;
  
  // 1. Z-Score / Volume Analysis (Max 40 points)
  // Calculate internal consistency
  const views = engagements.map(e => e.views);
  const { mean, stdDev } = calcStats(views);
  const maxView = Math.max(...views);
  const internalZ = zScore(maxView, mean, stdDev);
  
  // High internal volatility adds points
  score += Math.min(40, (internalZ * 8));

  // 2. Engagement Ratio Audit (Max 30 points)
  // Check for suspicious like/view or share/view ratios across all logs
  let totalViews = 0;
  let totalLikes = 0;
  for (const e of engagements) {
    totalViews += e.views;
    totalLikes += e.likes;
    const ratio = e.views > 0 ? e.likes / e.views : 0;
    if (ratio > 0.7) score += 5; // Direct penalty for suspect logs
  }
  const avgRatio = totalViews > 0 ? totalLikes / totalViews : 0;
  if (avgRatio > 0.5) score += 15;

  // 3. Historical Spike Audit (Max 30 points)
  // Compare recent vs older within the window
  const recent = views.slice(0, 3);
  const older = views.slice(3);
  if (older.length > 0) {
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const spikeRatio = olderAvg > 0 ? recentAvg / olderAvg : 1;
    if (spikeRatio > 10) score += 30;
    else if (spikeRatio > 5) score += 20;
    else if (spikeRatio > 2) score += 10;
  }

  // Final normalization
  return Math.min(100, Math.max(0, Math.floor(score)));
}

module.exports = { runAnomalyDetection, calculateAutoMaliciousScore, calcStats, zScore };
