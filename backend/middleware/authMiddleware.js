const authMiddleware = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'UNAUTHORIZED'
        });
    }
    // Owners with unfinished MFA may only enroll, verify, or log out until
    // the second factor passes.
    if (req.session.mfaPending && req.path !== '/logout' && !req.path.startsWith('/mfa/')) {
        return res.status(401).json({
            success: false,
            message: 'MFA_REQUIRED'
        });
    }
    next();
};

module.exports = authMiddleware;
