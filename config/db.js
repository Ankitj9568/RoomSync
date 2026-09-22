const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
require('dotenv').config();

let dbInstance = null;
let initializationPromise = null;
const isMySQL = Boolean(process.env.DATABASE_URL);

function sqlStatements(script) {
    return script
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);
}

async function initializeMySQL(pool) {
    await pool.query('SELECT 1');
    const [tableRows] = await pool.query('SHOW TABLES');
    const existingTables = new Set(tableRows.map(row => Object.values(row)[0]));
    const requiredTables = ['users', 'groups', 'group_members', 'groceries', 'grocery_contributors', 'shopping_list', 'meals', 'daily_menus', 'expenses', 'expense_payers', 'expense_members', 'payments', 'adjustments', 'group_settings', 'join_requests', 'activity_logs'];

    if (requiredTables.some(table => !existingTables.has(table))) {
        const schema = fs.readFileSync(path.join(__dirname, '../database/schema_mysql.sql'), 'utf8');
        for (const statement of sqlStatements(schema)) {
            try {
                await pool.query(statement);
            } catch (error) {
                // Existing indexes can be encountered when completing a
                // partially initialized database; table creation remains strict.
                if (!statement.toUpperCase().startsWith('CREATE INDEX')) throw error;
            }
        }
        console.log('MySQL schema initialized successfully.');
    }

    // Safe, idempotent migrations for databases created before the current schema.
    const migrations = [
        "ALTER TABLE payments ADD COLUMN status VARCHAR(50) DEFAULT 'pending'",
        "ALTER TABLE group_settings ADD COLUMN allow_direct_join TINYINT(1) DEFAULT 1",
        `CREATE TABLE IF NOT EXISTS join_requests (
            request_id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            user_id INT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES \`groups\`(group_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )`
    ];

    for (const migration of migrations) {
        try {
            await pool.query(migration);
        } catch (error) {
            // ALTER TABLE statements fail when the column already exists.
            if (!migration.startsWith('ALTER TABLE')) throw error;
        }
    }

    // Older deployments used a group-less meal uniqueness key, which breaks
    // users who belong to more than one group. Replace it when necessary.
    const [mealIndexes] = await pool.query('SHOW INDEX FROM meals');
    const indexesByName = new Map();
    for (const index of mealIndexes) {
        if (!indexesByName.has(index.Key_name)) indexesByName.set(index.Key_name, []);
        indexesByName.get(index.Key_name)[Number(index.Seq_in_index) - 1] = index;
    }
    const scopedColumns = ['group_id', 'user_id', 'meal_date', 'meal_type'];
    const oldColumns = ['user_id', 'meal_date', 'meal_type'];
    const matchingIndex = columns => indexes =>
        indexes.length === columns.length &&
        indexes.every((index, position) => index.Non_unique === 0 && index.Column_name === columns[position]);
    const hasScopedMealKey = [...indexesByName.values()].some(matchingIndex(scopedColumns));
    if (!hasScopedMealKey) {
        const oldKeys = [...indexesByName.entries()]
            .filter(([key, indexes]) => key !== 'PRIMARY' && matchingIndex(oldColumns)(indexes))
            .map(([key]) => key);
        for (const key of oldKeys) {
            await pool.query(`ALTER TABLE meals DROP INDEX \`${key.replace(/`/g, '')}\``);
        }
        await pool.query('ALTER TABLE meals ADD UNIQUE KEY unique_meal_entry (group_id, user_id, meal_date, meal_type)');
    }
}

async function migrateSQLite(database) {
    const indexes = await database.all("PRAGMA index_list('meals')");
    let hasGroupScopedKey = false;
    for (const index of indexes) {
        if (!index.unique) continue;
        const columns = await database.all(`PRAGMA index_info('${String(index.name).replace(/'/g, "''")}')`);
        const names = columns.map(column => column.name).sort().join(',');
        if (names === 'group_id,meal_date,meal_type,user_id') hasGroupScopedKey = true;
    }
    if (!hasGroupScopedKey) {
        await database.run('BEGIN');
        try {
            await database.run('ALTER TABLE meals RENAME TO meals_legacy');
            await database.exec(`
                CREATE TABLE meals (
                  meal_id INTEGER PRIMARY KEY AUTOINCREMENT,
                  group_id INTEGER NOT NULL,
                  user_id INTEGER NOT NULL,
                  meal_date DATE NOT NULL,
                  meal_type TEXT NOT NULL,
                  is_attending INTEGER NOT NULL DEFAULT 1,
                  diet_preference TEXT DEFAULT 'veg',
                  guest_count INTEGER DEFAULT 0,
                  UNIQUE (group_id, user_id, meal_date, meal_type),
                  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
                  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
            `);
            await database.run('INSERT OR IGNORE INTO meals (meal_id, group_id, user_id, meal_date, meal_type, is_attending, diet_preference, guest_count) SELECT meal_id, group_id, user_id, meal_date, meal_type, is_attending, diet_preference, guest_count FROM meals_legacy');
            await database.run('DROP TABLE meals_legacy');
            await database.run('CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(meal_date)');
            await database.run('COMMIT');
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    }
}

async function initializeSQLite(database, isNewDb) {
    await database.run('PRAGMA foreign_keys = ON');
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await database.exec(schema);
    if (!isNewDb) await migrateSQLite(database);

    if (isNewDb) {
        const seed = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8');
        await database.exec(seed);
        console.log('SQLite database initialized and seeded successfully.');
    }
}

async function getDB() {
    if (dbInstance) return dbInstance;
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        if (isMySQL) {
            console.log('Connecting to MySQL Database...');
            dbInstance = createMySQLPool(process.env.DATABASE_URL);
            await initializeMySQL(dbInstance);
            console.log('MySQL connection successful.');
        } else {
            console.log('Connecting to local SQLite Database...');
            const sqlite3 = require('sqlite3');
            const { open } = require('sqlite');
            const dbPath = process.env.NODE_ENV === 'test'
                ? ':memory:'
                : path.join(__dirname, '../database/roomsync.db');
            const isNewDb = dbPath === ':memory:' || !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;
            dbInstance = await open({ filename: dbPath, driver: sqlite3.Database });
            await initializeSQLite(dbInstance, isNewDb);
        }
        return dbInstance;
    })();

    try {
        return await initializationPromise;
    } catch (error) {
        dbInstance = null;
        throw error;
    } finally {
        initializationPromise = null;
    }
}

function createMySQLPool(connectionUrl) {
    // mysql2 does not translate Aiven's `ssl-mode=REQUIRED` URI parameter
    // into its `ssl` option. Parse that provider URI explicitly so Vercel can
    // connect over TLS using the copied Service URI.
    let parsed;
    try {
        parsed = new URL(connectionUrl);
    } catch {
        return mysql.createPool(connectionUrl);
    }

    const sslMode = parsed.searchParams.get('ssl-mode');
    if (!sslMode) return mysql.createPool(connectionUrl);

    const options = {
        host: decodeURIComponent(parsed.hostname),
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
        waitForConnections: true,
        connectionLimit: 5
    };

    if (sslMode.toUpperCase() !== 'DISABLED') {
        options.ssl = process.env.MYSQL_CA_CERT
            ? { ca: process.env.MYSQL_CA_CERT, rejectUnauthorized: true }
            : { rejectUnauthorized: false };
    }
    return mysql.createPool(options);
}

function adapter(connection, mysqlConnection = isMySQL) {
    return {
        async all(sql, params = []) {
            if (mysqlConnection) {
                const [rows] = await connection.query(sql, params);
                return rows;
            }
            return connection.all(sql, params);
        },
        async get(sql, params = []) {
            if (mysqlConnection) {
                const [rows] = await connection.query(sql, params);
                return rows[0];
            }
            return connection.get(sql, params);
        },
        async run(sql, params = []) {
            if (mysqlConnection) {
                const [result] = await connection.execute(sql, params);
                return { lastID: result.insertId, changes: result.affectedRows };
            }
            return connection.run(sql, params);
        },
        async exec(sql) {
            if (mysqlConnection) return connection.query(sql);
            return connection.exec(sql);
        }
    };
}

const dbProxy = {};

// The public methods acquire the lazily-created database before using the adapter.
dbProxy.all = async (sql, params = []) => adapter(await getDB(), isMySQL).all(sql, params);
dbProxy.get = async (sql, params = []) => adapter(await getDB(), isMySQL).get(sql, params);
dbProxy.run = async (sql, params = []) => adapter(await getDB(), isMySQL).run(sql, params);
dbProxy.exec = async sql => adapter(await getDB(), isMySQL).exec(sql);

dbProxy.transaction = async callback => {
    const database = await getDB();

    if (isMySQL) {
        const connection = await database.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(adapter(connection, true));
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    await database.run('BEGIN');
    try {
        const result = await callback(adapter(database, false));
        await database.run('COMMIT');
        return result;
    } catch (error) {
        await database.run('ROLLBACK');
        throw error;
    }
};

module.exports = dbProxy;
