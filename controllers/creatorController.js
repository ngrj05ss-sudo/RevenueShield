const Creator = require('../models/Creator');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/creators — Get all creators
exports.getCreators = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.status) query.status = req.query.status;

  const [creators, total] = await Promise.all([
    Creator.find(query).sort({ totalEarnings: -1 }).skip(skip).limit(limit),
    Creator.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: creators,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /api/creators — Create a creator
exports.createCreator = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) throw new AppError('Name and email are required', 400);

  const creator = await Creator.create({ name, email });
  res.status(201).json({ success: true, data: creator });
});

// GET /api/creators/:id — Get single creator
exports.getCreator = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new AppError('Creator not found', 404);
  res.json({ success: true, data: creator });
});

// PATCH /api/creators/:id/status — Admin: Update status, frozen state, and malicious score
exports.updateCreatorStatus = asyncHandler(async (req, res) => {
  const { status, isFrozen, maliciousScore } = req.body;
  
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new AppError('Creator not found', 404);

  if (status) creator.status = status;
  if (isFrozen !== undefined) creator.isFrozen = isFrozen;
  if (maliciousScore !== undefined) creator.maliciousScore = maliciousScore;

  await creator.save();

  res.json({ success: true, data: creator });
});
