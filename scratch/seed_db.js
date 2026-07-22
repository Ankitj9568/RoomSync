const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            multipleStatements: true
        });

        const schema = fs.readFileSync('database/schema.sql', 'utf8');
        const seed = fs.readFileSync('database/seed.sql', 'utf8');

        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Execute schema and seed
        await db.query(schema);
        await db.query(seed);
        
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log("Database schema and seed executed successfully!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
