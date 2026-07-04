// Self-contained auth: file-based user store + in-memory sessions via cookie.
// Uses only Node built-ins (crypto, fs) — no extra dependencies.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COOKIE = 'vs_session';

// bot token used to verify Telegram Login Widget payloads (optional)
const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function ensureStore() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
}
function readUsers() {
    ensureStore();
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsers(users) {
    ensureStore();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt) {
    salt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return { salt, hash };
}
function verifyPassword(password, salt, hash) {
    const h = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
}

// in-memory sessions: token -> userId
const sessions = new Map();
function newSession(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, userId);
    return token;
}

function parseCookies(req) {
    const out = {};
    const raw = req.headers.cookie;
    if (!raw) return out;
    raw.split(';').forEach(p => {
        const i = p.indexOf('=');
        if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
    return out;
}
function setSessionCookie(res, token) {
    res.setHeader('Set-Cookie',
        `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
}
function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function currentUser(req) {
    const token = parseCookies(req)[COOKIE];
    if (!token) return null;
    const userId = sessions.get(token);
    if (!userId) return null;
    return readUsers().find(u => u.id === userId) || null;
}

// public view of a user (never leak hash/salt)
function publicUser(u) {
    if (!u) return null;
    return { id: u.id, email: u.email, name: u.name, telegram: u.telegram || null };
}

function register(app) {
    app.post('/api/auth/signup', (req, res) => {
        const { email, password, name } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
        if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        const users = readUsers();
        const em = String(email).toLowerCase().trim();
        if (users.some(u => u.email === em)) return res.status(409).json({ error: 'An account with this email already exists.' });
        const { salt, hash } = hashPassword(password);
        const user = {
            id: crypto.randomUUID(), email: em,
            name: name || em.split('@')[0], salt, hash,
            telegram: null, createdAt: Date.now(),
        };
        users.push(user);
        writeUsers(users);
        setSessionCookie(res, newSession(user.id));
        res.json({ user: publicUser(user) });
    });

    app.post('/api/auth/login', (req, res) => {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
        const em = String(email).toLowerCase().trim();
        const user = readUsers().find(u => u.email === em);
        if (!user || !verifyPassword(password, user.salt, user.hash))
            return res.status(401).json({ error: 'Invalid email or password.' });
        setSessionCookie(res, newSession(user.id));
        res.json({ user: publicUser(user) });
    });

    app.post('/api/auth/logout', (req, res) => {
        const token = parseCookies(req)[COOKIE];
        if (token) sessions.delete(token);
        clearSessionCookie(res);
        res.json({ ok: true });
    });

    app.get('/api/auth/me', (req, res) => {
        res.json({ user: publicUser(currentUser(req)) });
    });

    // Link a Telegram account to the logged-in user.
    // Accepts a Telegram Login Widget payload; verifies the hash when a bot token is configured.
    app.post('/api/auth/telegram', (req, res) => {
        const user = currentUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated.' });
        const data = req.body || {};

        if (TG_BOT_TOKEN && data.hash) {
            const secret = crypto.createHash('sha256').update(TG_BOT_TOKEN).digest();
            const checkString = Object.keys(data)
                .filter(k => k !== 'hash')
                .sort()
                .map(k => `${k}=${data[k]}`)
                .join('\n');
            const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
            if (hmac !== data.hash) return res.status(403).json({ error: 'Invalid Telegram signature.' });
        }

        const tg = {
            id: data.id || null,
            username: data.username || null,
            firstName: data.first_name || null,
            photoUrl: data.photo_url || null,
            linkedAt: Date.now(),
        };
        const users = readUsers();
        const idx = users.findIndex(u => u.id === user.id);
        users[idx].telegram = tg;
        writeUsers(users);
        res.json({ user: publicUser(users[idx]) });
    });
}

module.exports = { register };
