const Anomaly = require('../models/Anomaly');
const Creator = require('../models/Creator');
const { runAnomalyDetection, calculateAutoMaliciousScore } = require('../services/anomalyDetection');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/anomalies — Get all anomalies
exports.getAnomalies = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.flagged === 'true') query.flagged = true;
  if (req.query.severity) query.severity = req.query.severity;
  if (req.query.creatorId) query.creatorId = req.query.creatorId;

  const [anomalies, total] = await Promise.all([
    Anomaly.find(query).populate('creatorId', 'name email trustScore').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Anomaly.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: anomalies,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /api/anomalies/detect — Run anomaly detection
exports.detectAnomalies = asyncHandler(async (req, res) => {
  const windowDays = parseInt(req.query.windowDays) || 7;
  const results = await runAnomalyDetection(windowDays);

  req.app.get('io')?.emit('anomaliesDetected', results);

  res.json({
    success: true,
    detected: results.length,
    data: results,
  });
});

// PUT /api/anomalies/:id/resolve — Resolve an anomaly
exports.resolveAnomaly = asyncHandler(async (req, res) => {
  const anomaly = await Anomaly.findById(req.params.id);
  if (!anomaly) throw new AppError('Anomaly not found', 404);

  anomaly.resolved = true;
  await anomaly.save();

  res.json({ success: true, data: anomaly });
});

// POST /api/anomalies/audit/:creatorId — Run deep auto-audit for a creator
exports.auditCreator = asyncHandler(async (req, res) => {
  const score = await calculateAutoMaliciousScore(req.params.creatorId);
  
  const creator = await Creator.findById(req.params.creatorId);
  if (!creator) throw new AppError('Creator not found', 404);

  creator.maliciousScore = score;
  await creator.save();

  res.json({
    success: true,
    maliciousScore: score,
    recommendation: score > 75 ? 'Critical Risk: Immediate Freeze' : score > 50 ? 'High Risk: Frequent Auditing' : score > 25 ? 'Moderate Risk: Monitor Activity' : 'Low Risk: No action required'
  });
});
