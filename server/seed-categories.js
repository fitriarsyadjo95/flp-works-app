/**
 * Seed Script - Add Default Categories
 * Maps frontend categories to backend category management
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'signals.db');
const db = new Database(dbPath);

console.log('🏷️  Seeding default categories...\n');

// Default categories with colors and icons
const defaultCategories = [
    {
        id: uuidv4(),
        name: 'Forex Basics',
        description: 'Fundamental forex trading concepts and principles for beginners',
        color: '#3B82F6', // Blue
        icon: '📚',
        order_index: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Technical Analysis',
        description: 'Chart patterns, indicators, and technical trading strategies',
        color: '#14B8A6', // Teal
        icon: '📊',
        order_index: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Risk Management',
        description: 'Position sizing, risk-reward ratios, and capital preservation',
        color: '#EF4444', // Red
        icon: '🛡️',
        order_index: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Psychology',
        description: 'Trading psychology, emotions, and mental discipline',
        color: '#F59E0B', // Orange
        icon: '🧠',
        order_index: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Strategy',
        description: 'Trading strategies, systems, and methodologies',
        color: '#8B5CF6', // Purple
        icon: '⚡',
        order_index: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Platform Tutorial',
        description: 'MT4, MT5, and other trading platform tutorials',
        color: '#10B981', // Green
        icon: '💻',
        order_index: 6,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

// Insert categories
const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (
        id, name, description, color, icon, order_index, created_at, updated_at
    ) VALUES (
        @id, @name, @description, @color, @icon, @order_index, @created_at, @updated_at
    )
`);

try {
    // Check if categories already exist
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();

    if (existingCount.count > 0) {
        console.log(`⚠️  Found ${existingCount.count} existing categories.`);
        console.log('Skipping categories that already exist...\n');
    }

    let addedCount = 0;
    for (const category of defaultCategories) {
        const result = insertCategory.run(category);
        if (result.changes > 0) {
            console.log(`✓ Added: ${category.icon} ${category.name}`);
            console.log(`  Color: ${category.color} | Description: ${category.description}`);
            console.log('');
            addedCount++;
        } else {
            console.log(`⊘ Skipped: ${category.name} (already exists)`);
        }
    }

    console.log(`\n✅ Successfully seeded ${addedCount} new categories!`);

    // Show final count
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    console.log(`📊 Total categories in database: ${finalCount.count}\n`);

    // Show category usage stats
    console.log('📈 Category Usage:\n');
    const stats = db.prepare(`
        SELECT
            c.name,
            c.icon,
            COUNT(co.id) as course_count
        FROM categories c
        LEFT JOIN courses co ON co.category = c.name
        GROUP BY c.id
        ORDER BY c.order_index ASC
    `).all();

    stats.forEach(stat => {
        console.log(`   ${stat.icon} ${stat.name}: ${stat.course_count} courses`);
    });

} catch (error) {
    console.error('❌ Error seeding categories:', error.message);
} finally {
    db.close();
}
