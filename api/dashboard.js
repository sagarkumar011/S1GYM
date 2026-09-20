const DB = require('../db');
if (!DB._get('seeded')) DB.seed();

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stats = DB.dashboardStats();
    const expiringToday = DB.expiringMembers(0);
    const expiring3Days = DB.expiringMembers(3);
    const expiring7Days = DB.expiringMembers(7);
    const expired = DB.expiringMembers(-1);
    const revenue = DB.paymentStats();
    const attendance = DB.attendanceStats();

    res.status(200).json({
        success: true,
        stats,
        expiringToday,
        expiring3Days,
        expiring7Days,
        expired,
        revenue,
        todayAttendance: attendance.todayAttendance || []
    });
};
