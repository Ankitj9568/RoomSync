const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbInstance = null;
let isMySQL = !!process.env.DATABASE_URL;

async function getDB() {
    if (dbInstance) {
        return dbInstance;
    }
    
    if (isMySQL) {
        console.log("Connecting to MySQL Database...");
        dbInstance = mysql.createPool(process.env.DATABASE_URL);
        
        // Test connection
        try {
            await dbInstance.query('SELECT 1');
            console.log("MySQL connection successful.");
            
            // Auto-migrate MySQL schema for new columns/tables
            try {
                await dbInstance.query("ALTER TABLE payments ADD COLUMN status VARCHAR(50) DEFAULT 'approved'");
                console.log("Migrated payments table: added status column.");
            } catch (e) { /* Ignore if column exists */ }
            
            try {
                await dbInstance.query("ALTER TABLE group_settings ADD COLUMN allow_direct_join TINYINT(1) DEFAULT 1");
                console.log("Migrated group_settings table: added allow_direct_join column.");
            } catch (e) { /* Ignore if column exists */ }
            
            try {
                await dbInstance.query(`
                    CREATE TABLE IF NOT EXISTS join_requests (
                        request_id INT AUTO_INCREMENT PRIMARY KEY,
                        group_id INT NOT NULL,
                        user_id INT NOT NULL,
                        status VARCHAR(50) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (group_id) REFERENCES \`groups\`(group_id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                    )
                `);
                console.log("Migrated join_requests table.");
            } catch (e) {
                console.error("Failed to create join_requests table:", e);
            }
            
        } catch (e) {
            console.error("MySQL connection failed", e);
            throw e;
        }
    } else {
        console.log("Connecting to local SQLite Database...");
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');
        
        const dbPath = path.join(__dirname, '../database/roomsync.db');
        const isNewDb = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;
        
        // Open SQLite connection
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // Enable Foreign Keys for SQLite
        await dbInstance.run('PRAGMA foreign_keys = ON');

        if (isNewDb) {
            console.log("Empty SQLite database detected. Running auto-migration...");
            try {
                const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf-8');
                await dbInstance.exec(schemaSql);
                
                const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf-8');
                await dbInstance.exec(seedSql);
                
                console.log("Database initialized and seeded successfully.");
            } catch (error) {
                console.error("Failed to initialize database:", error);
                throw error;
            }
        }
    }
    
    return dbInstance;
}

// Map SQLite syntax to MySQL syntax if needed
const dbProxy = {
    async all(sql, params) {
        const db = await getDB();
        if (isMySQL) {
            // Convert SQLite '?' to MySQL '?' (which is the same)
            const [rows] = await db.query(sql, params);
            return rows;
        } else {
            return db.all(sql, params);
        }
    },
    async get(sql, params) {
        const db = await getDB();
        if (isMySQL) {
            const [rows] = await db.query(sql, params);
            return rows[0];
        } else {
            return db.get(sql, params);
        }
    },
    async run(sql, params) {
        const db = await getDB();
        if (isMySQL) {
            // NOTE: START TRANSACTION / COMMIT / ROLLBACK via pool.query() 
            // is unsafe without a dedicated connection. We removed them to avoid bugs.
            const [result] = await db.execute(sql, params || []);
            return { lastID: result.insertId, changes: result.affectedRows };
        } else {
            return db.run(sql, params);
        }
    },
    async exec(sql) {
        const db = await getDB();
        if (isMySQL) {
            // Exec runs raw multi-statement. Usually not called in production once seeded.
            return db.query(sql);
        } else {
            return db.exec(sql);
        }
    }
};

module.exports = dbProxy;
