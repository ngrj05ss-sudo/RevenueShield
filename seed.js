require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Creator = require('./models/Creator');
const Engagement = require('./models/Engagement');
const Revenue = require('./models/Revenue');
const Anomaly = require('./models/Anomaly');
const Distribution = require('./models/Distribution');

// Real-world Top YouTube Channels (Simulated API Data)
const creatorsData = [
  { name: 'MrBeast', email: 'mrbeast@youtube.com', trustScore: 99, maliciousScore: 0 },
  { name: 'PewDiePie', email: 'pewdiepie@youtube.com', trustScore: 92, maliciousScore: 5 },
  { name: 'T-Series', email: 'tseries@youtube.com', trustScore: 98, maliciousScore: 0 },
  { name: 'Cocomelon', email: 'cocomelon@youtube.com', trustScore: 99, maliciousScore: 0 },
  { name: 'SET India', email: 'setindia@youtube.com', trustScore: 95, maliciousScore: 2 },
  { name: 'Aria Chen', email: 'aria@creators.io', trustScore: 85, maliciousScore: 40 }, // Suspicious one
  { name: 'Marcus Rivera', email: 'marcus@creators.io', trustScore: 88, maliciousScore: 0 },
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed() {
  let mongoServer;
  try {
    let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/revenue-engine';
    
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to MongoDB');
    } catch (err) {
      console.log('⚠️  Local MongoDB not available for seeding, using in-memory fallback...');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log(`✅ In-Memory Server running at ${uri}`);
    }

    await Promise.all([
      User.deleteMany({}), Creator.deleteMany({}), Engagement.deleteMany({}),
      Revenue.deleteMany({}), Anomaly.deleteMany({}), Distribution.deleteMany({}),
    ]);
    
    try { await mongoose.connection.collection('sessions').deleteMany({}); } catch(e) {}
    console.log('🗑️  Cleared existing data');

    // 1. Create ADMIN USER
    await User.create({
      email: 'admin@revenueshield.io',
      password: 'admin123',
      role: 'admin'
    });
    console.log('👑 Created Admin: admin@revenueshield.io / admin123');

    // 2. Create Top YouTube Creators
    for (const data of creatorsData) {
      const creator = await Creator.create(data);
      await User.create({
        email: data.email,
        password: 'password123',
        role: 'creator',
        creatorId: creator._id
      });

      // 3. Generate Simulated API Engagement (Higher volumes for top channels)
      const engagements = [];
      const now = Date.now();
      const isTopChannel = data.email.includes('youtube.com');
      
      for (let day = 13; day >= 0; day--) {
        const multiplier = isTopChannel ? 100 : 1;
        const baseViews = rand(1000, 5000) * multiplier;
        
        // Add some "Anonymous Activity" spikes for auditing
        let views = baseViews;
        if (day === 5 && data.name === 'Aria Chen') views *= 15; // Huge anomaly

        engagements.push({
          creatorId: creator._id,
          views,
          likes: Math.floor(views * (rand(5, 15) / 100)),
          shares: Math.floor(views * (rand(1, 5) / 100)),
          watchTime: rand(60, 600) * multiplier,
          timestamp: new Date(now - day * 24 * 60 * 60 * 1000 + rand(0, 86400000)),
        });
      }
      await Engagement.insertMany(engagements);
    }
    
    console.log(`👥 Created ${creatorsData.length} channels with real-world metrics.`);

    // 4. Create revenue pool
    await Revenue.create({
      totalPool: 1000000, // $1M pool for big channels
      distributionRules: { views: 0.4, likes: 0.2, shares: 0.1, watchTime: 0.3 },
      cycle: 'monthly',
    });
    console.log(`💰 Created revenue pool: $1,000,000`);

    console.log('\n✅ Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
