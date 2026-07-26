const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Starting database migration for join workflow...");
    
    // Add allow_direct_join to group_settings
    db.run("ALTER TABLE group_settings ADD COLUMN allow_direct_join INTEGER DEFAULT 1", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("Column allow_direct_join already exists.");
            } else {
                console.error("Error adding allow_direct_join:", err.message);
            }
        } else {
            console.log("Added allow_direct_join to group_settings.");
        }
    });
    
    // Create join_requests table
    db.run(`
        CREATE TABLE IF NOT EXISTS join_requests (
            request_id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error("Error creating join_requests table:", err.message);
        } else {
            console.log("Ensured join_requests table exists.");
        }
    });
});

db.close(() => {
    console.log("Migration complete.");
});
