/**
 * Script to add 10 more videos and reset saved/completed history
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'signals.db');
const db = new Database(dbPath);

console.log('📚 Adding 10 new trading videos...\n');

// New videos to add
const newVideos = [
    {
        title: 'Support and Resistance Masterclass',
        description: 'Learn to identify key support and resistance levels that professional traders use to make decisions. Master drawing techniques and trading strategies.',
        category: 'Technical Analysis',
        difficulty: 'Intermediate',
        duration: '28:45',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 45200,
        tags: JSON.stringify(['support', 'resistance', 'price-action', 'technical-analysis'])
    },
    {
        title: 'Fibonacci Retracement Trading Strategy',
        description: 'Discover how to use Fibonacci retracement levels to find high-probability entry and exit points in trending markets.',
        category: 'Technical Analysis',
        difficulty: 'Advanced',
        duration: '32:15',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 38900,
        tags: JSON.stringify(['fibonacci', 'retracement', 'technical-analysis', 'advanced'])
    },
    {
        title: 'Day Trading Setup for Beginners',
        description: 'Complete guide to setting up your day trading workspace, choosing platforms, and understanding market hours.',
        category: 'Forex Basics',
        difficulty: 'Beginner',
        duration: '18:30',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 67800,
        tags: JSON.stringify(['day-trading', 'beginner', 'setup', 'basics'])
    },
    {
        title: 'Trading Psychology: Overcoming Fear and Greed',
        description: 'Master your emotions and develop the mental discipline required for consistent trading success.',
        category: 'Psychology',
        difficulty: 'Beginner',
        duration: '25:20',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 52100,
        tags: JSON.stringify(['psychology', 'discipline', 'emotions', 'mindset'])
    },
    {
        title: 'Position Sizing and Lot Calculation',
        description: 'Learn how to calculate proper position sizes based on your account size and risk tolerance.',
        category: 'Risk Management',
        difficulty: 'Intermediate',
        duration: '15:45',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 41200,
        tags: JSON.stringify(['position-sizing', 'risk', 'lot-calculation', 'money-management'])
    },
    {
        title: 'Candlestick Patterns Complete Guide',
        description: 'Master all essential candlestick patterns including doji, hammer, engulfing, and more with real trading examples.',
        category: 'Technical Analysis',
        difficulty: 'Beginner',
        duration: '35:10',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 89400,
        tags: JSON.stringify(['candlesticks', 'patterns', 'price-action', 'technical-analysis'])
    },
    {
        title: 'Swing Trading Strategies for Busy Professionals',
        description: 'Learn swing trading techniques that allow you to trade successfully while working a full-time job.',
        category: 'Strategy',
        difficulty: 'Intermediate',
        duration: '27:40',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 56700,
        tags: JSON.stringify(['swing-trading', 'part-time', 'strategy', 'busy-professionals'])
    },
    {
        title: 'Understanding Market Structure and Trends',
        description: 'Learn to identify market structure, trend direction, and key reversal points like a professional trader.',
        category: 'Technical Analysis',
        difficulty: 'Intermediate',
        duration: '22:55',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 44300,
        tags: JSON.stringify(['market-structure', 'trends', 'price-action', 'analysis'])
    },
    {
        title: 'Stop Loss Placement Techniques',
        description: 'Master the art of stop loss placement to protect your capital while giving trades room to breathe.',
        category: 'Risk Management',
        difficulty: 'Beginner',
        duration: '19:25',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 61500,
        tags: JSON.stringify(['stop-loss', 'risk-management', 'protection', 'exits'])
    },
    {
        title: 'Building a Trading Plan That Works',
        description: 'Step-by-step guide to creating a comprehensive trading plan with rules, goals, and performance tracking.',
        category: 'Strategy',
        difficulty: 'Beginner',
        duration: '24:30',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        views: 73200,
        tags: JSON.stringify(['trading-plan', 'strategy', 'goals', 'discipline'])
    }
];

try {
    // Insert new videos
    const insertStmt = db.prepare(`
        INSERT INTO courses (
            id, title, description, category, difficulty, duration,
            video_url, thumbnail_url, views, tags, is_published,
            order_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))
    `);

    let addedCount = 0;
    for (const video of newVideos) {
        const id = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            insertStmt.run(
                id,
                video.title,
                video.description,
                video.category,
                video.difficulty,
                video.duration,
                video.video_url,
                null, // thumbnail_url
                video.views,
                video.tags
            );
            addedCount++;
            console.log(`✅ Added: ${video.title}`);
        } catch (err) {
            console.log(`⚠️  Error adding "${video.title}": ${err.message}`);
        }
    }

    console.log(`\n✅ Successfully added ${addedCount} new videos!\n`);

    // Reset saved content history
    console.log('🗑️  Resetting saved content history...');
    const deletedSaved = db.prepare('DELETE FROM saved_content').run();
    console.log(`✅ Deleted ${deletedSaved.changes} saved items\n`);

    // Show total courses count
    const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get();
    console.log(`📊 Total videos in database: ${totalCourses.count}\n`);

    console.log('✅ All done! Database has been updated successfully.');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
} finally {
    db.close();
}
