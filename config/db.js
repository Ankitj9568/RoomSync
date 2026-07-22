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
            if (sql.trim().toUpperCase() === 'BEGIN TRANSACTION') {
                const [res] = await db.query('START TRANSACTION');
                return res;
            }
            if (sql.trim().toUpperCase() === 'COMMIT') {
                const [res] = await db.query('COMMIT');
                return res;
            }
            if (sql.trim().toUpperCase() === 'ROLLBACK') {
                const [res] = await db.query('ROLLBACK');
                return res;
            }
            
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
