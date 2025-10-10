/**
 * Remove Specific Courses Script
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'signals.db');
const db = new Database(dbPath);

console.log('🗑️  Removing specific courses...\n');

const coursesToRemove = [
    'Advanced Risk Management Strategies',
    'Technical Analysis: Support and Resistance',
    'Forex Trading Basics for Beginners'
];

try {
    const deleteCourse = db.prepare(`
        DELETE FROM courses WHERE title = ?
    `);

    for (const title of coursesToRemove) {
        const result = deleteCourse.run(title);
        if (result.changes > 0) {
            console.log(`✓ Removed: ${title}`);
        } else {
            console.log(`⚠️  Not found: ${title}`);
        }
    }

    console.log(`\n✅ Cleanup complete!\n`);
    console.log('📊 Remaining courses in database:', db.prepare('SELECT COUNT(*) as count FROM courses').get().count);

} catch (error) {
    console.error('❌ Error removing courses:', error.message);
} finally {
    db.close();
}
