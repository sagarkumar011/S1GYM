const DB = require('../db');
if (!DB._get('seeded')) DB.seed();

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        const payments = DB.getAll('payments');
        const revenue = DB.paymentStats();
        return res.status(200).json({ success: true, revenue, count: payments.length, data: payments });
    }

    if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { memberId, amount, paymentMode = 'UPI', plan, type = 'new', notes = '' } = body;
        if (!memberId || !amount) {
            return res.status(400).json({ error: 'Missing memberId or amount' });
        }

        const member = DB.getAll('members').find(m => m.memberId === memberId || m.id === memberId);
        const record = {
            id: DB._genId(),
            memberId: member ? member.memberId : memberId,
            memberName: member ? member.name : 'Unknown',
            amount: Number(amount),
            date: DB.today(),
            paymentMode,
            plan: plan || (member ? member.plan : 'General'),
            type,
            staff: 'Admin',
            notes
        };

        DB.add('payments', record);
        return res.status(201).json({ success: true, data: record });
    }

    res.status(405).json({ error: 'Method not allowed' });
};
