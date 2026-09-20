// ============================================================
// S1 GYMA — Data Abstraction Layer (db.js)
// All data operations go through this module.
// Swap this file to connect Firebase/Supabase/REST API.
// ============================================================

const DB = {
    _memoryStore: {},
    // ── Helpers ──────────────────────────────────────────────
    _get(key) {
        try {
            if (typeof localStorage !== 'undefined') {
                const d = localStorage.getItem('s1gyma_' + key);
                if (d) return JSON.parse(d);
            }
            return this._memoryStore[key] || null;
        } catch { return this._memoryStore[key] || null; }
    },
    _set(key, val) {
        this._memoryStore[key] = val;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('s1gyma_' + key, JSON.stringify(val));
            }
        } catch(e) {}
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
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('s1gyma_session');
            }
        } catch(e) {}
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

    // ── Date Utilities ───────────────────────────────────────
    today() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD internal
    },
    now() {
        return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    },
    formatDate(isoStr) {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    },
    parseInputDate(val) {
        // input type=date gives YYYY-MM-DD
        return val; // store as ISO
    },
    addMonths(dateStr, months) {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
    },
    daysBetween(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    },
    daysRemaining(expiryDate) {
        return this.daysBetween(this.today(), expiryDate);
    },
    memberStatus(expiryDate) {
        const days = this.daysRemaining(expiryDate);
        if (days < 0) return { status: 'Expired', color: '#6b7280', emoji: '⚫', badge: 'expired' };
        if (days === 0) return { status: 'Expires Today', color: '#ef4444', emoji: '🔴', badge: 'expires-today' };
        if (days === 1) return { status: 'Expires Tomorrow', color: '#ef4444', emoji: '🔴', badge: 'expiring' };
        if (days <= 3) return { status: `Expires in ${days} days`, color: '#f97316', emoji: '🟠', badge: 'expiring' };
        if (days <= 7) return { status: `Expires in ${days} days`, color: '#eab308', emoji: '🟡', badge: 'expiring-soon' };
        return { status: 'Active', color: '#22c55e', emoji: '🟢', badge: 'active', daysLeft: days };
    },

    // ── Dashboard Stats ──────────────────────────────────────
    dashboardStats() {
        const members = this.getAll('members');
        const today = this.today();
        const todayAtt = this.query('attendance', a => a.date === today);
        const payments = this.getAll('payments');

        // Current month
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

        // Average daily attendance (last 30 days)
        const dates = {};
        allAtt.forEach(a => { dates[a.date] = (dates[a.date] || 0) + 1; });
        const dateKeys = Object.keys(dates);
        const avgDaily = dateKeys.length ? Math.round(Object.values(dates).reduce((s, v) => s + v, 0) / dateKeys.length) : 0;

        // Most frequent members
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

    // ── Search ───────────────────────────────────────────────
    searchMembers(query) {
        if (!query || query.trim().length < 1) return [];
        const q = query.toLowerCase().trim();
        return this.getAll('members').filter(m =>
            (m.name && m.name.toLowerCase().includes(q)) ||
            (m.memberId && m.memberId.toLowerCase().includes(q)) ||
            (m.mobile && m.mobile.includes(q)) ||
            (m.status && m.status.toLowerCase().includes(q))
        );
    },

    // ── Expiry Lists ─────────────────────────────────────────
    expiringMembers(withinDays) {
        return this.getAll('members').filter(m => {
            if (m.status === 'inactive') return false;
            const d = this.daysRemaining(m.expiryDate);
            if (withinDays === 'expired') return d < 0;
            if (withinDays === 'today') return d === 0;
            return d >= 0 && d <= withinDays;
        });
    },

    // ── Reminder Message Builder ─────────────────────────────
    buildReminderMsg(member) {
        const days = this.daysRemaining(member.expiryDate);
        let msg;
        if (days < 0) {
            msg = `S1 GYMA: Hi ${member.name.split(' ')[0]}, your gym membership has expired. Renew your membership to continue your training. Contact S1 GYMA for renewal.`;
        } else if (days === 0) {
            msg = `S1 GYMA: Hi ${member.name.split(' ')[0]}, your gym membership expires today. Renew your membership to continue your training. Contact S1 GYMA for renewal.`;
        } else {
            msg = `S1 GYMA: Hi ${member.name.split(' ')[0]}, your gym membership expires in ${days} day${days > 1 ? 's' : ''}. Renew your membership to continue your training. Contact S1 GYMA for renewal.`;
        }
        return msg;
    },
    whatsappLink(mobile, message) {
        const phone = mobile.replace(/\D/g, '');
        const fullPhone = phone.startsWith('91') ? phone : '91' + phone;
        return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    },

    // ── Seed Data ────────────────────────────────────────────
    isSeeded() {
        return !!this._get('seeded');
    },
    seed() {
        if (this.isSeeded()) return;

        // Settings
        this.saveSettings({
            gymName: 'S1 GYMA',
            tagline: 'STRENGTH • DISCIPLINE • RESULTS',
            currency: '₹',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY',
            phone: '+91 98765 43210',
            email: 'info@s1gyma.com',
            address: 'Sector 1, New Delhi, India'
        });

        // Users / Staff
        const users = [
            { id: 'u1', username: 'admin', password: 'admin123', role: 'owner', name: 'Sagar Kumar' },
            { id: 'u2', username: 'manager', password: 'manager123', role: 'manager', name: 'Rohit Verma' },
            { id: 'u3', username: 'trainer', password: 'trainer123', role: 'trainer', name: 'Vikram Singh' },
            { id: 'u4', username: 'reception', password: 'reception123', role: 'reception', name: 'Neha Gupta' }
        ];
        this._set('users', users);

        // Trainers
        const trainers = [
            { id: 't1', name: 'Vikram Singh', mobile: '9876500001', specialization: 'Strength Training', active: true },
            { id: 't2', name: 'Priya Sharma', mobile: '9876500002', specialization: 'Yoga & Flexibility', active: true },
            { id: 't3', name: 'Arjun Patel', mobile: '9876500003', specialization: 'CrossFit & HIIT', active: true }
        ];
        this._set('trainers', trainers);

        // Membership Plans
        const plans = [
            { id: 'p1', name: '1 Month', duration: 1, price: 800, description: 'Basic monthly membership with full gym access', active: true },
            { id: 'p2', name: '3 Months', duration: 3, price: 2000, description: 'Quarterly plan with gym access — save ₹400', active: true },
            { id: 'p3', name: '6 Months', duration: 6, price: 3500, description: 'Half-yearly plan — best value for regulars', active: true },
            { id: 'p4', name: '12 Months', duration: 12, price: 6000, description: 'Annual plan — maximum savings', active: true },
            { id: 'p5', name: 'Personal Training', duration: 1, price: 5000, description: 'One-on-one training sessions with certified trainer', active: true }
        ];
        this._set('plans', plans);

        // Members — 20 demo members with varied statuses
        const today = new Date();
        const memberData = [
            { name: 'Rahul Sharma', mobile: '9876543210', gender: 'Male', dob: '1995-03-15', planId: 'p2', startOffset: -60, trainer: 'Vikram Singh' },
            { name: 'Priyanka Verma', mobile: '9876543211', gender: 'Female', dob: '1998-07-22', planId: 'p3', startOffset: -120, trainer: 'Priya Sharma' },
            { name: 'Amit Kumar', mobile: '9876543212', gender: 'Male', dob: '1992-11-08', planId: 'p4', startOffset: -300, trainer: 'Arjun Patel' },
            { name: 'Sneha Gupta', mobile: '9876543213', gender: 'Female', dob: '1997-01-30', planId: 'p1', startOffset: -25, trainer: 'Priya Sharma' },
            { name: 'Vikash Singh', mobile: '9876543214', gender: 'Male', dob: '1990-06-12', planId: 'p2', startOffset: -88, trainer: 'Vikram Singh' },
            { name: 'Anjali Patel', mobile: '9876543215', gender: 'Female', dob: '1996-09-05', planId: 'p1', startOffset: -35, trainer: 'Priya Sharma' },
            { name: 'Rajesh Tiwari', mobile: '9876543216', gender: 'Male', dob: '1988-04-18', planId: 'p3', startOffset: -175, trainer: 'Arjun Patel' },
            { name: 'Neha Chauhan', mobile: '9876543217', gender: 'Female', dob: '1999-12-25', planId: 'p5', startOffset: -28, trainer: 'Vikram Singh' },
            { name: 'Suresh Yadav', mobile: '9876543218', gender: 'Male', dob: '1993-08-14', planId: 'p2', startOffset: -80, trainer: 'Arjun Patel' },
            { name: 'Kavita Joshi', mobile: '9876543219', gender: 'Female', dob: '1994-02-28', planId: 'p4', startOffset: -350, trainer: 'Priya Sharma' },
            { name: 'Manish Agarwal', mobile: '9876543220', gender: 'Male', dob: '1991-10-10', planId: 'p1', startOffset: -5, trainer: 'Vikram Singh' },
            { name: 'Pooja Mishra', mobile: '9876543221', gender: 'Female', dob: '2000-05-20', planId: 'p2', startOffset: -92, trainer: 'Priya Sharma' },
            { name: 'Deepak Pandey', mobile: '9876543222', gender: 'Male', dob: '1989-07-07', planId: 'p3', startOffset: -170, trainer: 'Arjun Patel' },
            { name: 'Ritu Saxena', mobile: '9876543223', gender: 'Female', dob: '1997-03-03', planId: 'p1', startOffset: -29, trainer: 'Vikram Singh' },
            { name: 'Arun Mehta', mobile: '9876543224', gender: 'Male', dob: '1985-11-15', planId: 'p4', startOffset: -200, trainer: 'Arjun Patel' },
            { name: 'Sunita Devi', mobile: '9876543225', gender: 'Female', dob: '1996-06-18', planId: 'p2', startOffset: -45, trainer: 'Priya Sharma' },
            { name: 'Gaurav Thakur', mobile: '9876543226', gender: 'Male', dob: '1994-09-30', planId: 'p5', startOffset: -20, trainer: 'Vikram Singh' },
            { name: 'Meena Kumari', mobile: '9876543227', gender: 'Female', dob: '1998-01-12', planId: 'p1', startOffset: -32, trainer: 'Priya Sharma' },
            { name: 'Sanjay Rawat', mobile: '9876543228', gender: 'Male', dob: '1987-04-25', planId: 'p3', startOffset: -100, trainer: 'Arjun Patel' },
            { name: 'Divya Nair', mobile: '9876543229', gender: 'Female', dob: '1999-08-08', planId: 'p2', startOffset: -10, trainer: 'Priya Sharma' }
        ];

        const members = [];
        const payments = [];
        const attendance = [];
        let memberCounter = 0;

        memberData.forEach((md, idx) => {
            memberCounter++;
            const memberId = 'S1-' + String(memberCounter).padStart(5, '0');
            const plan = plans.find(p => p.id === md.planId);

            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() + md.startOffset);
            const startStr = startDate.toISOString().split('T')[0];

            const expiryDate = new Date(startDate);
            expiryDate.setMonth(expiryDate.getMonth() + plan.duration);
            const expiryStr = expiryDate.toISOString().split('T')[0];

            const joinDate = new Date(startDate);
            joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 30));
            const joinStr = joinDate.toISOString().split('T')[0];

            const daysRem = this.daysBetween(this.today(), expiryStr);
            let status = 'active';
            if (daysRem < 0) status = 'expired';
            else if (daysRem <= 7) status = 'expiring';

            const addresses = [
                'Sector 1, New Delhi', 'Rajouri Garden, Delhi', 'Lajpat Nagar, Delhi',
                'Dwarka, New Delhi', 'Vasant Kunj, Delhi', 'Rohini, Delhi',
                'Saket, New Delhi', 'Karol Bagh, Delhi', 'Janakpuri, Delhi', 'Nehru Place, Delhi'
            ];

            const member = {
                id: 'm' + (idx + 1),
                memberId,
                name: md.name,
                mobile: md.mobile,
                dob: md.dob,
                gender: md.gender,
                address: addresses[idx % addresses.length],
                emergencyContact: '98765' + String(40000 + idx).padStart(5, '0'),
                joinDate: joinStr,
                plan: plan.name,
                planId: plan.id,
                startDate: startStr,
                expiryDate: expiryStr,
                amountPaid: plan.price,
                paymentMode: ['Cash', 'UPI', 'Card', 'Bank Transfer'][idx % 4],
                trainer: md.trainer,
                notes: '',
                status,
                photo: ''
            };
            members.push(member);

            // Payment record
            payments.push({
                id: 'pay' + (idx + 1),
                memberId: memberId,
                memberName: md.name,
                amount: plan.price,
                date: startStr,
                paymentMode: member.paymentMode,
                plan: plan.name,
                type: 'new',
                staff: 'Sagar Kumar',
                notes: 'Initial membership'
            });

            // Attendance records (random days in last 30 days)
            const attDays = Math.floor(Math.random() * 20) + 5;
            for (let d = 0; d < attDays; d++) {
                const attDate = new Date(today);
                attDate.setDate(attDate.getDate() - Math.floor(Math.random() * 30));
                const attDateStr = attDate.toISOString().split('T')[0];

                // Only add if member was active on that date
                if (attDateStr >= startStr && attDateStr <= expiryStr) {
                    const hour = 5 + Math.floor(Math.random() * 14); // 5 AM to 7 PM
                    const min = Math.floor(Math.random() * 60);
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                    attendance.push({
                        id: this._genId(),
                        memberId,
                        memberName: md.name,
                        date: attDateStr,
                        checkInTime: timeStr
                    });
                }
            }
        });

        this._set('memberIdCounter', memberCounter);
        this._set('members', members);
        this._set('payments', payments);
        this._set('attendance', attendance);

        // Add some today's attendance for demo
        const todayStr = this.today();
        const activeMembers = members.filter(m => m.status !== 'expired' && m.status !== 'inactive');
        const todaySample = activeMembers.slice(0, Math.min(8, activeMembers.length));
        const existingToday = attendance.filter(a => a.date === todayStr);
        todaySample.forEach((m, i) => {
            // Check if already has today's attendance
            if (!existingToday.some(a => a.memberId === m.memberId)) {
                const hour = 6 + i;
                const min = Math.floor(Math.random() * 60);
                attendance.push({
                    id: this._genId(),
                    memberId: m.memberId,
                    memberName: m.name,
                    date: todayStr,
                    checkInTime: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
                });
            }
        });
        this._set('attendance', attendance);

        // Add some today's payments for demo
        payments.push({
            id: 'pay_today1',
            memberId: members[0].memberId,
            memberName: members[0].name,
            amount: 2000,
            date: todayStr,
            paymentMode: 'UPI',
            plan: '3 Months',
            type: 'renewal',
            staff: 'Sagar Kumar',
            notes: 'Renewal payment'
        });
        payments.push({
            id: 'pay_today2',
            memberId: members[10].memberId,
            memberName: members[10].name,
            amount: 800,
            date: todayStr,
            paymentMode: 'Cash',
            plan: '1 Month',
            type: 'new',
            staff: 'Neha Gupta',
            notes: ''
        });
        this._set('payments', payments);

        this._set('seeded', true);
    },

    // ── Reset ────────────────────────────────────────────────
    resetAll() {
        try {
            if (typeof localStorage !== 'undefined') {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('s1gyma_'));
                keys.forEach(k => localStorage.removeItem(k));
            }
        } catch(e) {}
        this._memoryStore = {};
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DB;
}

