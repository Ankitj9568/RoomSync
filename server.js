const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
require('dotenv').config();

const app = express();

// Validate critical config in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable must be set in production.');
    process.exit(1);
}

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Trust reverse proxy (for Railway/Vercel) to allow secure cookies
app.set('trust proxy', 1);

// Signed cookie sessions work across Vercel serverless invocations. The
// cookie contains only the user id and display name; it is signed, httpOnly,
// and never used as a source of authorization without a database membership check.
app.use(cookieSession({
    name: 'roomsync.session',
    keys: [process.env.SESSION_SECRET || 'development-only-secret'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    cookie: {
        httpOnly: true,
        sameSite: 'strict', // Strict provides stronger CSRF protection for API-driven apps
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const groceryRoutes = require('./routes/groceryRoutes');
const shoppingListRoutes = require('./routes/shoppingListRoutes');
const mealRoutes = require('./routes/mealRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adjustmentRoutes = require('./routes/adjustmentRoutes');
const activityRoutes = require('./routes/activityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const paymentController = require('./controllers/paymentController');
const dashboardController = require('./controllers/dashboardController');
const db = require('./config/db');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', activityRoutes);
app.use('/api/groceries', groceryRoutes);
app.use('/api/shopping-list', shoppingListRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/health', async (req, res) => {
    try {
        await db.get('SELECT 1 AS ok');
        res.json({ success: true, status: 'ok' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ success: false, status: 'unavailable' });
    }
});
// Documented aliases retained alongside the original frontend endpoints.
app.get('/api/settlements', authMiddleware, paymentController.getSettlements);
app.get('/api/settlements/simplified', authMiddleware, paymentController.getSettlements);
app.get('/api/analytics', authMiddleware, dashboardController.getAnalytics);

// Fallback: serve index.html for the root
// (express.static already handles this via public/index.html)

// Start Server only if not running on Vercel
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
