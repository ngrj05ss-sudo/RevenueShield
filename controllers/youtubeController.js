const Creator = require('../models/Creator');
const Engagement = require('../models/Engagement');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/youtube/channels
 * Returns a simulated "YouTube Data API" response for top channels
 */
exports.getYouTubeStats = asyncHandler(async (req, res) => {
  const topChannels = await Creator.find({ email: { $regex: 'youtube.com' } });
  
  const stats = await Promise.all(topChannels.map(async (channel) => {
    const engagements = await Engagement.find({ creatorId: channel._id });
    const totalViews = engagements.reduce((sum, e) => sum + e.views, 0);
    const totalLikes = engagements.reduce((sum, e) => sum + e.likes, 0);
    
    return {
      kind: "youtube#channel",
      id: channel._id,
      snippet: {
        title: channel.name,
        description: `Official ${channel.name} channel statistics aggregated for revenue distribution.`,
        publishedAt: channel.createdAt,
      },
      statistics: {
        viewCount: totalViews,
        subscriberCount: "Hidden",
        videoCount: engagements.length,
        likeCount: totalLikes
      },
      audit: {
        trustScore: channel.trustScore,
        maliciousScore: channel.maliciousScore,
        status: channel.status,
        revenueFrozen: channel.isFrozen
      }
    };
  }));

  res.json({
    kind: "youtube#channelListResponse",
    pageInfo: { totalResults: stats.length, resultsPerPage: stats.length },
    items: stats
  });
});
