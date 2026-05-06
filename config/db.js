const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // Try connecting to the configured URI first
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.log('⚠️  Local MongoDB not available, starting in-memory server...');
    }

    // Fallback to in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log(`✅ MongoDB In-Memory Server running at ${uri}`);

    // Auto-seed data when using in-memory DB
    await seedData();

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

async function seedData() {
  const User = require('../models/User');
  const Creator = require('../models/Creator');
  const Engagement = require('../models/Engagement');
  const Revenue = require('../models/Revenue');

  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('🌱 Auto-seeding in-memory database with auth accounts...');

  // 1. Create ADMIN
  await User.create({
    email: 'admin@revenueshield.io',
    password: 'admin123',
    role: 'admin'
  });

  const creators = [
    { name: 'Aria Chen', email: 'aria@creators.io', trustScore: 95 },
    { name: 'Marcus Rivera', email: 'marcus@creators.io', trustScore: 88 },
    { name: 'Sofia Patel', email: 'sofia@creators.io', trustScore: 92 },
    { name: 'James Okonkwo', email: 'james@creators.io', trustScore: 78 },
    { name: 'Luna Zhang', email: 'luna@creators.io', trustScore: 85 },
    { name: 'David Kim', email: 'david@creators.io', trustScore: 90 },
    { name: 'Emma Wilson', email: 'emma@creators.io', trustScore: 70 },
    { name: 'Carlos Mendez', email: 'carlos@creators.io', trustScore: 82 },
    { name: 'Priya Sharma', email: 'priya@creators.io', trustScore: 96 },
    { name: 'Tyler Brooks', email: 'tyler@creators.io', trustScore: 45 },
  ];

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // 2. Create Creators and Users
  const created = [];
  for (const cData of creators) {
    const creator = await Creator.create(cData);
    await User.create({
      email: cData.email,
      password: 'password123',
      role: 'creator',
      creatorId: creator._id
    });
    created.push(creator);
  }

  // 3. Create Engagements
  const engagements = [];
  const now = Date.now();
  for (let day = 27; day >= 0; day--) {
    for (const c of created) {
      const baseViews = rand(500, 5000);
      let views = baseViews, likes = Math.floor(baseViews * (rand(5, 25) / 100));
      const shares = Math.floor(baseViews * (rand(1, 8) / 100));
      const watchTime = rand(30, 300);
      if (c.name === 'Tyler Brooks' && day < 5) views = baseViews * 8;
      if (c.name === 'Emma Wilson' && day < 7) likes = likes * 5;
      engagements.push({
        creatorId: c._id, views, likes, shares, watchTime,
        timestamp: new Date(now - day * 24 * 60 * 60 * 1000 + rand(0, 86400000)),
      });
    }
  }
  await Engagement.insertMany(engagements);

  // 4. Create Revenue
  await Revenue.create({
    totalPool: 50000,
    distributionRules: { views: 0.3, likes: 0.25, shares: 0.2, watchTime: 0.25 },
    cycle: 'weekly',
  });

  console.log(`✅ Seeded Admin, ${created.length} creators with accounts, and history.`);
}

module.exports = connectDB;
