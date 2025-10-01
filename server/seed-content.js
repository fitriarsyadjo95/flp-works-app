/**
 * Seed Script - Add Sample Content with YouTube Videos
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'signals.db');
const db = new Database(dbPath);

console.log('🌱 Seeding sample content...\n');

// Sample courses with YouTube videos
const sampleCourses = [
    {
        id: uuidv4(),
        title: 'Forex Trading Basics for Beginners',
        description: 'Learn the fundamentals of forex trading including currency pairs, pips, leverage, and how to read charts. Perfect for those just starting their trading journey.',
        thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '15:30',
        category: 'Forex Basics',
        tags: JSON.stringify(['forex', 'beginner', 'trading', 'basics']),
        difficulty: 'Beginner',
        views: 1250,
        is_published: 1,
        order_index: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        title: 'Technical Analysis: Support and Resistance',
        description: 'Master the art of identifying support and resistance levels using price action and technical indicators. Learn how to use these levels for entry and exit points.',
        thumbnail_url: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        duration: '22:45',
        category: 'Technical Analysis',
        tags: JSON.stringify(['technical analysis', 'support', 'resistance', 'intermediate']),
        difficulty: 'Intermediate',
        views: 890,
        is_published: 1,
        order_index: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        title: 'Advanced Risk Management Strategies',
        description: 'Deep dive into professional risk management techniques including position sizing, portfolio diversification, and risk-reward ratios. Essential for serious traders.',
        thumbnail_url: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
        video_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        duration: '28:15',
        category: 'Risk Management',
        tags: JSON.stringify(['risk management', 'advanced', 'position sizing', 'professional']),
        difficulty: 'Advanced',
        views: 645,
        is_published: 1,
        order_index: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

// Insert courses
const insertCourse = db.prepare(`
    INSERT INTO courses (
        id, title, description, thumbnail_url, video_url, duration,
        category, tags, difficulty, views, is_published, order_index,
        created_at, updated_at
    ) VALUES (
        @id, @title, @description, @thumbnail_url, @video_url, @duration,
        @category, @tags, @difficulty, @views, @is_published, @order_index,
        @created_at, @updated_at
    )
`);

try {
    // Check if courses already exist
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM courses').get();

    if (existingCount.count > 0) {
        console.log(`⚠️  Found ${existingCount.count} existing courses.`);
        console.log('Do you want to add more courses or skip? (Adding anyway...)\n');
    }

    for (const course of sampleCourses) {
        insertCourse.run(course);
        console.log(`✓ Added: ${course.title}`);
        console.log(`  Category: ${course.category} | Difficulty: ${course.difficulty}`);
        console.log(`  Video: ${course.video_url}`);
        console.log('');
    }

    console.log(`\n✅ Successfully seeded ${sampleCourses.length} courses!\n`);
    console.log('📊 Total courses in database:', db.prepare('SELECT COUNT(*) as count FROM courses').get().count);

} catch (error) {
    console.error('❌ Error seeding content:', error.message);
} finally {
    db.close();
}
