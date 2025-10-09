#!/usr/bin/env node

/**
 * Generate Admin Password Hash
 *
 * Usage: node scripts/generate-admin-hash.js
 * Or: node scripts/generate-admin-hash.js "YourPassword123"
 */

const bcrypt = require('bcrypt');
const readline = require('readline');

const SALT_ROUNDS = 12;

async function generateHash(password) {
    if (!password || password.length < 12) {
        console.error('\n❌ Error: Password must be at least 12 characters long\n');
        process.exit(1);
    }

    try {
        console.log('\n🔐 Generating bcrypt hash...\n');

        const hash = await bcrypt.hash(password, SALT_ROUNDS);

        console.log('✅ Password hash generated successfully!\n');
        console.log('━'.repeat(70));
        console.log('\nAdd this to your .env file:\n');
        console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
        console.log('━'.repeat(70));
        console.log('\n⚠️  SECURITY WARNING:');
        console.log('   - Keep this hash secure and never commit it to version control');
        console.log('   - Make sure .env is in your .gitignore file');
        console.log('   - Use different passwords for different environments\n');

    } catch (error) {
        console.error('\n❌ Error generating hash:', error.message);
        process.exit(1);
    }
}

// Check if password provided as argument
if (process.argv[2]) {
    generateHash(process.argv[2]);
} else {
    // Prompt for password
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('\nEnter admin password (min 12 characters): ', (password) => {
        rl.close();
        generateHash(password);
    });
}
