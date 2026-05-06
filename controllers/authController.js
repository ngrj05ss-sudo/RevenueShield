const User = require('../models/User');
const Creator = require('../models/Creator');
const Engagement = require('../models/Engagement');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

exports.getAdminLogin = (req, res) => {
  res.render('admin_login', { title: 'Admin Login', error: null });
};

exports.getCreatorLogin = (req, res) => {
  res.render('creator_login', { title: 'Creator Login', error: null });
};

exports.getRegister = (req, res) => {
  res.render('register', { title: 'Creator Signup', error: null });
};

exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('admin_login', { title: 'Admin Login', error: 'Please provide email and password' });
  }

  const user = await User.findOne({ email, role: 'admin' }).select('+password');

  if (!user || !(await user.comparePassword(password, user.password))) {
    return res.render('admin_login', { title: 'Admin Login', error: 'Invalid admin credentials' });
  }

  req.session.userId = user._id;
  req.session.email = user.email;
  req.session.role = user.role;
  
  res.redirect('/dashboard/admin');
});

exports.creatorLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('creator_login', { title: 'Creator Login', error: 'Please provide email and password' });
  }

  const user = await User.findOne({ email, role: 'creator' }).select('+password');

  if (!user || !(await user.comparePassword(password, user.password))) {
    return res.render('creator_login', { title: 'Creator Login', error: 'Invalid creator credentials' });
  }

  req.session.userId = user._id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.creatorId = user.creatorId;

  res.redirect('/dashboard/portal');
});

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.render('register', { title: 'Creator Signup', error: 'All fields are required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.render('register', { title: 'Creator Signup', error: 'Email already in use' });
  }

  const creator = await Creator.create({ name, email });
  const user = await User.create({ email, password, role: 'creator', creatorId: creator._id });

  // --- AUTO-GENERATE DATA FOR NEW CREATOR ---
  const engagements = [];
  const now = Date.now();
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  for (let day = 13; day >= 0; day--) {
    const baseViews = rand(500, 5000);
    let views = baseViews;
    let likes = Math.floor(baseViews * (rand(5, 25) / 100));
    
    // Simulate some malicious/anonymous activity (spikes)
    if (day === 3 || day === 7) {
      views = baseViews * 10; // Suspect spike
      likes = Math.floor(views * 0.4); // Unusually high like ratio
    }

    engagements.push({
      creatorId: creator._id,
      views,
      likes,
      shares: Math.floor(baseViews * (rand(1, 8) / 100)),
      watchTime: rand(30, 300),
      timestamp: new Date(now - day * 24 * 60 * 60 * 1000 + rand(0, 86400000)),
    });
  }
  await Engagement.insertMany(engagements);
  // ------------------------------------------

  req.session.userId = user._id;
  req.session.email = user.email;
  req.session.role = user.role;
  req.session.creatorId = user.creatorId;

  res.redirect('/dashboard/portal');
});

exports.logout = (req, res) => {
  const role = req.session.role;
  req.session.destroy(() => {
    if (role === 'admin') {
      res.redirect('/auth/admin/login');
    } else {
      res.redirect('/auth/creator/login');
    }
  });
};

exports.createAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }

  await User.create({ email, password, role: 'admin' });
  res.status(201).json({ success: true, message: 'Admin created successfully' });
});
