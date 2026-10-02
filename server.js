const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const { passport, configureGoogleOAuth } = require('./middleware/googleOAuth');
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
app.use(require('./middleware/securityHeaders'));
// Authenticated content must never be served from browser cache: after logout,
// the back button would otherwise redisplay a stale logged-in page.
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
});
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
        if (String(filePath).endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Pragma', 'no-cache');
        }
    }
}));
app.get('/favicon.ico', (req, res) => {
    res.type('image/svg+xml').sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// Trust reverse proxy (for Vercel) to allow secure cookies
app.set('trust proxy', 1);

// Signed cookie sessions work across Vercel serverless invocations. The
// cookie contains only the user id and display name; it is signed, httpOnly,
// and never used as a source of authorization without a database membership check.
const { sessionOptions } = require('./config/session');
app.use(cookieSession(sessionOptions()));

configureGoogleOAuth();
app.use(passport.initialize());

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
const taskRoutes = require('./routes/taskRoutes');
const activityRoutes = require('./routes/activityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const paymentController = require('./controllers/paymentController');
const dashboardController = require('./controllers/dashboardController');
const prisma = require('./config/prisma');

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
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
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
