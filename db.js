/*
    handles database connection and queries
*/

const { Pool } = require('pg'); // postgresql client library for node, essentially it enables the postgre to connect to my node app by giving it the tools to do so

const isProduction = process.env.NODE_ENV === 'production';
const hasConnectionString = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
    hasConnectionString
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 5000)
        }
        : {
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT || 5432), // default port assigned to PostgreSQL
            user: process.env.PGUSER || process.env.USER,
            password: process.env.PGPASSWORD || '',
            database: process.env.PGDATABASE || 'nexa_v1',
            connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 5000)
        }
);

const usersTableSql = `
    CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
`;

const userAppStateTableSql = `
    CREATE TABLE IF NOT EXISTS user_app_state (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        storage JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
`;

function formatDbError(error) {
    return error.detail || error.message || error.code || 'Unknown database error';
}

async function testDatabaseConnection() {
    await pool.query('SELECT 1');
}

async function ensureDatabaseSchema() {
    await pool.query(usersTableSql);
    await pool.query(userAppStateTableSql);
}

async function findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
        `SELECT id, name, email, password_hash AS password
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [normalizedEmail]
    );

    return result.rows[0] || null;
}

async function findUserById(id) {
    const result = await pool.query(
        `SELECT id, name, email, password_hash AS password
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [id]
    );

    return result.rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, password_hash AS password`,
        [name.trim(), normalizedEmail, passwordHash]
    );

    return result.rows[0];
}

async function updateUserById(id, { name, email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
        `UPDATE users
         SET name = $2,
             email = $3
         WHERE id = $1
         RETURNING id, name, email, password_hash AS password`,
        [id, name.trim(), normalizedEmail]
    );

    return result.rows[0] || null;
}

async function getUserAppState(userId) {
    const result = await pool.query(
        `SELECT storage
         FROM user_app_state
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
    );

    if (!result.rows[0]) {
        await pool.query(
            `INSERT INTO user_app_state (user_id, storage)
             VALUES ($1, '{}'::jsonb)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        return {};
    }

    return result.rows[0].storage || {};
}

async function saveUserAppState(userId, storage) {
    const normalizedStorage = storage && typeof storage === 'object' ? storage : {};

    const result = await pool.query(
        `INSERT INTO user_app_state (user_id, storage, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET storage = EXCLUDED.storage,
             updated_at = NOW()
         RETURNING storage`,
        [userId, JSON.stringify(normalizedStorage)]
    );

    return result.rows[0]?.storage || {};
}

module.exports = {
    pool,
    ensureDatabaseSchema,
    formatDbError,
    testDatabaseConnection,
    findUserByEmail,
    findUserById,
    createUser,
    updateUserById,
    getUserAppState,
    saveUserAppState
};
