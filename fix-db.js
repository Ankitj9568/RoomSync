const dbProxy = require('./config/db');

async function migrate() {
    console.log("Starting DB migration via db.js...");
    const isMySQL = !!process.env.DATABASE_URL;
    
    try {
        if (isMySQL) {
            console.log("Running MySQL migrations...");
            // allow_direct_join
            try {
                await dbProxy.run("ALTER TABLE group_settings ADD COLUMN allow_direct_join TINYINT(1) DEFAULT 1");
                console.log("Added allow_direct_join to group_settings");
            } catch (e) {
                if (e.message.includes('Duplicate column name')) {
                    console.log("Column allow_direct_join already exists.");
                } else {
                    console.error("Error:", e.message);
                }
            }
            
            // join_requests
            try {
                await dbProxy.run(`
                    CREATE TABLE IF NOT EXISTS join_requests (
                        request_id INT AUTO_INCREMENT PRIMARY KEY,
                        group_id INT NOT NULL,
                        user_id INT NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (group_id) REFERENCES \`groups\`(group_id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                    )
                `);
                console.log("Ensured join_requests table exists.");
            } catch (e) {
                console.error("Error creating join_requests:", e.message);
            }
        } else {
            console.log("Running SQLite migrations...");
            try {
                await dbProxy.run("ALTER TABLE group_settings ADD COLUMN allow_direct_join INTEGER DEFAULT 1");
                console.log("Added allow_direct_join to group_settings");
            } catch (e) {
                if (e.message.includes('duplicate column name')) {
                    console.log("Column allow_direct_join already exists.");
                } else {
                    console.error("Error:", e.message);
                }
            }
            
            try {
                await dbProxy.run(`
                    CREATE TABLE IF NOT EXISTS join_requests (
                        request_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        group_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (group_id) REFERENCES \`groups\`(group_id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                    )
                `);
                console.log("Ensured join_requests table exists.");
            } catch (e) {
                console.error("Error creating join_requests:", e.message);
            }
        }
        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Fatal migration error:", err);
        process.exit(1);
    }
}

migrate();
