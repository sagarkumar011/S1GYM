const DB = require('../db');
if (!DB._get('seeded')) DB.seed();

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        const query = req.query || {};
        let members = DB.getAll('members');
        if (query.id) {
            const member = DB.getById('members', query.id);
            return res.status(member ? 200 : 404).json(member || { error: 'Member not found' });
        }
        if (query.status) {
            members = members.filter(m => m.status === query.status);
        }
        if (query.search) {
            const q = query.search.toLowerCase();
            members = members.filter(m =>
                (m.name && m.name.toLowerCase().includes(q)) ||
                (m.memberId && m.memberId.toLowerCase().includes(q)) ||
                (m.phone && m.phone.includes(q))
            );
        }
        return res.status(200).json({ success: true, count: members.length, data: members });
    }

    if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        if (body.id) {
            const updated = DB.update('members', body.id, body);
            return res.status(200).json({ success: true, data: updated });
        } else {
            if (!body.memberId) body.memberId = DB.nextMemberId();
            const created = DB.add('members', body);
            return res.status(201).json({ success: true, data: created });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.query || {};
        if (id) {
            DB.remove('members', id);
            return res.status(200).json({ success: true, message: 'Member deleted' });
        }
        return res.status(400).json({ error: 'Missing id parameter' });
    }

    res.status(405).json({ error: 'Method not allowed' });
};
