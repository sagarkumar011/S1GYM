const DB = require('../db');
if (!DB._get('seeded')) DB.seed();

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        const query = req.query || {};
        if (query.memberId) {
            const logs = DB.getByField('attendance', 'memberId', query.memberId);
            return res.status(200).json({ success: true, count: logs.length, data: logs });
        }
        const today = DB.today();
        const todayAtt = DB.query('attendance', a => a.date === today);
        return res.status(200).json({ success: true, count: todayAtt.length, data: todayAtt });
    }

    if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { memberId, mode = 'Manual' } = body;
        if (!memberId) {
            return res.status(400).json({ error: 'Missing memberId' });
        }

        const member = DB.getAll('members').find(m => m.memberId === memberId || m.id === memberId);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const todayStr = DB.today();
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const attendanceRecord = {
            id: DB._genId(),
            memberId: member.memberId,
            memberName: member.name,
            date: todayStr,
            checkInTime: timeStr,
            mode: mode
        };

        DB.add('attendance', attendanceRecord);
        return res.status(201).json({ success: true, data: attendanceRecord, member });
    }

    res.status(405).json({ error: 'Method not allowed' });
};
