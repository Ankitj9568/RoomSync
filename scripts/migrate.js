const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error("No DATABASE_URL found. Skipping migration.");
        process.exit(1);
    }
    
    console.log("Connecting to MySQL...");
    const db = mysql.createPool(process.env.DATABASE_URL);
    
    const schemaPath = path.join(__dirname, '../database/schema_mysql.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon, but ignore empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} statements to execute.`);
    
    for (let i = 0; i < statements.length; i++) {
        try {
            await db.query(statements[i]);
            console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (e) {
            console.error(`❌ Failed on statement ${i + 1}:`, e.message);
        }
    }
    
    console.log("Migration complete!");
    process.exit(0);
}

migrate();
