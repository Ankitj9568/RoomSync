const db = require('./config/db');
(async () => {
    try {
        await db.run("UPDATE payments SET status = 'approved'");
        console.log('Old payments set to approved.');
    } catch (e) {
        console.error('Update error:', e);
    }
    process.exit(0);
})();
