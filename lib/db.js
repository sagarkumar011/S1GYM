// lib/db.js — Server-side Data Abstraction Layer for S1 GYMA
// Pure Node.js - 100% server compatible, zero browser globals.

const DB = {
    _memoryStore: {},

    _get(key) {
        return this._memoryStore[key] || null;
    },
    _set(key, val) {
        this._memoryStore[key] = val;
    },
    _genId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // ── Generic CRUD ─────────────────────────────────────────
    getAll(collection) {
        return this._get(collection) || [];
    },
    getById(collection, id) {
        return this.getAll(collection).find(i => i.id === id);
    },
    getByField(collection, field, value) {
        return this.getAll(collection).filter(i => i[field] === value);
    },
    add(collection, item) {
        const all = this.getAll(collection);
        if (!item.id) item.id = this._genId();
        all.push(item);
        this._set(collection, all);
        return item;
    },
    update(collection, id, updates) {
        const all = this.getAll(collection);
        const idx = all.findIndex(i => i.id === id);
        if (idx === -1) return null;
        all[idx] = { ...all[idx], ...updates };
        this._set(collection, all);
        return all[idx];
    },
    remove(collection, id) {
        const all = this.getAll(collection).filter(i => i.id !== id);
        this._set(collection, all);
    },
    count(collection) {
        return this.getAll(collection).length;
    },
    query(collection, filterFn) {
        return this.getAll(collection).filter(filterFn);
    },

    // ── Member ID Generator ──────────────────────────────────
    nextMemberId() {
        let counter = parseInt(this._get('memberIdCounter') || '0', 10);
        counter++;
        this._set('memberIdCounter', counter);
        return 'S1-' + String(counter).padStart(5, '0');
    },
    currentMemberCount() {
        return parseInt(this._get('memberIdCounter') || '0', 10);
    },

    // ── Auth ─────────────────────────────────────────────────
    login(username, password) {
        const users = this.getAll('users');
        return users.find(u => u.username === username && u.password === password) || null;
    },
    setSession(user) {
        this._set('session', { userId: user.id, role: user.role, name: user.name, username: user.username });
    },
    getSession() {
        return this._get('session');
    },
    logout() {
        delete this._memoryStore['session'];
    },

    // ── Settings ─────────────────────────────────────────────
    getSettings() {
        return this._get('settings') || {
            gymName: 'S1 GYMA',
            tagline: 'STRENGTH • DISCIPLINE • RESULTS',
            currency: '₹',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY',
            phone: '+91 98765 43210',
            email: 'info@s1gyma.com',
            address: 'Sector 1, New Delhi, India'
        };
    },
    saveSettings(s) {
        this._set('settings', s);
    },

    // ── Date Helpers ─────────────────────────────────────────
    today() {
        return new Date().toISOString().split('T')[0];
    },
    daysRemaining(expiryDate) {
        if (!expiryDate) return -999;
        const today = new Date(this.today());
        const exp = new Date(expiryDate);
        return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    },

    // ── Dashboard Stats ──────────────────────────────────────
    dashboardStats() {
        const members = this.getAll('members');
        const today = this.today();
        const todayAtt = this.query('attendance', a => a.date === today);
        const payments = this.getAll('payments');

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        const totalMembers = members.length;
        const activeMembers = members.filter(m => this.daysRemaining(m.expiryDate) >= 0 && m.status !== 'inactive').length;
        const todaysAttendance = todayAtt.length;
        const newThisMonth = members.filter(m => m.joinDate >= monthStart).length;

        const expiringToday = members.filter(m => this.daysRemaining(m.expiryDate) === 0).length;
        const expiring3Days = members.filter(m => { const d = this.daysRemaining(m.expiryDate); return d > 0 && d <= 3; }).length;
        const expiring7Days = members.filter(m => { const d = this.daysRemaining(m.expiryDate); return d > 0 && d <= 7; }).length;
        const expired = members.filter(m => this.daysRemaining(m.expiryDate) < 0 && m.status !== 'inactive').length;

        const todayRevenue = payments.filter(p => p.date === today).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const monthlyRevenue = payments.filter(p => p.date >= monthStart).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const pendingRenewals = members.filter(m => { const d = this.daysRemaining(m.expiryDate); return d <= 7 && m.status !== 'inactive'; }).length;

        return {
            totalMembers, activeMembers, todaysAttendance, newThisMonth,
            expiringToday, expiring3Days, expiring7Days, expired,
            todayRevenue, monthlyRevenue, pendingRenewals
        };
    },

    // ── Attendance Stats ─────────────────────────────────────
    attendanceStats() {
        const today = this.today();
        const todayAtt = this.query('attendance', a => a.date === today);
        const allAtt = this.getAll('attendance');

        const firstCheckIn = todayAtt.length ? todayAtt.reduce((min, a) => a.checkInTime < min ? a.checkInTime : min, todayAtt[0].checkInTime) : '—';
        const lastCheckIn = todayAtt.length ? todayAtt.reduce((max, a) => a.checkInTime > max ? a.checkInTime : max, todayAtt[0].checkInTime) : '—';

        const dates = {};
        allAtt.forEach(a => { dates[a.date] = (dates[a.date] || 0) + 1; });
        const dateKeys = Object.keys(dates);
        const avgDaily = dateKeys.length ? Math.round(Object.values(dates).reduce((s, v) => s + v, 0) / dateKeys.length) : 0;

        const freq = {};
        allAtt.forEach(a => { freq[a.memberId] = (freq[a.memberId] || 0) + 1; });
        const topMembers = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([memberId, count]) => {
                const m = this.getAll('members').find(m => m.memberId === memberId);
                return { memberId, name: m ? m.name : memberId, count };
            });

        return { todayTotal: todayAtt.length, firstCheckIn, lastCheckIn, avgDaily, topMembers, todayAttendance: todayAtt };
    },

    // ── Payment Stats ────────────────────────────────────────
    paymentStats() {
        const payments = this.getAll('payments');
        const today = this.today();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];

        const todayCollection = payments.filter(p => p.date === today).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const weeklyCollection = payments.filter(p => p.date >= weekStartStr).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const monthlyCollection = payments.filter(p => p.date >= monthStart).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const totalCollection = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const renewalRevenue = payments.filter(p => p.type === 'renewal').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const newRevenue = payments.filter(p => p.type === 'new').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        return { todayCollection, weeklyCollection, monthlyCollection, totalCollection, renewalRevenue, newRevenue };
    },

    expiringMembers(withinDays) {
        return this.getAll('members').filter(m => {
            const d = this.daysRemaining(m.expiryDate);
            if (withinDays === -1) return d < 0 && m.status !== 'inactive';
            if (withinDays === 0) return d === 0;
            return d > 0 && d <= withinDays;
        });
    },

    // ── Seed Data ────────────────────────────────────────────
    seed() {
        if (this._get('seeded')) return;

        this._set('users', [
            { id: 'u1', username: 'admin', password: 'admin123', role: 'owner', name: 'Sagar Kumar' },
            { id: 'u2', username: 'manager', password: 'manager123', role: 'manager', name: 'Rohit Verma' },
            { id: 'u3', username: 'trainer', password: 'trainer123', role: 'trainer', name: 'Vikram Singh' },
            { id: 'u4', username: 'reception', password: 'reception123', role: 'reception', name: 'Neha Gupta' }
        ]);

        const sampleMembers = [
            { name: 'Rahul Sharma', mobile: '9876543210', gender: 'Male', plan: '3 Months', amountPaid: 2000, daysOffset: -5, joinDaysAgo: 85, trainer: 'Vikram Singh', notes: 'Weight loss focus' },
            { name: 'Priya Patel', mobile: '9823456789', gender: 'Female', plan: '6 Months', amountPaid: 3500, daysOffset: 0, joinDaysAgo: 180, trainer: 'Anjali Sharma', notes: 'Cardio & conditioning' },
            { name: 'Amit Kumar', mobile: '9834567890', gender: 'Male', plan: '1 Month', amountPaid: 800, daysOffset: 2, joinDaysAgo: 28, trainer: 'None', notes: '' },
            { name: 'Sneha Reddy', mobile: '9845678901', gender: 'Female', plan: '12 Months', amountPaid: 6000, daysOffset: 5, joinDaysAgo: 360, trainer: 'Vikram Singh', notes: 'Strength training' },
            { name: 'Vikram Malhotra', mobile: '9856789012', gender: 'Male', plan: '3 Months', amountPaid: 2000, daysOffset: 7, joinDaysAgo: 83, trainer: 'None', notes: '' },
            { name: 'Ananya Desai', mobile: '9867890123', gender: 'Female', plan: '1 Month', amountPaid: 800, daysOffset: 15, joinDaysAgo: 15, trainer: 'None', notes: 'Morning batch' },
            { name: 'Rohan Joshi', mobile: '9878901234', gender: 'Male', plan: '6 Months', amountPaid: 3500, daysOffset: 45, joinDaysAgo: 135, trainer: 'Vikram Singh', notes: 'Hypertrophy' },
            { name: 'Pooja Nair', mobile: '9889012345', gender: 'Female', plan: '3 Months', amountPaid: 2000, daysOffset: 60, joinDaysAgo: 30, trainer: 'Anjali Sharma', notes: 'General fitness' },
            { name: 'Suresh Menon', mobile: '9890123456', gender: 'Male', plan: '12 Months', amountPaid: 6000, daysOffset: 120, joinDaysAgo: 245, trainer: 'None', notes: '' },
            { name: 'Kavita Singh', mobile: '9901234567', gender: 'Female', plan: '1 Month', amountPaid: 800, daysOffset: -12, joinDaysAgo: 42, trainer: 'None', notes: 'Need renewal follow-up' },
            { name: 'Deepak Verma', mobile: '9912345678', gender: 'Male', plan: '3 Months', amountPaid: 2000, daysOffset: 30, joinDaysAgo: 60, trainer: 'Vikram Singh', notes: '' },
            { name: 'Ritu Agarwal', mobile: '9923456789', gender: 'Female', plan: '6 Months', amountPaid: 3500, daysOffset: 90, joinDaysAgo: 90, trainer: 'Anjali Sharma', notes: '' },
            { name: 'Karan Mehra', mobile: '9934567890', gender: 'Male', plan: '1 Month', amountPaid: 800, daysOffset: 20, joinDaysAgo: 10, trainer: 'None', notes: 'Evening batch' },
            { name: 'Divya Iyer', mobile: '9945678901', gender: 'Female', plan: '3 Months', amountPaid: 2000, daysOffset: 40, joinDaysAgo: 50, trainer: 'None', notes: '' },
            { name: 'Manish Tiwari', mobile: '9956789012', gender: 'Male', plan: '12 Months', amountPaid: 6000, daysOffset: 200, joinDaysAgo: 165, trainer: 'Vikram Singh', notes: 'Powerlifting' },
            { name: 'Shweta Saxena', mobile: '9967890123', gender: 'Female', plan: '1 Month', amountPaid: 800, daysOffset: 3, joinDaysAgo: 27, trainer: 'None', notes: '' },
            { name: 'Gaurav Bhatia', mobile: '9978901234', gender: 'Male', plan: '3 Months', amountPaid: 2000, daysOffset: 1, joinDaysAgo: 89, trainer: 'None', notes: 'Expires tomorrow' },
            { name: 'Meera Pillai', mobile: '9989012345', gender: 'Female', plan: '6 Months', amountPaid: 3500, daysOffset: 75, joinDaysAgo: 105, trainer: 'Anjali Sharma', notes: '' },
            { name: 'Harish Choudhary', mobile: '9990123456', gender: 'Male', plan: '1 Month', amountPaid: 800, daysOffset: 25, joinDaysAgo: 5, trainer: 'None', notes: 'New joiner' },
            { name: 'Simran Kaur', mobile: '9811122233', gender: 'Female', plan: '3 Months', amountPaid: 2000, daysOffset: 50, joinDaysAgo: 40, trainer: 'Anjali Sharma', notes: '' }
        ];

        const today = new Date();
        const members = [];
        const payments = [];
        const attendance = [];
        let memberCounter = 0;

        sampleMembers.forEach((md, i) => {
            memberCounter++;
            const memberId = 'S1-' + String(memberCounter).padStart(5, '0');
            const expDate = new Date(today);
            expDate.setDate(expDate.getDate() + md.daysOffset);
            const expStr = expDate.toISOString().split('T')[0];

            const joinDate = new Date(today);
            joinDate.setDate(joinDate.getDate() - md.joinDaysAgo);
            const joinStr = joinDate.toISOString().split('T')[0];

            let status = 'active';
            if (md.daysOffset < 0) status = 'expired';
            else if (md.daysOffset <= 3) status = 'expiring';

            members.push({
                id: 'm_' + (i + 1),
                memberId,
                name: md.name,
                phone: md.mobile,
                mobile: md.mobile,
                gender: md.gender,
                dob: '1995-06-15',
                plan: md.plan,
                startDate: joinStr,
                joinDate: joinStr,
                expiryDate: expStr,
                amountPaid: md.amountPaid,
                paymentMode: 'UPI',
                trainer: md.trainer,
                notes: md.notes,
                status,
                emergencyContact: '9876543211',
                bloodGroup: 'B+'
            });

            payments.push({
                id: 'pay_' + (i + 1),
                memberId,
                memberName: md.name,
                amount: md.amountPaid,
                date: joinStr,
                paymentMode: 'UPI',
                plan: md.plan,
                type: 'new',
                staff: 'Admin',
                notes: 'Admission payment'
            });
        });

        // Seed some demo attendance for today
        const todayStr = this.today();
        members.slice(0, 8).forEach((m, idx) => {
            attendance.push({
                id: 'att_' + (idx + 1),
                memberId: m.memberId,
                memberName: m.name,
                date: todayStr,
                checkInTime: `0${6 + idx}:30`,
                mode: 'QR'
            });
        });

        this._set('memberIdCounter', memberCounter);
        this._set('members', members);
        this._set('payments', payments);
        this._set('attendance', attendance);
        this._set('seeded', true);
    }
};

module.exports = DB;
