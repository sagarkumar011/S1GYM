const DB = require('../db');
if (!DB._get('seeded')) DB.seed();

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { username, password } = body;
        const user = DB.login(username, password);
        if (user) {
            DB.setSession(user);
            return res.status(200).json({
                success: true,
                user: { id: user.id, username: user.username, name: user.name, role: user.role }
            });
        }
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    if (req.method === 'GET') {
        const session = DB.getSession();
        return res.status(200).json({ success: true, session });
    }
    res.status(405).json({ error: 'Method not allowed' });
};
