// ============================================================
// S1 GYMA — Main Application (app.js)
// Complete SPA with all features
// ============================================================

// ── Global State ─────────────────────────────────────────────
let currentPage = 'dashboard';
let qrScanner = null;

// ── Initialization ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    DB.seed();
    const session = DB.getSession();
    if (session) {
        renderApp();
    } else {
        renderLogin();
    }
    window.addEventListener('hashchange', handleRoute);
});

// ── Router ───────────────────────────────────────────────────
function navigate(page, params = {}) {
    if (qrScanner) {
        try { qrScanner.stop(); } catch(e) {}
        qrScanner = null;
    }
    currentPage = page;
    window._params = params;
    window.location.hash = page;
}

function handleRoute() {
    const session = DB.getSession();
    if (!session) { renderLogin(); return; }
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    currentPage = hash;
    renderPageContent(hash);
    updateNavActive(hash);
}

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
}

// ── Modal ────────────────────────────────────────────────────
function openModal(content, size = '') {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modalContent');
    modal.className = `modal ${size}`;
    modal.innerHTML = content;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// ── Sidebar Toggle ───────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
}

// ── Notification Panel ───────────────────────────────────────
function toggleNotifPanel() {
    document.getElementById('notifPanel').classList.toggle('show');
}

function renderNotifications() {
    const stats = DB.dashboardStats();
    const body = document.getElementById('notifPanelBody');
    let html = '';
    if (stats.expired > 0) html += `<div class="notif-item" onclick="navigate('expiry')"><span class="notif-icon">🔴</span><span class="notif-text">${stats.expired} memberships expired</span></div>`;
    if (stats.expiringToday > 0) html += `<div class="notif-item" onclick="navigate('expiry')"><span class="notif-icon">🔴</span><span class="notif-text">${stats.expiringToday} memberships expire today</span></div>`;
    if (stats.expiring3Days > 0) html += `<div class="notif-item" onclick="navigate('expiry')"><span class="notif-icon">🟡</span><span class="notif-text">${stats.expiring3Days} memberships expire within 3 days</span></div>`;
    if (stats.expiring7Days > 0) html += `<div class="notif-item" onclick="navigate('expiry')"><span class="notif-icon">🟡</span><span class="notif-text">${stats.expiring7Days} memberships expire within 7 days</span></div>`;
    html += `<div class="notif-item"><span class="notif-icon">💰</span><span class="notif-text">₹${stats.todayRevenue.toLocaleString('en-IN')} collected today</span></div>`;
    html += `<div class="notif-item"><span class="notif-icon">👥</span><span class="notif-text">${stats.todaysAttendance} members checked in today</span></div>`;
    if (!html) html = '<div class="empty-state"><p>No notifications</p></div>';
    body.innerHTML = html;
}

// ── Permissions ──────────────────────────────────────────────
function hasPermission(action) {
    const session = DB.getSession();
    if (!session) return false;
    const role = session.role;
    const perms = {
        owner: ['all'],
        manager: ['dashboard', 'members', 'attendance', 'payments', 'reports', 'expiry', 'plans', 'reminders'],
        trainer: ['dashboard', 'attendance', 'members_view'],
        reception: ['dashboard', 'members', 'attendance', 'payments', 'expiry']
    };
    const allowed = perms[role] || [];
    return allowed.includes('all') || allowed.includes(action);
}

// ── Login Page ───────────────────────────────────────────────
function renderLogin() {
    document.getElementById('app').innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <div class="login-logo">
                    <h1>S1 GYMA</h1>
                    <div class="tagline">STRENGTH • DISCIPLINE • RESULTS</div>
                </div>
                <div class="login-card">
                    <h2>Welcome Back</h2>
                    <div class="login-error" id="loginError">Invalid username or password</div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="loginUsername" placeholder="Enter username" autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="Enter password" autocomplete="current-password">
                    </div>
                    <button class="btn btn-primary btn-block btn-lg" onclick="handleLogin()">Sign In</button>
                    <div class="login-hint">
                        Demo: <span>admin</span> / <span>admin123</span><br>
                        Roles: <span>manager</span>, <span>trainer</span>, <span>reception</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('loginUsername').focus();
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
        document.getElementById('loginError').textContent = 'Please enter username and password';
        document.getElementById('loginError').classList.add('show');
        return;
    }
    const user = DB.login(username, password);
    if (user) {
        DB.setSession(user);
        renderApp();
        showToast(`Welcome, ${user.name}!`, 'success');
    } else {
        document.getElementById('loginError').textContent = 'Invalid username or password';
        document.getElementById('loginError').classList.add('show');
    }
}

function handleLogout() {
    DB.logout();
    if (qrScanner) { try { qrScanner.stop(); } catch(e) {} qrScanner = null; }
    renderLogin();
    window.location.hash = '';
}

// ── App Shell ────────────────────────────────────────────────
function renderApp() {
    const session = DB.getSession();
    const stats = DB.dashboardStats();
    const initials = session.name.split(' ').map(w => w[0]).join('').toUpperCase();

    const navItems = getNavItems();

    document.getElementById('app').innerHTML = `
        <div class="app-container">
            <!-- Sidebar (Desktop) -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <h1>S1 GYMA</h1>
                    <div class="tagline">STRENGTH • DISCIPLINE • RESULTS</div>
                </div>
                <nav class="sidebar-nav">
                    ${navItems.map(item => `
                        <button class="nav-item ${currentPage === item.page ? 'active' : ''}" onclick="navigate('${item.page}'); toggleSidebar();">
                            <span class="nav-icon">${item.icon}</span>
                            ${item.label}
                            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
                        </button>
                    `).join('')}
                </nav>
                <div class="sidebar-footer">
                    <div class="sidebar-user">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <div class="user-name">${session.name}</div>
                            <div class="user-role">${session.role}</div>
                        </div>
                        <button class="logout-btn" onclick="handleLogout()" title="Logout">⏻</button>
                    </div>
                </div>
            </aside>

            <!-- Main -->
            <main class="main-content">
                <header class="top-bar">
                    <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                    <span class="top-bar-title" id="topBarTitle">Dashboard</span>
                    <div class="search-bar" id="globalSearchBar">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="globalSearchInput" placeholder="Search members..." oninput="handleGlobalSearch(this.value)">
                        <div class="search-results" id="globalSearchResults"></div>
                    </div>
                    <div class="top-bar-actions">
                        <button class="top-bar-btn" onclick="toggleNotifPanel()" title="Notifications">
                            🔔
                            ${(stats.expired + stats.expiring3Days) > 0 ? '<span class="notif-badge"></span>' : ''}
                        </button>
                    </div>
                </header>

                <div id="pageContent"></div>
            </main>
        </div>

        <!-- Bottom Nav (Mobile) -->
        <nav class="bottom-nav">
            <div class="bottom-nav-items">
                <button class="bottom-nav-item ${currentPage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')">
                    <span class="bnav-icon">📊</span>
                    <span class="bnav-label">Dashboard</span>
                </button>
                <button class="bottom-nav-item ${currentPage === 'members' ? 'active' : ''}" onclick="navigate('members')">
                    <span class="bnav-icon">👥</span>
                    <span class="bnav-label">Members</span>
                </button>
                <button class="bottom-nav-item ${currentPage === 'attendance' ? 'active' : ''}" onclick="navigate('attendance')">
                    <span class="bnav-icon">✅</span>
                    <span class="bnav-label">Attendance</span>
                </button>
                <button class="bottom-nav-item ${currentPage === 'payments' ? 'active' : ''}" onclick="navigate('payments')">
                    <span class="bnav-icon">💰</span>
                    <span class="bnav-label">Payments</span>
                </button>
                <button class="bottom-nav-item ${currentPage === 'more' ? 'active' : ''}" onclick="navigate('more')">
                    <span class="bnav-icon">⋯</span>
                    <span class="bnav-label">More</span>
                </button>
            </div>
        </nav>
    `;

    renderNotifications();
    renderPageContent(currentPage);

    // Close search on click outside
    document.addEventListener('click', (e) => {
        const sb = document.getElementById('globalSearchBar');
        const sr = document.getElementById('globalSearchResults');
        if (sb && sr && !sb.contains(e.target)) sr.classList.remove('show');
    });
}

function getNavItems() {
    const session = DB.getSession();
    const stats = DB.dashboardStats();
    const items = [
        { icon: '📊', label: 'Dashboard', page: 'dashboard' },
        { icon: '👥', label: 'Members', page: 'members' },
        { icon: '✅', label: 'Attendance', page: 'attendance' },
        { icon: '💰', label: 'Payments', page: 'payments' },
        { icon: '📋', label: 'Plans', page: 'plans' },
        { icon: '⏰', label: 'Expiry', page: 'expiry', badge: stats.expired + stats.expiring3Days > 0 ? stats.expired + stats.expiring3Days : null },
        { icon: '💬', label: 'Reminders', page: 'reminders' },
        { icon: '📈', label: 'Reports', page: 'reports' },
        { icon: '⚙️', label: 'Settings', page: 'settings' }
    ];

    if (session.role === 'trainer') {
        return items.filter(i => ['dashboard', 'attendance', 'members'].includes(i.page));
    }
    if (session.role === 'reception') {
        return items.filter(i => ['dashboard', 'members', 'attendance', 'payments', 'expiry'].includes(i.page));
    }
    return items;
}

function updateNavActive(page) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.onclick && el.onclick.toString().includes(`'${page}'`)) el.classList.add('active');
    });
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
    // Map pages to bottom nav
    const bnMap = { dashboard: 0, members: 1, attendance: 2, payments: 3 };
    const bnItems = document.querySelectorAll('.bottom-nav-item');
    if (bnMap[page] !== undefined && bnItems[bnMap[page]]) {
        bnItems[bnMap[page]].classList.add('active');
    } else if (!['dashboard','members','attendance','payments'].includes(page)) {
        if (bnItems[4]) bnItems[4].classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard', members: 'Members', attendance: 'Attendance', payments: 'Payments',
        plans: 'Membership Plans', expiry: 'Expiry Management', reminders: 'Reminders',
        reports: 'Reports', settings: 'Settings', more: 'More', 'member-profile': 'Member Profile',
        'add-member': 'Add Member', 'edit-member': 'Edit Member', 'qr-scan': 'QR Scan',
        'att-dashboard': 'Attendance Dashboard'
    };
    const titleEl = document.getElementById('topBarTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'S1 GYMA';
}

// ── Page Router ──────────────────────────────────────────────
function renderPageContent(page) {
    const container = document.getElementById('pageContent');
    if (!container) return;

    switch (page) {
        case 'dashboard': renderDashboard(container); break;
        case 'members': renderMembers(container); break;
        case 'attendance': renderAttendance(container); break;
        case 'payments': renderPayments(container); break;
        case 'plans': renderPlans(container); break;
        case 'expiry': renderExpiry(container); break;
        case 'reminders': renderReminders(container); break;
        case 'reports': renderReports(container); break;
        case 'settings': renderSettings(container); break;
        case 'more': renderMore(container); break;
        case 'member-profile': renderMemberProfile(container); break;
        case 'add-member': renderAddMember(container); break;
        case 'edit-member': renderEditMember(container); break;
        case 'qr-scan': renderQRScan(container); break;
        case 'att-dashboard': renderAttDashboard(container); break;
        default: renderDashboard(container);
    }
    updateNavActive(page);
}

// ── Global Search ────────────────────────────────────────────
function handleGlobalSearch(query) {
    const resultsDiv = document.getElementById('globalSearchResults');
    if (!resultsDiv) return;
    if (!query || query.length < 1) { resultsDiv.classList.remove('show'); return; }

    const results = DB.searchMembers(query);
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No members found</div>';
        resultsDiv.classList.add('show');
        return;
    }

    resultsDiv.innerHTML = results.slice(0, 8).map(m => {
        const st = DB.memberStatus(m.expiryDate);
        const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase();
        return `
            <div class="search-result-item" onclick="navigate('member-profile', {id:'${m.id}'}); document.getElementById('globalSearchResults').classList.remove('show'); document.getElementById('globalSearchInput').value='';">
                <div class="result-avatar">${initials}</div>
                <div class="result-info">
                    <div class="result-name">${m.name}</div>
                    <div class="result-meta">${m.memberId} • ${m.mobile}</div>
                </div>
                <span class="status-badge ${st.badge}">${st.emoji} ${st.status}</span>
            </div>
        `;
    }).join('');
    resultsDiv.classList.add('show');
}

// ══════════════════════════════════════════════════════════════
// ██ DASHBOARD
// ══════════════════════════════════════════════════════════════
function renderDashboard(container) {
    const stats = DB.dashboardStats();
    const attStats = DB.attendanceStats();
    const payStats = DB.paymentStats();

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>Dashboard</h2>
                    <div class="subtitle">Welcome back! Here's your gym overview.</div>
                </div>
                <span style="color:var(--text-muted);font-size:0.82rem;">${DB.formatDate(DB.today())} • ${DB.now()}</span>
            </div>

            <!-- Stats -->
            <div class="stats-grid">
                <div class="stat-card gold">
                    <div class="stat-icon">👥</div>
                    <div class="stat-value">${stats.totalMembers}</div>
                    <div class="stat-label">Total Members</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${stats.activeMembers}</div>
                    <div class="stat-label">Active Members</div>
                </div>
                <div class="stat-card blue">
                    <div class="stat-icon">📍</div>
                    <div class="stat-value">${stats.todaysAttendance}</div>
                    <div class="stat-label">Today's Attendance</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🆕</div>
                    <div class="stat-value">${stats.newThisMonth}</div>
                    <div class="stat-label">New This Month</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-value">${stats.expiringToday}</div>
                    <div class="stat-label">Expiring Today</div>
                </div>
                <div class="stat-card orange">
                    <div class="stat-icon">⏰</div>
                    <div class="stat-value">${stats.expiring3Days}</div>
                    <div class="stat-label">Expiring in 3 Days</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value">${stats.expiring7Days}</div>
                    <div class="stat-label">Expiring in 7 Days</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-icon">❌</div>
                    <div class="stat-value">${stats.expired}</div>
                    <div class="stat-label">Expired</div>
                </div>
                <div class="stat-card gold">
                    <div class="stat-icon">💰</div>
                    <div class="stat-value">₹${stats.todayRevenue.toLocaleString('en-IN')}</div>
                    <div class="stat-label">Today's Revenue</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">₹${stats.monthlyRevenue.toLocaleString('en-IN')}</div>
                    <div class="stat-label">Monthly Revenue</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-value">${stats.pendingRenewals}</div>
                    <div class="stat-label">Pending Renewals</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="section-title">⚡ Quick Actions</div>
            <div class="quick-actions">
                <button class="quick-action-btn" onclick="navigate('add-member')">
                    <span class="qa-icon">➕</span> Add Member
                </button>
                <button class="quick-action-btn" onclick="navigate('attendance')">
                    <span class="qa-icon">✅</span> Mark Attendance
                </button>
                <button class="quick-action-btn" onclick="openRenewModal()">
                    <span class="qa-icon">🔄</span> Renew Membership
                </button>
                <button class="quick-action-btn" onclick="openPaymentModal()">
                    <span class="qa-icon">💰</span> Record Payment
                </button>
                <button class="quick-action-btn" onclick="navigate('expiry')">
                    <span class="qa-icon">⏰</span> View Expiring
                </button>
                <button class="quick-action-btn" onclick="navigate('qr-scan')">
                    <span class="qa-icon">📷</span> QR Scan
                </button>
            </div>

            <!-- Today's Attendance -->
            <div class="card mt-24">
                <div class="card-header">
                    <h3>📍 Today's Attendance (${attStats.todayTotal})</h3>
                    <button class="btn btn-ghost btn-sm" onclick="navigate('att-dashboard')">View All →</button>
                </div>
                ${attStats.todayAttendance.length > 0 ? `
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>ID</th>
                                    <th>Check-in</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${attStats.todayAttendance.slice(0, 10).map(a => `
                                    <tr>
                                        <td>
                                            <div class="member-cell">
                                                <div class="member-avatar">${a.memberName.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                                                ${a.memberName}
                                            </div>
                                        </td>
                                        <td style="color:var(--gold)">${a.memberId}</td>
                                        <td>${a.checkInTime}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<div class="empty-state"><div class="empty-icon">📍</div><h3>No check-ins yet today</h3></div>'}
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════════════════
// ██ MEMBERS
// ══════════════════════════════════════════════════════════════
function renderMembers(container) {
    const members = DB.getAll('members');
    let filtered = [...members];
    const currentFilter = window._memberFilter || 'all';

    if (currentFilter !== 'all') {
        if (currentFilter === 'active') filtered = filtered.filter(m => DB.daysRemaining(m.expiryDate) > 7 && m.status !== 'inactive');
        else if (currentFilter === 'expiring') filtered = filtered.filter(m => { const d = DB.daysRemaining(m.expiryDate); return d >= 0 && d <= 7; });
        else if (currentFilter === 'expired') filtered = filtered.filter(m => DB.daysRemaining(m.expiryDate) < 0);
        else if (currentFilter === 'inactive') filtered = filtered.filter(m => m.status === 'inactive');
    }

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>Members</h2>
                    <div class="subtitle">${members.length} total members</div>
                </div>
                <button class="btn btn-primary" onclick="navigate('add-member')">➕ Add Member</button>
            </div>

            <div class="table-container">
                <div class="table-toolbar">
                    <div class="table-search">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="memberSearchInput" placeholder="Search by name, ID, mobile..." oninput="filterMemberTable(this.value)">
                    </div>
                    <div class="table-filters">
                        <button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" onclick="window._memberFilter='all'; renderMembers(document.getElementById('pageContent'))">All</button>
                        <button class="filter-chip ${currentFilter === 'active' ? 'active' : ''}" onclick="window._memberFilter='active'; renderMembers(document.getElementById('pageContent'))">🟢 Active</button>
                        <button class="filter-chip ${currentFilter === 'expiring' ? 'active' : ''}" onclick="window._memberFilter='expiring'; renderMembers(document.getElementById('pageContent'))">🟡 Expiring</button>
                        <button class="filter-chip ${currentFilter === 'expired' ? 'active' : ''}" onclick="window._memberFilter='expired'; renderMembers(document.getElementById('pageContent'))">🔴 Expired</button>
                        <button class="filter-chip ${currentFilter === 'inactive' ? 'active' : ''}" onclick="window._memberFilter='inactive'; renderMembers(document.getElementById('pageContent'))">⚫ Inactive</button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>ID</th>
                                <th>Mobile</th>
                                <th>Plan</th>
                                <th>Expiry</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="memberTableBody">
                            ${filtered.map(m => {
                                const st = DB.memberStatus(m.expiryDate);
                                if (m.status === 'inactive') { st.status = 'Inactive'; st.badge = 'inactive'; st.emoji = '⚫'; }
                                const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase();
                                return `
                                    <tr onclick="navigate('member-profile', {id:'${m.id}'})" style="cursor:pointer">
                                        <td>
                                            <div class="member-cell">
                                                <div class="member-avatar">${initials}</div>
                                                <div>
                                                    <div style="font-weight:600">${m.name}</div>
                                                    <div style="font-size:0.72rem;color:var(--text-muted)">${m.trainer || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="color:var(--gold);font-weight:600">${m.memberId}</td>
                                        <td>${m.mobile}</td>
                                        <td>${m.plan}</td>
                                        <td>${DB.formatDate(m.expiryDate)}</td>
                                        <td><span class="status-badge ${st.badge}">${st.emoji} ${st.status}</span></td>
                                        <td onclick="event.stopPropagation()">
                                            <button class="btn btn-ghost btn-sm" onclick="navigate('edit-member', {id:'${m.id}'})" title="Edit">✏️</button>
                                            <button class="btn btn-ghost btn-sm" onclick="openWhatsApp('${m.mobile}', '${m.name}', '${m.expiryDate}')" title="WhatsApp">💬</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${filtered.length === 0 ? '<div class="empty-state"><div class="empty-icon">👥</div><h3>No members found</h3></div>' : ''}
            </div>
        </div>
        <button class="fab" onclick="navigate('add-member')">➕</button>
    `;
}

function filterMemberTable(query) {
    const rows = document.querySelectorAll('#memberTableBody tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
}

// ── Add Member ───────────────────────────────────────────────
function renderAddMember(container) {
    const plans = DB.getAll('plans').filter(p => p.active);
    const trainers = DB.getAll('trainers').filter(t => t.active);
    const today = DB.today();

    container.innerHTML = `
        <div class="page">
            <button class="back-btn" onclick="navigate('members')">← Back to Members</button>
            <div class="page-header">
                <h2>➕ Add New Member</h2>
            </div>

            <div class="card">
                <form id="addMemberForm" onsubmit="handleAddMember(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Full Name <span class="required">*</span></label>
                            <input type="text" class="form-control" id="amName" required placeholder="Enter full name">
                        </div>
                        <div class="form-group">
                            <label>Mobile Number <span class="required">*</span></label>
                            <input type="tel" class="form-control" id="amMobile" required placeholder="10-digit mobile" maxlength="10" pattern="[0-9]{10}">
                        </div>
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" class="form-control" id="amDob">
                        </div>
                        <div class="form-group">
                            <label>Gender <span class="required">*</span></label>
                            <select class="form-control" id="amGender" required>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group full-width">
                            <label>Address</label>
                            <input type="text" class="form-control" id="amAddress" placeholder="Enter address">
                        </div>
                        <div class="form-group">
                            <label>Emergency Contact</label>
                            <input type="tel" class="form-control" id="amEmergency" placeholder="Emergency number" maxlength="10">
                        </div>
                        <div class="form-group">
                            <label>Membership Plan <span class="required">*</span></label>
                            <select class="form-control" id="amPlan" required onchange="updatePlanDetails()">
                                <option value="">Select Plan</option>
                                ${plans.map(p => `<option value="${p.id}" data-duration="${p.duration}" data-price="${p.price}">${p.name} — ₹${p.price.toLocaleString('en-IN')}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Start Date <span class="required">*</span></label>
                            <input type="date" class="form-control" id="amStartDate" required value="${today}" onchange="updatePlanDetails()">
                        </div>
                        <div class="form-group">
                            <label>Expiry Date</label>
                            <input type="date" class="form-control" id="amExpiryDate" readonly>
                        </div>
                        <div class="form-group">
                            <label>Amount Paid (₹) <span class="required">*</span></label>
                            <input type="number" class="form-control" id="amAmount" required placeholder="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Payment Mode <span class="required">*</span></label>
                            <select class="form-control" id="amPaymentMode" required>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Trainer Assigned</label>
                            <select class="form-control" id="amTrainer">
                                <option value="">No Trainer</option>
                                ${trainers.map(t => `<option value="${t.name}">${t.name} — ${t.specialization}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group full-width">
                            <label>Notes</label>
                            <textarea class="form-control" id="amNotes" placeholder="Any additional notes..."></textarea>
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;margin-top:20px;">
                        <button type="submit" class="btn btn-primary btn-lg">💾 Add Member</button>
                        <button type="button" class="btn btn-secondary btn-lg" onclick="navigate('members')">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function updatePlanDetails() {
    const planSelect = document.getElementById('amPlan') || document.getElementById('emPlan');
    const startInput = document.getElementById('amStartDate') || document.getElementById('emStartDate');
    const expiryInput = document.getElementById('amExpiryDate') || document.getElementById('emExpiryDate');
    const amountInput = document.getElementById('amAmount') || document.getElementById('emAmount');

    if (!planSelect || !startInput || !expiryInput) return;

    const opt = planSelect.options[planSelect.selectedIndex];
    if (opt && opt.value) {
        const duration = parseInt(opt.dataset.duration);
        const price = parseInt(opt.dataset.price);
        const startDate = startInput.value;
        if (startDate && duration) {
            expiryInput.value = DB.addMonths(startDate, duration);
        }
        if (amountInput && price) {
            amountInput.value = price;
        }
    }
}

function handleAddMember(e) {
    e.preventDefault();
    const session = DB.getSession();
    const planSelect = document.getElementById('amPlan');
    const planOpt = planSelect.options[planSelect.selectedIndex];

    const memberId = DB.nextMemberId();
    const member = {
        memberId,
        name: document.getElementById('amName').value.trim(),
        mobile: document.getElementById('amMobile').value.trim(),
        dob: document.getElementById('amDob').value,
        gender: document.getElementById('amGender').value,
        address: document.getElementById('amAddress').value.trim(),
        emergencyContact: document.getElementById('amEmergency').value.trim(),
        joinDate: DB.today(),
        plan: planOpt.textContent.split('—')[0].trim(),
        planId: planSelect.value,
        startDate: document.getElementById('amStartDate').value,
        expiryDate: document.getElementById('amExpiryDate').value,
        amountPaid: parseFloat(document.getElementById('amAmount').value) || 0,
        paymentMode: document.getElementById('amPaymentMode').value,
        trainer: document.getElementById('amTrainer').value,
        notes: document.getElementById('amNotes').value.trim(),
        status: 'active',
        photo: ''
    };

    DB.add('members', member);

    // Record payment
    DB.add('payments', {
        memberId: memberId,
        memberName: member.name,
        amount: member.amountPaid,
        date: DB.today(),
        paymentMode: member.paymentMode,
        plan: member.plan,
        type: 'new',
        staff: session.name,
        notes: 'New membership'
    });

    showToast(`${member.name} added as ${memberId}`, 'success');
    navigate('member-profile', { id: member.id });
}

// ── Edit Member ──────────────────────────────────────────────
function renderEditMember(container) {
    const params = window._params || {};
    const member = DB.getById('members', params.id);
    if (!member) { navigate('members'); return; }

    const plans = DB.getAll('plans').filter(p => p.active);
    const trainers = DB.getAll('trainers').filter(t => t.active);

    container.innerHTML = `
        <div class="page">
            <button class="back-btn" onclick="navigate('member-profile', {id:'${member.id}'})">← Back to Profile</button>
            <div class="page-header">
                <h2>✏️ Edit Member — ${member.name}</h2>
            </div>
            <div class="card">
                <form onsubmit="handleEditMember(event, '${member.id}')">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Full Name <span class="required">*</span></label>
                            <input type="text" class="form-control" id="emName" required value="${member.name}">
                        </div>
                        <div class="form-group">
                            <label>Mobile Number <span class="required">*</span></label>
                            <input type="tel" class="form-control" id="emMobile" required value="${member.mobile}" maxlength="10">
                        </div>
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" class="form-control" id="emDob" value="${member.dob || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gender</label>
                            <select class="form-control" id="emGender">
                                <option value="Male" ${member.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${member.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${member.gender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        <div class="form-group full-width">
                            <label>Address</label>
                            <input type="text" class="form-control" id="emAddress" value="${member.address || ''}">
                        </div>
                        <div class="form-group">
                            <label>Emergency Contact</label>
                            <input type="tel" class="form-control" id="emEmergency" value="${member.emergencyContact || ''}">
                        </div>
                        <div class="form-group">
                            <label>Trainer</label>
                            <select class="form-control" id="emTrainer">
                                <option value="">No Trainer</option>
                                ${trainers.map(t => `<option value="${t.name}" ${member.trainer === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select class="form-control" id="emStatus">
                                <option value="active" ${member.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="expiring" ${member.status === 'expiring' ? 'selected' : ''}>Expiring</option>
                                <option value="expired" ${member.status === 'expired' ? 'selected' : ''}>Expired</option>
                                <option value="inactive" ${member.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="form-group full-width">
                            <label>Notes</label>
                            <textarea class="form-control" id="emNotes">${member.notes || ''}</textarea>
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;margin-top:20px;">
                        <button type="submit" class="btn btn-primary">💾 Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="navigate('member-profile', {id:'${member.id}'})">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="confirmDeleteMember('${member.id}', '${member.name}')" style="margin-left:auto">🗑️ Delete</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function handleEditMember(e, id) {
    e.preventDefault();
    DB.update('members', id, {
        name: document.getElementById('emName').value.trim(),
        mobile: document.getElementById('emMobile').value.trim(),
        dob: document.getElementById('emDob').value,
        gender: document.getElementById('emGender').value,
        address: document.getElementById('emAddress').value.trim(),
        emergencyContact: document.getElementById('emEmergency').value.trim(),
        trainer: document.getElementById('emTrainer').value,
        status: document.getElementById('emStatus').value,
        notes: document.getElementById('emNotes').value.trim()
    });
    showToast('Member updated successfully', 'success');
    navigate('member-profile', { id });
}

function confirmDeleteMember(id, name) {
    openModal(`
        <div class="modal-header">
            <h3>Delete Member</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <div class="confirm-dialog">
                <div class="confirm-icon">⚠️</div>
                <h3>Are you sure?</h3>
                <p>This will permanently deactivate <strong>${name}</strong>. This action cannot be undone.</p>
                <div class="confirm-actions">
                    <button class="btn btn-danger" onclick="deleteMember('${id}')">Yes, Delete</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        </div>
    `, 'small');
}

function deleteMember(id) {
    DB.update('members', id, { status: 'inactive' });
    closeModal();
    showToast('Member deactivated', 'warning');
    navigate('members');
}

// ══════════════════════════════════════════════════════════════
// ██ MEMBER PROFILE
// ══════════════════════════════════════════════════════════════
function renderMemberProfile(container) {
    const params = window._params || {};
    const member = DB.getById('members', params.id);
    if (!member) { navigate('members'); return; }

    const st = DB.memberStatus(member.expiryDate);
    if (member.status === 'inactive') { st.status = 'Inactive'; st.badge = 'inactive'; st.emoji = '⚫'; }
    const initials = member.name.split(' ').map(w => w[0]).join('').toUpperCase();
    const days = DB.daysRemaining(member.expiryDate);
    const daysText = days >= 0 ? `${days} days remaining` : `Expired ${Math.abs(days)} days ago`;

    // Attendance history
    const attHistory = DB.getByField('attendance', 'memberId', member.memberId).sort((a,b) => b.date.localeCompare(a.date));
    const totalAtt = attHistory.length;

    // Payment history
    const payHistory = DB.getByField('payments', 'memberId', member.memberId).sort((a,b) => b.date.localeCompare(a.date));

    container.innerHTML = `
        <div class="page">
            <button class="back-btn" onclick="navigate('members')">← Back to Members</button>

            <div class="profile-header">
                <div class="profile-avatar">
                    <div class="member-avatar xlarge">${initials}</div>
                </div>
                <div class="profile-name">${member.name}</div>
                <div class="profile-id">${member.memberId}</div>
                <div class="profile-mobile">📱 ${member.mobile}</div>
                <div style="margin-top:12px;">
                    <span class="status-badge ${st.badge}" style="font-size:0.82rem;padding:6px 16px;">${st.emoji} ${st.status}</span>
                </div>
                <div style="margin-top:6px;color:var(--text-muted);font-size:0.82rem;">${daysText}</div>

                <div class="profile-actions">
                    <button class="btn btn-primary btn-sm" onclick="navigate('edit-member', {id:'${member.id}'})">✏️ Edit</button>
                    <button class="btn btn-success btn-sm" onclick="openRenewModalFor('${member.id}')">🔄 Renew</button>
                    <button class="btn btn-whatsapp btn-sm" onclick="openWhatsApp('${member.mobile}', '${member.name}', '${member.expiryDate}')">💬 WhatsApp</button>
                    <button class="btn btn-secondary btn-sm" onclick="showMemberQR('${member.memberId}', '${member.name}')">📱 QR Code</button>
                </div>
            </div>

            <!-- Membership Info -->
            <div class="profile-section">
                <div class="profile-section-header">📋 Membership Details</div>
                <div class="profile-section-body">
                    <div class="profile-info-grid">
                        <div class="profile-info-item">
                            <span class="info-label">Plan</span>
                            <span class="info-value">${member.plan}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Start Date</span>
                            <span class="info-value">${DB.formatDate(member.startDate)}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Expiry Date</span>
                            <span class="info-value">${DB.formatDate(member.expiryDate)}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Joining Date</span>
                            <span class="info-value">${DB.formatDate(member.joinDate)}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Trainer</span>
                            <span class="info-value">${member.trainer || '—'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Amount Paid</span>
                            <span class="info-value" style="color:var(--gold)">₹${(member.amountPaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Personal Info -->
            <div class="profile-section">
                <div class="profile-section-header">👤 Personal Information</div>
                <div class="profile-section-body">
                    <div class="profile-info-grid">
                        <div class="profile-info-item">
                            <span class="info-label">Gender</span>
                            <span class="info-value">${member.gender || '—'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Date of Birth</span>
                            <span class="info-value">${DB.formatDate(member.dob)}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Address</span>
                            <span class="info-value">${member.address || '—'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="info-label">Emergency Contact</span>
                            <span class="info-value">${member.emergencyContact || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Attendance History -->
            <div class="profile-section">
                <div class="profile-section-header">📍 Attendance History (${totalAtt} check-ins)</div>
                <div class="profile-section-body">
                    ${attHistory.length > 0 ? `
                        <div class="table-responsive">
                            <table>
                                <thead><tr><th>Date</th><th>Check-in Time</th></tr></thead>
                                <tbody>
                                    ${attHistory.slice(0, 20).map(a => `
                                        <tr><td>${DB.formatDate(a.date)}</td><td>${a.checkInTime}</td></tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${attHistory.length > 20 ? `<p style="text-align:center;color:var(--text-muted);font-size:0.82rem;margin-top:12px;">Showing 20 of ${attHistory.length} records</p>` : ''}
                    ` : '<div class="empty-state" style="padding:20px"><p>No attendance records yet</p></div>'}
                </div>
            </div>

            <!-- Payment History -->
            <div class="profile-section">
                <div class="profile-section-header">💰 Payment History</div>
                <div class="profile-section-body">
                    ${payHistory.length > 0 ? `
                        <div class="table-responsive">
                            <table>
                                <thead><tr><th>Date</th><th>Amount</th><th>Plan</th><th>Mode</th><th>Type</th><th>Receipt</th></tr></thead>
                                <tbody>
                                    ${payHistory.map(p => `
                                        <tr>
                                            <td>${DB.formatDate(p.date)}</td>
                                            <td style="color:var(--gold);font-weight:600">₹${parseFloat(p.amount).toLocaleString('en-IN')}</td>
                                            <td>${p.plan}</td>
                                            <td>${p.paymentMode}</td>
                                            <td><span class="status-badge ${p.type === 'new' ? 'active' : 'expiring-soon'}">${p.type === 'new' ? '🆕 New' : '🔄 Renewal'}</span></td>
                                            <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); generateReceipt('${p.id}')">🧾</button></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div class="empty-state" style="padding:20px"><p>No payment records yet</p></div>'}
                </div>
            </div>
        </div>
    `;
}

function showMemberQR(memberId, name) {
    openModal(`
        <div class="modal-header">
            <h3>QR Code — ${name}</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;">
            <div class="qr-display" id="memberQRCode"></div>
            <p style="margin-top:12px;color:var(--text-secondary);font-size:0.85rem;">${memberId}</p>
            <p style="color:var(--text-muted);font-size:0.75rem;">Scan this QR code at the gym entrance</p>
        </div>
    `, 'small');
    setTimeout(() => {
        const qrEl = document.getElementById('memberQRCode');
        if (qrEl) {
            qrEl.innerHTML = '';
            new QRCode(qrEl, {
                text: memberId,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff'
            });
        }
    }, 100);
}

// ── WhatsApp ─────────────────────────────────────────────────
function openWhatsApp(mobile, name, expiryDate) {
    const member = { name, expiryDate };
    const msg = DB.buildReminderMsg(member);
    const link = DB.whatsappLink(mobile, msg);
    window.open(link, '_blank');
}

// ══════════════════════════════════════════════════════════════
// ██ ATTENDANCE
// ══════════════════════════════════════════════════════════════
function renderAttendance(container) {
    const todayAtt = DB.query('attendance', a => a.date === DB.today());

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>Attendance</h2>
                    <div class="subtitle">${todayAtt.length} check-ins today</div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" onclick="navigate('qr-scan')">📷 QR Scan</button>
                    <button class="btn btn-secondary" onclick="navigate('att-dashboard')">📊 Dashboard</button>
                </div>
            </div>

            <!-- Manual Check-in -->
            <div class="card mb-24">
                <div class="card-header">
                    <h3>✅ Quick Check-in</h3>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:200px;position:relative;">
                        <input type="text" class="form-control" id="attSearchInput" placeholder="Search by name, ID, or mobile..." oninput="attSearch(this.value)">
                        <div id="attSearchResults" style="position:absolute;top:100%;left:0;right:0;z-index:10;display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);max-height:200px;overflow-y:auto;box-shadow:var(--shadow-modal);"></div>
                    </div>
                </div>
                <div id="attCheckinResult" style="margin-top:16px;"></div>
            </div>

            <!-- Today's List -->
            <div class="table-container">
                <div class="table-toolbar">
                    <h3 style="font-size:0.95rem;font-weight:700;">📍 Today's Attendance — ${DB.formatDate(DB.today())}</h3>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Member</th>
                                <th>ID</th>
                                <th>Check-in Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayAtt.sort((a,b) => b.checkInTime.localeCompare(a.checkInTime)).map((a, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>
                                        <div class="member-cell">
                                            <div class="member-avatar">${a.memberName.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                                            ${a.memberName}
                                        </div>
                                    </td>
                                    <td style="color:var(--gold)">${a.memberId}</td>
                                    <td>${a.checkInTime}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${todayAtt.length === 0 ? '<div class="empty-state"><div class="empty-icon">📍</div><h3>No check-ins today</h3><p>Start marking attendance</p></div>' : ''}
            </div>
        </div>
    `;
}

function attSearch(query) {
    const resultsDiv = document.getElementById('attSearchResults');
    if (!query || query.length < 1) { resultsDiv.style.display = 'none'; return; }
    const results = DB.searchMembers(query);
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No members found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    resultsDiv.innerHTML = results.slice(0, 6).map(m => {
        const st = DB.memberStatus(m.expiryDate);
        return `
            <div class="search-result-item" onclick="markAttendance('${m.memberId}')">
                <div class="result-avatar">${m.name.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                <div class="result-info">
                    <div class="result-name">${m.name}</div>
                    <div class="result-meta">${m.memberId} • ${m.mobile}</div>
                </div>
                <span class="status-badge ${st.badge}" style="font-size:0.65rem;">${st.emoji}</span>
            </div>
        `;
    }).join('');
    resultsDiv.style.display = 'block';
}

function markAttendance(memberId, isOverride = false) {
    const member = DB.getAll('members').find(m => m.memberId === memberId);
    if (!member) {
        showCheckinResult(false, 'Member not found', memberId);
        return;
    }

    const st = DB.memberStatus(member.expiryDate);
    if (st.badge === 'expired' && !isOverride) {
        showCheckinResult(false, 'MEMBERSHIP EXPIRED — PLEASE RENEW', member.name, member.memberId, true);
        return;
    }

    if (member.status === 'inactive' && !isOverride) {
        showCheckinResult(false, 'Member is inactive', member.name, member.memberId);
        return;
    }

    // Check if already checked in today
    const todayAtt = DB.query('attendance', a => a.date === DB.today() && a.memberId === memberId);
    if (todayAtt.length > 0 && !isOverride) {
        showCheckinResult(false, 'Already checked in today', member.name, member.memberId);
        return;
    }

    // Mark attendance
    DB.add('attendance', {
        memberId: member.memberId,
        memberName: member.name,
        date: DB.today(),
        checkInTime: DB.now()
    });

    showCheckinResult(true, 'ATTENDANCE MARKED ✓', member.name, member.memberId);
    setTimeout(() => renderAttendance(document.getElementById('pageContent')), 2000);
}

function showCheckinResult(success, message, name = '', id = '', showOverride = false) {
    const resultDiv = document.getElementById('attCheckinResult');
    if (!resultDiv) return;

    resultDiv.innerHTML = `
        <div class="checkin-success">
            <div class="check-icon ${success ? '' : 'error'}">${success ? '✓' : '✕'}</div>
            <h3>${message}</h3>
            ${name ? `<p>${name} ${id ? `• ${id}` : ''}</p>` : ''}
            ${showOverride ? `<button class="btn btn-secondary btn-sm mt-12" onclick="markAttendance('${id}', true)">Override — Allow Check-in</button>` : ''}
        </div>
    `;

    // Hide search
    const searchResults = document.getElementById('attSearchResults');
    if (searchResults) searchResults.style.display = 'none';
    const searchInput = document.getElementById('attSearchInput');
    if (searchInput) searchInput.value = '';
}

// ── QR Scan Page ─────────────────────────────────────────────
function renderQRScan(container) {
    container.innerHTML = `
        <div class="page">
            <button class="back-btn" onclick="navigate('attendance')">← Back to Attendance</button>
            <div class="page-header">
                <h2>📷 QR Code Scanner</h2>
            </div>

            <div class="card mb-24">
                <div style="text-align:center;margin-bottom:16px;">
                    <p style="color:var(--text-secondary);font-size:0.9rem;">Point your camera at a member's QR code</p>
                </div>
                <div class="qr-scanner-container">
                    <div id="qr-reader" style="width:100%;"></div>
                </div>
                <div id="qrScanResult"></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        try {
            qrScanner = new Html5Qrcode("qr-reader");
            qrScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    // Decoded — check if it's a valid member ID
                    qrScanner.stop().then(() => {
                        qrScanner = null;
                        handleQRResult(decodedText);
                    });
                },
                () => {} // ignore scan failures
            ).catch(err => {
                document.getElementById('qr-reader').innerHTML = `
                    <div class="empty-state" style="padding:40px">
                        <div class="empty-icon">📷</div>
                        <h3>Camera not available</h3>
                        <p>Please allow camera access or use manual check-in</p>
                    </div>
                `;
            });
        } catch(e) {
            console.log('QR Scanner init error:', e);
        }
    }, 300);
}

function handleQRResult(code) {
    const member = DB.getAll('members').find(m => m.memberId === code);
    const resultDiv = document.getElementById('qrScanResult');
    if (!resultDiv) return;

    if (!member) {
        resultDiv.innerHTML = `
            <div class="checkin-success">
                <div class="check-icon error">✕</div>
                <h3>Invalid QR Code</h3>
                <p>No member found with ID: ${code}</p>
                <button class="btn btn-primary btn-sm mt-12" onclick="renderQRScan(document.getElementById('pageContent'))">Scan Again</button>
            </div>
        `;
        return;
    }

    const st = DB.memberStatus(member.expiryDate);
    if (st.badge === 'expired') {
        resultDiv.innerHTML = `
            <div class="checkin-success">
                <div class="check-icon error">✕</div>
                <h3>MEMBERSHIP EXPIRED — PLEASE RENEW</h3>
                <p>${member.name} • ${member.memberId}</p>
                <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
                    <button class="btn btn-secondary btn-sm" onclick="markAttendance('${member.memberId}', true); setTimeout(()=>renderQRScan(document.getElementById('pageContent')), 2000)">Override</button>
                    <button class="btn btn-primary btn-sm" onclick="renderQRScan(document.getElementById('pageContent'))">Scan Again</button>
                </div>
            </div>
        `;
        return;
    }

    // Check already checked in
    const todayAtt = DB.query('attendance', a => a.date === DB.today() && a.memberId === member.memberId);
    if (todayAtt.length > 0) {
        resultDiv.innerHTML = `
            <div class="checkin-success">
                <div class="check-icon">✓</div>
                <h3>Already Checked In</h3>
                <p>${member.name} • ${member.memberId}</p>
                <button class="btn btn-primary btn-sm mt-12" onclick="renderQRScan(document.getElementById('pageContent'))">Scan Again</button>
            </div>
        `;
        return;
    }

    // Mark
    DB.add('attendance', {
        memberId: member.memberId,
        memberName: member.name,
        date: DB.today(),
        checkInTime: DB.now()
    });

    resultDiv.innerHTML = `
        <div class="checkin-success">
            <div class="check-icon">✓</div>
            <h3>ATTENDANCE MARKED ✓</h3>
            <p>${member.name} • ${member.memberId}</p>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">${DB.now()}</p>
            <button class="btn btn-primary btn-sm mt-12" onclick="renderQRScan(document.getElementById('pageContent'))">Scan Next</button>
        </div>
    `;
}

// ── Attendance Dashboard ─────────────────────────────────────
function renderAttDashboard(container) {
    const stats = DB.attendanceStats();
    const allAtt = DB.getAll('attendance');

    // Monthly stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAtt = allAtt.filter(a => new Date(a.date) >= monthStart);

    // Build calendar for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const attByDate = {};
    monthAtt.forEach(a => { attByDate[a.date] = (attByDate[a.date] || 0) + 1; });

    let calendarHTML = dayHeaders.map(d => `<div class="cal-day-header">${d}</div>`).join('');
    for (let i = 0; i < firstDay; i++) calendarHTML += '<div class="cal-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const count = attByDate[dateStr] || 0;
        const isToday = dateStr === DB.today();
        calendarHTML += `<div class="cal-day ${count > 0 ? 'present' : ''} ${isToday ? 'today' : ''}" title="${DB.formatDate(dateStr)}: ${count} check-ins">${d}</div>`;
    }

    container.innerHTML = `
        <div class="page">
            <button class="back-btn" onclick="navigate('attendance')">← Back to Attendance</button>
            <div class="page-header">
                <h2>📊 Attendance Dashboard</h2>
            </div>

            <div class="stats-grid">
                <div class="stat-card gold">
                    <div class="stat-icon">📍</div>
                    <div class="stat-value">${stats.todayTotal}</div>
                    <div class="stat-label">Today's Total</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-icon">🕐</div>
                    <div class="stat-value" style="font-size:1.2rem;">${stats.firstCheckIn}</div>
                    <div class="stat-label">First Check-in</div>
                </div>
                <div class="stat-card blue">
                    <div class="stat-icon">🕐</div>
                    <div class="stat-value" style="font-size:1.2rem;">${stats.lastCheckIn}</div>
                    <div class="stat-label">Last Check-in</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${stats.avgDaily}</div>
                    <div class="stat-label">Avg Daily</div>
                </div>
            </div>

            <!-- Calendar -->
            <div class="card mb-24">
                <div class="card-header">
                    <h3>📅 ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
                </div>
                <div class="att-calendar">${calendarHTML}</div>
                <div style="margin-top:12px;display:flex;gap:16px;font-size:0.72rem;color:var(--text-muted);">
                    <span><span style="display:inline-block;width:12px;height:12px;background:var(--green-bg);border-radius:3px;vertical-align:middle;margin-right:4px;border:1px solid var(--green);"></span> Has check-ins</span>
                    <span><span style="display:inline-block;width:12px;height:12px;border:1px solid var(--gold);border-radius:3px;vertical-align:middle;margin-right:4px;"></span> Today</span>
                </div>
            </div>

            <!-- Top Members -->
            <div class="card">
                <div class="card-header">
                    <h3>🏆 Most Frequent Members</h3>
                </div>
                ${stats.topMembers.length > 0 ? `
                    <div class="table-responsive">
                        <table>
                            <thead><tr><th>#</th><th>Member</th><th>Check-ins</th></tr></thead>
                            <tbody>
                                ${stats.topMembers.map((m, i) => `
                                    <tr>
                                        <td style="font-weight:700;color:${i < 3 ? 'var(--gold)' : 'var(--text-muted)'}">${i + 1}</td>
                                        <td>
                                            <div class="member-cell">
                                                <div class="member-avatar">${m.name.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                                                <div>
                                                    <div style="font-weight:600">${m.name}</div>
                                                    <div style="font-size:0.72rem;color:var(--text-muted)">${m.memberId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="font-weight:700;color:var(--gold)">${m.count}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<div class="empty-state"><p>No attendance data yet</p></div>'}
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════════════════
// ██ PAYMENTS
// ══════════════════════════════════════════════════════════════
function renderPayments(container) {
    const payStats = DB.paymentStats();
    const payments = DB.getAll('payments').sort((a,b) => b.date.localeCompare(a.date));

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>Payments</h2>
                    <div class="subtitle">Track all transactions</div>
                </div>
                <button class="btn btn-primary" onclick="openPaymentModal()">💰 Record Payment</button>
            </div>

            <!-- Revenue Stats -->
            <div class="stats-grid">
                <div class="stat-card gold">
                    <div class="stat-icon">💰</div>
                    <div class="stat-value">₹${payStats.todayCollection.toLocaleString('en-IN')}</div>
                    <div class="stat-label">Today</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value">₹${payStats.weeklyCollection.toLocaleString('en-IN')}</div>
                    <div class="stat-label">This Week</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">₹${payStats.monthlyCollection.toLocaleString('en-IN')}</div>
                    <div class="stat-label">This Month</div>
                </div>
                <div class="stat-card blue">
                    <div class="stat-icon">💎</div>
                    <div class="stat-value">₹${payStats.totalCollection.toLocaleString('en-IN')}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🆕</div>
                    <div class="stat-value">₹${payStats.newRevenue.toLocaleString('en-IN')}</div>
                    <div class="stat-label">New Members</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-value">₹${payStats.renewalRevenue.toLocaleString('en-IN')}</div>
                    <div class="stat-label">Renewals</div>
                </div>
            </div>

            <!-- Payment History -->
            <div class="table-container">
                <div class="table-toolbar">
                    <div class="table-search">
                        <span class="search-icon">🔍</span>
                        <input type="text" placeholder="Search payments..." oninput="filterPaymentTable(this.value)">
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Member</th>
                                <th>Amount</th>
                                <th>Plan</th>
                                <th>Mode</th>
                                <th>Type</th>
                                <th>Receipt</th>
                            </tr>
                        </thead>
                        <tbody id="paymentTableBody">
                            ${payments.map(p => `
                                <tr>
                                    <td>${DB.formatDate(p.date)}</td>
                                    <td>
                                        <div class="member-cell">
                                            <div class="member-avatar">${(p.memberName || '?').split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                                            <div>
                                                <div style="font-weight:600">${p.memberName || '—'}</div>
                                                <div style="font-size:0.72rem;color:var(--text-muted)">${p.memberId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="color:var(--gold);font-weight:700">₹${parseFloat(p.amount).toLocaleString('en-IN')}</td>
                                    <td>${p.plan || '—'}</td>
                                    <td>${p.paymentMode}</td>
                                    <td><span class="status-badge ${p.type === 'new' ? 'active' : 'expiring-soon'}">${p.type === 'new' ? '🆕 New' : '🔄 Renewal'}</span></td>
                                    <td><button class="btn btn-ghost btn-sm" onclick="generateReceipt('${p.id}')">🧾</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${payments.length === 0 ? '<div class="empty-state"><div class="empty-icon">💰</div><h3>No payments recorded</h3></div>' : ''}
            </div>
        </div>
    `;
}

function filterPaymentTable(query) {
    const rows = document.querySelectorAll('#paymentTableBody tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

function openPaymentModal(prefillMemberId = '') {
    const members = DB.getAll('members');
    const plans = DB.getAll('plans').filter(p => p.active);
    const session = DB.getSession();

    openModal(`
        <div class="modal-header">
            <h3>💰 Record Payment</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <form onsubmit="handleRecordPayment(event)">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Member <span class="required">*</span></label>
                        <select class="form-control" id="payMember" required>
                            <option value="">Select Member</option>
                            ${members.filter(m => m.status !== 'inactive').map(m => `<option value="${m.memberId}" ${m.memberId === prefillMemberId ? 'selected' : ''}>${m.name} (${m.memberId})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Amount (₹) <span class="required">*</span></label>
                        <input type="number" class="form-control" id="payAmount" required min="0" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>Payment Mode <span class="required">*</span></label>
                        <select class="form-control" id="payMode" required>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Plan</label>
                        <select class="form-control" id="payPlan">
                            <option value="">Select Plan</option>
                            ${plans.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} — ₹${p.price.toLocaleString('en-IN')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Type <span class="required">*</span></label>
                        <select class="form-control" id="payType" required>
                            <option value="new">New Membership</option>
                            <option value="renewal">Renewal</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <input type="text" class="form-control" id="payNotes" placeholder="Optional notes">
                    </div>
                </div>
                <div class="modal-footer" style="padding:16px 0 0;border:none;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Save Payment</button>
                </div>
            </form>
        </div>
    `, 'large');

    // Auto-fill price when plan changes
    setTimeout(() => {
        const planSelect = document.getElementById('payPlan');
        if (planSelect) {
            planSelect.addEventListener('change', function() {
                const opt = this.options[this.selectedIndex];
                if (opt && opt.dataset.price) {
                    document.getElementById('payAmount').value = opt.dataset.price;
                }
            });
        }
    }, 100);
}

function handleRecordPayment(e) {
    e.preventDefault();
    const session = DB.getSession();
    const memberId = document.getElementById('payMember').value;
    const member = DB.getAll('members').find(m => m.memberId === memberId);

    const payment = {
        memberId,
        memberName: member ? member.name : '',
        amount: parseFloat(document.getElementById('payAmount').value),
        date: DB.today(),
        paymentMode: document.getElementById('payMode').value,
        plan: document.getElementById('payPlan').value,
        type: document.getElementById('payType').value,
        staff: session.name,
        notes: document.getElementById('payNotes').value.trim()
    };

    const saved = DB.add('payments', payment);
    closeModal();
    showToast(`Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded`, 'success');

    // Refresh if on payments page
    if (currentPage === 'payments') renderPayments(document.getElementById('pageContent'));
    if (currentPage === 'dashboard') renderDashboard(document.getElementById('pageContent'));
}

// ── Renew Membership ─────────────────────────────────────────
function openRenewModal() {
    const members = DB.getAll('members').filter(m => m.status !== 'inactive');
    openModal(`
        <div class="modal-header">
            <h3>🔄 Renew Membership</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Select Member</label>
                <select class="form-control" id="renewMemberSelect" onchange="showRenewForm(this.value)">
                    <option value="">Choose a member...</option>
                    ${members.map(m => {
                        const st = DB.memberStatus(m.expiryDate);
                        return `<option value="${m.id}">${m.name} (${m.memberId}) — ${st.emoji} ${st.status}</option>`;
                    }).join('')}
                </select>
            </div>
            <div id="renewFormArea"></div>
        </div>
    `, 'large');
}

function openRenewModalFor(memberId) {
    const member = DB.getById('members', memberId);
    if (!member) return;
    openRenewModal();
    setTimeout(() => {
        const sel = document.getElementById('renewMemberSelect');
        if (sel) { sel.value = memberId; showRenewForm(memberId); }
    }, 100);
}

function showRenewForm(memberId) {
    const area = document.getElementById('renewFormArea');
    if (!memberId) { area.innerHTML = ''; return; }

    const member = DB.getById('members', memberId);
    if (!member) return;

    const plans = DB.getAll('plans').filter(p => p.active);
    const st = DB.memberStatus(member.expiryDate);

    area.innerHTML = `
        <hr class="divider">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div class="member-avatar">${member.name.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
            <div>
                <div style="font-weight:700;">${member.name}</div>
                <div style="font-size:0.82rem;color:var(--text-muted);">${member.memberId} • Current: ${member.plan} • Expiry: ${DB.formatDate(member.expiryDate)}</div>
            </div>
            <span class="status-badge ${st.badge}">${st.emoji} ${st.status}</span>
        </div>
        <form onsubmit="handleRenew(event, '${member.id}')">
            <div class="form-grid">
                <div class="form-group">
                    <label>New Plan <span class="required">*</span></label>
                    <select class="form-control" id="renewPlan" required onchange="updateRenewExpiry()">
                        ${plans.map(p => `<option value="${p.id}" data-duration="${p.duration}" data-price="${p.price}" ${member.planId === p.id ? 'selected' : ''}>${p.name} — ₹${p.price.toLocaleString('en-IN')}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" id="renewStart" value="${DB.today()}" onchange="updateRenewExpiry()">
                </div>
                <div class="form-group">
                    <label>New Expiry Date</label>
                    <input type="date" class="form-control" id="renewExpiry" readonly>
                </div>
                <div class="form-group">
                    <label>Amount (₹) <span class="required">*</span></label>
                    <input type="number" class="form-control" id="renewAmount" required min="0">
                </div>
                <div class="form-group">
                    <label>Payment Mode</label>
                    <select class="form-control" id="renewPayMode">
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:12px;margin-top:16px;">
                <button type="submit" class="btn btn-primary">🔄 Renew Membership</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    updateRenewExpiry();
}

function updateRenewExpiry() {
    const planSel = document.getElementById('renewPlan');
    const startInput = document.getElementById('renewStart');
    const expiryInput = document.getElementById('renewExpiry');
    const amountInput = document.getElementById('renewAmount');
    if (!planSel || !startInput || !expiryInput) return;

    const opt = planSel.options[planSel.selectedIndex];
    if (opt && opt.value) {
        const duration = parseInt(opt.dataset.duration);
        const price = parseInt(opt.dataset.price);
        if (startInput.value && duration) {
            expiryInput.value = DB.addMonths(startInput.value, duration);
        }
        if (amountInput && price) amountInput.value = price;
    }
}

function handleRenew(e, memberId) {
    e.preventDefault();
    const session = DB.getSession();
    const member = DB.getById('members', memberId);
    const planSel = document.getElementById('renewPlan');
    const planOpt = planSel.options[planSel.selectedIndex];
    const newPlan = planOpt.textContent.split('—')[0].trim();
    const newStart = document.getElementById('renewStart').value;
    const newExpiry = document.getElementById('renewExpiry').value;
    const amount = parseFloat(document.getElementById('renewAmount').value);
    const payMode = document.getElementById('renewPayMode').value;

    // Update member
    DB.update('members', memberId, {
        plan: newPlan,
        planId: planSel.value,
        startDate: newStart,
        expiryDate: newExpiry,
        amountPaid: amount,
        paymentMode: payMode,
        status: 'active'
    });

    // Record payment
    DB.add('payments', {
        memberId: member.memberId,
        memberName: member.name,
        amount,
        date: DB.today(),
        paymentMode: payMode,
        plan: newPlan,
        type: 'renewal',
        staff: session.name,
        notes: 'Membership renewal'
    });

    closeModal();
    showToast(`${member.name}'s membership renewed!`, 'success');

    // Refresh current page
    const cont = document.getElementById('pageContent');
    if (currentPage === 'dashboard') renderDashboard(cont);
    else if (currentPage === 'members') renderMembers(cont);
    else if (currentPage === 'member-profile') { window._params = { id: memberId }; renderMemberProfile(cont); }
    else if (currentPage === 'expiry') renderExpiry(cont);
}

// ══════════════════════════════════════════════════════════════
// ██ RECEIPT
// ══════════════════════════════════════════════════════════════
function generateReceipt(paymentId) {
    const payment = DB.getById('payments', paymentId);
    if (!payment) { showToast('Payment not found', 'error'); return; }

    const member = DB.getAll('members').find(m => m.memberId === payment.memberId);
    const settings = DB.getSettings();

    openModal(`
        <div class="modal-header">
            <h3>🧾 Payment Receipt</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <div class="receipt" id="receiptContent">
                <div class="receipt-header">
                    <h2>${settings.gymName}</h2>
                    <div class="tagline">${settings.tagline}</div>
                    <div style="font-size:0.72rem;color:#999;margin-top:6px;">${settings.address}<br>${settings.phone}</div>
                </div>
                <div class="receipt-body">
                    <div class="receipt-row">
                        <span class="label">Receipt No</span>
                        <span class="value">${payment.id ? payment.id.toUpperCase().slice(0,12) : '—'}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Date</span>
                        <span class="value">${DB.formatDate(payment.date)}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Member Name</span>
                        <span class="value">${payment.memberName}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Member ID</span>
                        <span class="value">${payment.memberId}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Plan</span>
                        <span class="value">${payment.plan || '—'}</span>
                    </div>
                    ${member ? `
                        <div class="receipt-row">
                            <span class="label">Start Date</span>
                            <span class="value">${DB.formatDate(member.startDate)}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="label">Expiry Date</span>
                            <span class="value">${DB.formatDate(member.expiryDate)}</span>
                        </div>
                    ` : ''}
                    <div class="receipt-row">
                        <span class="label">Payment Mode</span>
                        <span class="value">${payment.paymentMode}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Type</span>
                        <span class="value">${payment.type === 'new' ? 'New Membership' : 'Renewal'}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Received By</span>
                        <span class="value">${payment.staff || '—'}</span>
                    </div>
                    <div class="receipt-total">
                        <span>Total Amount</span>
                        <span>₹${parseFloat(payment.amount).toLocaleString('en-IN')}</span>
                    </div>
                </div>
                <div class="receipt-footer">
                    Thank you for choosing ${settings.gymName}!<br>
                    This is a computer-generated receipt.
                </div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;">
                <button class="btn btn-primary" onclick="downloadReceiptPDF()">📥 Download PDF</button>
                <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
            </div>
        </div>
    `);
}

function downloadReceiptPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a5' });

        const receiptEl = document.getElementById('receiptContent');
        if (!receiptEl) return;

        // Simple text-based PDF
        const settings = DB.getSettings();
        let y = 15;
        const lx = 15;
        const rx = 133;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.gymName, 74, y, { align: 'center' });
        y += 6;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.tagline, 74, y, { align: 'center' });
        y += 4;
        doc.text(settings.address + ' | ' + settings.phone, 74, y, { align: 'center' });
        y += 8;
        doc.line(lx, y, rx, y);
        y += 6;

        // Get receipt data from DOM
        const rows = receiptEl.querySelectorAll('.receipt-row');
        doc.setFontSize(9);
        rows.forEach(row => {
            const label = row.querySelector('.label')?.textContent || '';
            const value = row.querySelector('.value')?.textContent || '';
            doc.setFont('helvetica', 'normal');
            doc.text(label, lx, y);
            doc.setFont('helvetica', 'bold');
            doc.text(value, rx, y, { align: 'right' });
            y += 6;
        });

        // Total
        const total = receiptEl.querySelector('.receipt-total');
        if (total) {
            y += 2;
            doc.line(lx, y, rx, y);
            y += 6;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const spans = total.querySelectorAll('span');
            doc.text(spans[0]?.textContent || '', lx, y);
            doc.text(spans[1]?.textContent || '', rx, y, { align: 'right' });
        }

        y += 10;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Thank you for choosing ' + settings.gymName + '!', 74, y, { align: 'center' });
        y += 4;
        doc.text('This is a computer-generated receipt.', 74, y, { align: 'center' });

        doc.save('S1GYMA_Receipt.pdf');
        showToast('Receipt downloaded!', 'success');
    } catch(e) {
        console.error('PDF Error:', e);
        showToast('PDF generation failed. Try Print instead.', 'error');
    }
}

// ══════════════════════════════════════════════════════════════
// ██ PLANS
// ══════════════════════════════════════════════════════════════
function renderPlans(container) {
    const plans = DB.getAll('plans');

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>Membership Plans</h2>
                    <div class="subtitle">Manage gym membership packages</div>
                </div>
                <button class="btn btn-primary" onclick="openPlanModal()">➕ Add Plan</button>
            </div>

            <div class="plans-grid">
                ${plans.map((p, i) => `
                    <div class="plan-card ${i === 1 ? 'popular' : ''}">
                        <div class="plan-name">${p.name}</div>
                        <div class="plan-price">₹${p.price.toLocaleString('en-IN')} <span>/ ${p.duration} mo</span></div>
                        <div class="plan-desc">${p.description || ''}</div>
                        <span class="status-badge ${p.active ? 'active' : 'inactive'}">${p.active ? '🟢 Active' : '⚫ Inactive'}</span>
                        <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;">
                            <button class="btn btn-ghost btn-sm" onclick="openPlanModal('${p.id}')">✏️ Edit</button>
                            <button class="btn btn-ghost btn-sm" onclick="togglePlanStatus('${p.id}', ${!p.active})">${p.active ? '⏸ Deactivate' : '▶ Activate'}</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function openPlanModal(planId = null) {
    const plan = planId ? DB.getById('plans', planId) : null;

    openModal(`
        <div class="modal-header">
            <h3>${plan ? '✏️ Edit Plan' : '➕ New Plan'}</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <form onsubmit="handleSavePlan(event, '${planId || ''}')">
                <div class="form-group">
                    <label>Plan Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="planName" required value="${plan ? plan.name : ''}" placeholder="e.g., 3 Months">
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Duration (Months) <span class="required">*</span></label>
                        <input type="number" class="form-control" id="planDuration" required min="1" value="${plan ? plan.duration : ''}" placeholder="3">
                    </div>
                    <div class="form-group">
                        <label>Price (₹) <span class="required">*</span></label>
                        <input type="number" class="form-control" id="planPrice" required min="0" value="${plan ? plan.price : ''}" placeholder="2000">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="planDesc" placeholder="Plan description...">${plan ? plan.description || '' : ''}</textarea>
                </div>
                <div class="modal-footer" style="padding:16px 0 0;border:none;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Save</button>
                </div>
            </form>
        </div>
    `, 'small');
}

function handleSavePlan(e, planId) {
    e.preventDefault();
    const data = {
        name: document.getElementById('planName').value.trim(),
        duration: parseInt(document.getElementById('planDuration').value),
        price: parseInt(document.getElementById('planPrice').value),
        description: document.getElementById('planDesc').value.trim(),
        active: true
    };

    if (planId) {
        DB.update('plans', planId, data);
        showToast('Plan updated', 'success');
    } else {
        DB.add('plans', data);
        showToast('Plan created', 'success');
    }
    closeModal();
    renderPlans(document.getElementById('pageContent'));
}

function togglePlanStatus(planId, active) {
    DB.update('plans', planId, { active });
    showToast(active ? 'Plan activated' : 'Plan deactivated', 'info');
    renderPlans(document.getElementById('pageContent'));
}

// ══════════════════════════════════════════════════════════════
// ██ EXPIRY
// ══════════════════════════════════════════════════════════════
function renderExpiry(container) {
    const currentTab = window._expiryTab || 'all';
    let members;
    if (currentTab === 'today') members = DB.expiringMembers('today');
    else if (currentTab === '3') members = DB.expiringMembers(3);
    else if (currentTab === '7') members = DB.expiringMembers(7);
    else if (currentTab === '15') members = DB.expiringMembers(15);
    else if (currentTab === 'expired') members = DB.expiringMembers('expired');
    else members = [...DB.expiringMembers(15), ...DB.expiringMembers('expired')].filter((m, i, a) => a.findIndex(x => x.id === m.id) === i);

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>⏰ Expiry Management</h2>
                    <div class="subtitle">Track and manage membership expirations</div>
                </div>
            </div>

            <div class="tabs">
                <button class="tab ${currentTab === 'all' ? 'active' : ''}" onclick="window._expiryTab='all'; renderExpiry(document.getElementById('pageContent'))">All</button>
                <button class="tab ${currentTab === 'today' ? 'active' : ''}" onclick="window._expiryTab='today'; renderExpiry(document.getElementById('pageContent'))">Today</button>
                <button class="tab ${currentTab === '3' ? 'active' : ''}" onclick="window._expiryTab='3'; renderExpiry(document.getElementById('pageContent'))">3 Days</button>
                <button class="tab ${currentTab === '7' ? 'active' : ''}" onclick="window._expiryTab='7'; renderExpiry(document.getElementById('pageContent'))">7 Days</button>
                <button class="tab ${currentTab === '15' ? 'active' : ''}" onclick="window._expiryTab='15'; renderExpiry(document.getElementById('pageContent'))">15 Days</button>
                <button class="tab ${currentTab === 'expired' ? 'active' : ''}" onclick="window._expiryTab='expired'; renderExpiry(document.getElementById('pageContent'))">Expired</button>
            </div>

            <div class="table-container">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>ID</th>
                                <th>Plan</th>
                                <th>Expiry</th>
                                <th>Status</th>
                                <th>Days</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${members.map(m => {
                                const st = DB.memberStatus(m.expiryDate);
                                const days = DB.daysRemaining(m.expiryDate);
                                const daysText = days > 0 ? `${days}d left` : days === 0 ? 'Today' : `${Math.abs(days)}d ago`;
                                return `
                                    <tr>
                                        <td>
                                            <div class="member-cell">
                                                <div class="member-avatar">${m.name.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                                                <div>
                                                    <div style="font-weight:600">${m.name}</div>
                                                    <div style="font-size:0.72rem;color:var(--text-muted)">${m.mobile}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="color:var(--gold)">${m.memberId}</td>
                                        <td>${m.plan}</td>
                                        <td>${DB.formatDate(m.expiryDate)}</td>
                                        <td><span class="status-badge ${st.badge}">${st.emoji} ${st.status}</span></td>
                                        <td style="font-weight:700;color:${st.color}">${daysText}</td>
                                        <td>
                                            <button class="btn btn-success btn-sm" onclick="openRenewModalFor('${m.id}')">🔄 Renew</button>
                                            <button class="btn btn-whatsapp btn-sm" onclick="openWhatsApp('${m.mobile}', '${m.name}', '${m.expiryDate}')" style="padding:6px 10px;">💬</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${members.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎉</div><h3>No expiring memberships</h3><p>All clear in this category!</p></div>' : ''}
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════════════════
// ██ REMINDERS
// ══════════════════════════════════════════════════════════════
function renderReminders(container) {
    const expiring7 = DB.expiringMembers(7);
    const expired = DB.expiringMembers('expired');
    const all = [...expiring7, ...expired];

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <div>
                    <h2>💬 Reminders</h2>
                    <div class="subtitle">Send renewal reminders to members</div>
                </div>
            </div>

            <div class="card mb-24">
                <div class="card-header">
                    <h3>📱 WhatsApp Reminders</h3>
                    <span style="font-size:0.82rem;color:var(--text-muted)">${all.length} members need reminders</span>
                </div>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">
                    Click the WhatsApp button next to each member to send them a personalized renewal reminder.
                    Messages open in WhatsApp with a pre-filled text.
                </p>

                ${all.length > 0 ? `
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Mobile</th>
                                    <th>Expiry</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${all.map(m => {
                                    const st = DB.memberStatus(m.expiryDate);
                                    const days = DB.daysRemaining(m.expiryDate);
                                    return `
                                        <tr>
                                            <td style="font-weight:600">${m.name}</td>
                                            <td>${m.mobile}</td>
                                            <td>${DB.formatDate(m.expiryDate)}</td>
                                            <td><span class="status-badge ${st.badge}">${st.emoji} ${st.status}</span></td>
                                            <td>
                                                <button class="btn btn-whatsapp btn-sm" onclick="openWhatsApp('${m.mobile}', '${m.name}', '${m.expiryDate}')">
                                                    💬 WhatsApp
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<div class="empty-state"><div class="empty-icon">🎉</div><h3>No reminders needed</h3><p>All members have active memberships</p></div>'}
            </div>

            <!-- Reminder Templates -->
            <div class="card">
                <div class="card-header">
                    <h3>📝 Message Templates</h3>
                </div>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-sm);font-size:0.85rem;color:var(--text-secondary);">
                        <strong style="color:var(--text-primary);">7 Days Before:</strong><br>
                        "S1 GYMA: Hi [Name], your gym membership expires in 7 days. Renew your membership to continue your training. Contact S1 GYMA for renewal."
                    </div>
                    <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-sm);font-size:0.85rem;color:var(--text-secondary);">
                        <strong style="color:var(--text-primary);">3 Days Before:</strong><br>
                        "S1 GYMA: Hi [Name], your gym membership expires in 3 days. Renew your membership to continue your training. Contact S1 GYMA for renewal."
                    </div>
                    <div style="background:var(--bg-input);padding:14px;border-radius:var(--radius-sm);font-size:0.85rem;color:var(--text-secondary);">
                        <strong style="color:var(--text-primary);">On Expiry:</strong><br>
                        "S1 GYMA: Hi [Name], your gym membership has expired. Renew your membership to continue your training. Contact S1 GYMA for renewal."
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════════════════
// ██ REPORTS
// ══════════════════════════════════════════════════════════════
function renderReports(container) {
    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <h2>📈 Reports</h2>
            </div>

            <div class="report-grid">
                <div class="report-card" onclick="generateReport('daily-attendance')">
                    <div class="report-icon">📍</div>
                    <h3>Daily Attendance</h3>
                    <p>Today's attendance with check-in times</p>
                </div>
                <div class="report-card" onclick="generateReport('monthly-attendance')">
                    <div class="report-icon">📅</div>
                    <h3>Monthly Attendance</h3>
                    <p>This month's attendance summary</p>
                </div>
                <div class="report-card" onclick="generateReport('member-list')">
                    <div class="report-icon">👥</div>
                    <h3>Member Registrations</h3>
                    <p>Complete member list with details</p>
                </div>
                <div class="report-card" onclick="generateReport('expiry-report')">
                    <div class="report-icon">⏰</div>
                    <h3>Membership Expiry</h3>
                    <p>Members with expiring/expired memberships</p>
                </div>
                <div class="report-card" onclick="generateReport('renewals')">
                    <div class="report-icon">🔄</div>
                    <h3>Renewals</h3>
                    <p>Membership renewal history</p>
                </div>
                <div class="report-card" onclick="generateReport('revenue')">
                    <div class="report-icon">💰</div>
                    <h3>Revenue Report</h3>
                    <p>Payment collection summary</p>
                </div>
                <div class="report-card" onclick="generateReport('payment-history')">
                    <div class="report-icon">🧾</div>
                    <h3>Payment History</h3>
                    <p>All payment transactions</p>
                </div>
                <div class="report-card" onclick="generateReport('most-active')">
                    <div class="report-icon">🏆</div>
                    <h3>Most Active Members</h3>
                    <p>Members ranked by attendance frequency</p>
                </div>
            </div>
        </div>
    `;
}

function generateReport(type) {
    let data = [];
    let headers = [];
    let title = '';

    switch (type) {
        case 'daily-attendance': {
            title = 'Daily Attendance Report - ' + DB.formatDate(DB.today());
            headers = ['Member Name', 'Member ID', 'Check-in Time'];
            const att = DB.query('attendance', a => a.date === DB.today());
            data = att.map(a => [a.memberName, a.memberId, a.checkInTime]);
            break;
        }
        case 'monthly-attendance': {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            title = 'Monthly Attendance Report - ' + now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            headers = ['Date', 'Member Name', 'Member ID', 'Check-in Time'];
            const att = DB.query('attendance', a => a.date >= monthStart).sort((a,b) => b.date.localeCompare(a.date));
            data = att.map(a => [DB.formatDate(a.date), a.memberName, a.memberId, a.checkInTime]);
            break;
        }
        case 'member-list': {
            title = 'Member Registrations';
            headers = ['Member ID', 'Name', 'Mobile', 'Gender', 'Plan', 'Join Date', 'Expiry', 'Status', 'Trainer'];
            const members = DB.getAll('members');
            data = members.map(m => {
                const st = DB.memberStatus(m.expiryDate);
                return [m.memberId, m.name, m.mobile, m.gender, m.plan, DB.formatDate(m.joinDate), DB.formatDate(m.expiryDate), st.status, m.trainer || '—'];
            });
            break;
        }
        case 'expiry-report': {
            title = 'Membership Expiry Report';
            headers = ['Member ID', 'Name', 'Mobile', 'Plan', 'Expiry Date', 'Status', 'Days'];
            const members = [...DB.expiringMembers(30), ...DB.expiringMembers('expired')].filter((m,i,a) => a.findIndex(x=>x.id===m.id)===i);
            data = members.map(m => {
                const st = DB.memberStatus(m.expiryDate);
                const days = DB.daysRemaining(m.expiryDate);
                return [m.memberId, m.name, m.mobile, m.plan, DB.formatDate(m.expiryDate), st.status, days];
            });
            break;
        }
        case 'renewals': {
            title = 'Renewal Report';
            headers = ['Date', 'Member', 'Member ID', 'Plan', 'Amount', 'Mode', 'Staff'];
            const payments = DB.query('payments', p => p.type === 'renewal').sort((a,b) => b.date.localeCompare(a.date));
            data = payments.map(p => [DB.formatDate(p.date), p.memberName, p.memberId, p.plan, '₹' + parseFloat(p.amount).toLocaleString('en-IN'), p.paymentMode, p.staff]);
            break;
        }
        case 'revenue': {
            title = 'Revenue Report';
            const ps = DB.paymentStats();
            headers = ['Metric', 'Amount'];
            data = [
                ['Today\'s Collection', '₹' + ps.todayCollection.toLocaleString('en-IN')],
                ['Weekly Collection', '₹' + ps.weeklyCollection.toLocaleString('en-IN')],
                ['Monthly Collection', '₹' + ps.monthlyCollection.toLocaleString('en-IN')],
                ['Total Collection', '₹' + ps.totalCollection.toLocaleString('en-IN')],
                ['New Member Revenue', '₹' + ps.newRevenue.toLocaleString('en-IN')],
                ['Renewal Revenue', '₹' + ps.renewalRevenue.toLocaleString('en-IN')]
            ];
            break;
        }
        case 'payment-history': {
            title = 'Payment History';
            headers = ['Date', 'Member', 'Member ID', 'Amount', 'Plan', 'Mode', 'Type', 'Staff'];
            const payments = DB.getAll('payments').sort((a,b) => b.date.localeCompare(a.date));
            data = payments.map(p => [DB.formatDate(p.date), p.memberName, p.memberId, '₹' + parseFloat(p.amount).toLocaleString('en-IN'), p.plan, p.paymentMode, p.type, p.staff]);
            break;
        }
        case 'most-active': {
            title = 'Most Active Members';
            headers = ['Rank', 'Member', 'Member ID', 'Total Check-ins'];
            const stats = DB.attendanceStats();
            data = stats.topMembers.map((m, i) => [i + 1, m.name, m.memberId, m.count]);
            break;
        }
    }

    showReportPreview(title, headers, data);
}

function showReportPreview(title, headers, data) {
    openModal(`
        <div class="modal-header">
            <h3>📈 ${title}</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <div style="display:flex;gap:8px;margin-bottom:16px;">
                <button class="btn btn-primary btn-sm" onclick="exportCSV('${title}')">📊 Export CSV</button>
                <button class="btn btn-secondary btn-sm" onclick="exportReportPDF('${title}')">📥 Export PDF</button>
            </div>
            <div class="table-responsive" style="max-height:400px;overflow-y:auto;">
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:12px;font-size:0.78rem;color:var(--text-muted);">${data.length} records</div>
        </div>
    `, 'large');

    // Store data globally for export
    window._reportData = { title, headers, data };
}

function exportCSV(title) {
    const { headers, data } = window._reportData;
    try {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, `S1GYMA_${title.replace(/\s+/g, '_')}.xlsx`);
        showToast('Excel file downloaded!', 'success');
    } catch(e) {
        // Fallback to CSV
        const csv = [headers.join(','), ...data.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `S1GYMA_${title.replace(/\s+/g, '_')}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('CSV file downloaded!', 'success');
    }
}

function exportReportPDF(title) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        const { headers, data } = window._reportData;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('S1 GYMA', 14, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 22);
        doc.text('Generated: ' + DB.formatDate(DB.today()), 14, 28);

        let y = 38;
        const colWidth = (280 - 14) / headers.length;

        // Headers
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        headers.forEach((h, i) => {
            doc.text(String(h), 14 + i * colWidth, y);
        });
        y += 4;
        doc.line(14, y, 283, y);
        y += 5;

        // Data
        doc.setFont('helvetica', 'normal');
        data.forEach(row => {
            if (y > 190) {
                doc.addPage();
                y = 20;
            }
            row.forEach((cell, i) => {
                doc.text(String(cell).substring(0, 30), 14 + i * colWidth, y);
            });
            y += 5;
        });

        doc.save(`S1GYMA_${title.replace(/\s+/g, '_')}.pdf`);
        showToast('PDF report downloaded!', 'success');
    } catch(e) {
        showToast('PDF generation failed', 'error');
    }
}

// ══════════════════════════════════════════════════════════════
// ██ SETTINGS
// ══════════════════════════════════════════════════════════════
function renderSettings(container) {
    const settings = DB.getSettings();
    const users = DB.getAll('users');
    const trainers = DB.getAll('trainers');

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <h2>⚙️ Settings</h2>
            </div>

            <!-- Gym Profile -->
            <div class="settings-section">
                <div class="settings-section-header">🏋️ Gym Profile</div>
                <div class="settings-section-body">
                    <form onsubmit="saveGymSettings(event)">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Gym Name</label>
                                <input type="text" class="form-control" id="setGymName" value="${settings.gymName}">
                            </div>
                            <div class="form-group">
                                <label>Tagline</label>
                                <input type="text" class="form-control" id="setTagline" value="${settings.tagline}">
                            </div>
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="text" class="form-control" id="setPhone" value="${settings.phone}">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" class="form-control" id="setEmail" value="${settings.email}">
                            </div>
                            <div class="form-group full-width">
                                <label>Address</label>
                                <input type="text" class="form-control" id="setAddress" value="${settings.address}">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-sm mt-12">💾 Save</button>
                    </form>
                </div>
            </div>

            <!-- Staff -->
            <div class="settings-section">
                <div class="settings-section-header">👤 Staff / Users</div>
                <div class="settings-section-body">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr><th>Name</th><th>Username</th><th>Role</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td style="font-weight:600">${u.name}</td>
                                        <td><code style="color:var(--gold)">${u.username}</code></td>
                                        <td><span class="status-badge active" style="text-transform:capitalize">${u.role}</span></td>
                                        <td><button class="btn btn-ghost btn-sm" onclick="openEditStaffModal('${u.id}')">✏️</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button class="btn btn-secondary btn-sm mt-12" onclick="openAddStaffModal()">➕ Add Staff</button>
                </div>
            </div>

            <!-- Trainers -->
            <div class="settings-section">
                <div class="settings-section-header">💪 Trainers</div>
                <div class="settings-section-body">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr><th>Name</th><th>Mobile</th><th>Specialization</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                ${trainers.map(t => `
                                    <tr>
                                        <td style="font-weight:600">${t.name}</td>
                                        <td>${t.mobile}</td>
                                        <td>${t.specialization}</td>
                                        <td><span class="status-badge ${t.active ? 'active' : 'inactive'}">${t.active ? '🟢 Active' : '⚫ Inactive'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button class="btn btn-secondary btn-sm mt-12" onclick="openAddTrainerModal()">➕ Add Trainer</button>
                </div>
            </div>

            <!-- Data Management -->
            <div class="settings-section">
                <div class="settings-section-header">💾 Data Management</div>
                <div class="settings-section-body">
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">
                        Export all data as a backup file, or import a previously exported backup.
                    </p>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" onclick="exportData()">📥 Export Backup (JSON)</button>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('importFile').click()">📤 Import Backup</button>
                        <input type="file" id="importFile" accept=".json" style="display:none" onchange="importData(this)">
                        <button class="btn btn-danger btn-sm" onclick="confirmResetData()">🗑️ Reset All Data</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function saveGymSettings(e) {
    e.preventDefault();
    DB.saveSettings({
        gymName: document.getElementById('setGymName').value,
        tagline: document.getElementById('setTagline').value,
        phone: document.getElementById('setPhone').value,
        email: document.getElementById('setEmail').value,
        address: document.getElementById('setAddress').value,
        currency: '₹',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY'
    });
    showToast('Settings saved!', 'success');
}

function openAddStaffModal() {
    openModal(`
        <div class="modal-header">
            <h3>➕ Add Staff</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <form onsubmit="handleAddStaff(event)">
                <div class="form-group">
                    <label>Full Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="staffName" required>
                </div>
                <div class="form-group">
                    <label>Username <span class="required">*</span></label>
                    <input type="text" class="form-control" id="staffUsername" required>
                </div>
                <div class="form-group">
                    <label>Password <span class="required">*</span></label>
                    <input type="password" class="form-control" id="staffPassword" required>
                </div>
                <div class="form-group">
                    <label>Role <span class="required">*</span></label>
                    <select class="form-control" id="staffRole" required>
                        <option value="reception">Reception</option>
                        <option value="trainer">Trainer</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                    </select>
                </div>
                <div class="modal-footer" style="padding:16px 0 0;border:none;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Add Staff</button>
                </div>
            </form>
        </div>
    `, 'small');
}

function handleAddStaff(e) {
    e.preventDefault();
    DB.add('users', {
        name: document.getElementById('staffName').value.trim(),
        username: document.getElementById('staffUsername').value.trim(),
        password: document.getElementById('staffPassword').value,
        role: document.getElementById('staffRole').value
    });
    closeModal();
    showToast('Staff added!', 'success');
    renderSettings(document.getElementById('pageContent'));
}

function openEditStaffModal(userId) {
    const user = DB.getById('users', userId);
    if (!user) return;
    openModal(`
        <div class="modal-header">
            <h3>✏️ Edit Staff — ${user.name}</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <form onsubmit="handleEditStaff(event, '${userId}')">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" id="eStaffName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" class="form-control" id="eStaffUsername" value="${user.username}" required>
                </div>
                <div class="form-group">
                    <label>New Password <span style="font-size:0.7rem;color:var(--text-muted)">(leave blank to keep current)</span></label>
                    <input type="password" class="form-control" id="eStaffPassword">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select class="form-control" id="eStaffRole">
                        <option value="reception" ${user.role==='reception'?'selected':''}>Reception</option>
                        <option value="trainer" ${user.role==='trainer'?'selected':''}>Trainer</option>
                        <option value="manager" ${user.role==='manager'?'selected':''}>Manager</option>
                        <option value="owner" ${user.role==='owner'?'selected':''}>Owner</option>
                    </select>
                </div>
                <div class="modal-footer" style="padding:16px 0 0;border:none;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Save</button>
                </div>
            </form>
        </div>
    `, 'small');
}

function handleEditStaff(e, userId) {
    e.preventDefault();
    const updates = {
        name: document.getElementById('eStaffName').value.trim(),
        username: document.getElementById('eStaffUsername').value.trim(),
        role: document.getElementById('eStaffRole').value
    };
    const pwd = document.getElementById('eStaffPassword').value;
    if (pwd) updates.password = pwd;
    DB.update('users', userId, updates);
    closeModal();
    showToast('Staff updated!', 'success');
    renderSettings(document.getElementById('pageContent'));
}

function openAddTrainerModal() {
    openModal(`
        <div class="modal-header">
            <h3>➕ Add Trainer</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <form onsubmit="handleAddTrainer(event)">
                <div class="form-group">
                    <label>Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="trainerName" required>
                </div>
                <div class="form-group">
                    <label>Mobile <span class="required">*</span></label>
                    <input type="tel" class="form-control" id="trainerMobile" required>
                </div>
                <div class="form-group">
                    <label>Specialization</label>
                    <input type="text" class="form-control" id="trainerSpec" placeholder="e.g., Strength Training">
                </div>
                <div class="modal-footer" style="padding:16px 0 0;border:none;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Add Trainer</button>
                </div>
            </form>
        </div>
    `, 'small');
}

function handleAddTrainer(e) {
    e.preventDefault();
    DB.add('trainers', {
        name: document.getElementById('trainerName').value.trim(),
        mobile: document.getElementById('trainerMobile').value.trim(),
        specialization: document.getElementById('trainerSpec').value.trim(),
        active: true
    });
    closeModal();
    showToast('Trainer added!', 'success');
    renderSettings(document.getElementById('pageContent'));
}

function exportData() {
    const data = {};
    const keys = ['users', 'members', 'plans', 'attendance', 'payments', 'trainers', 'settings', 'memberIdCounter'];
    keys.forEach(k => { data[k] = DB._get(k); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `S1GYMA_Backup_${DB.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded!', 'success');
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Object.keys(data).forEach(k => {
                DB._set(k, data[k]);
            });
            showToast('Data imported successfully! Refreshing...', 'success');
            setTimeout(() => { renderApp(); }, 1000);
        } catch(err) {
            showToast('Invalid backup file', 'error');
        }
    };
    reader.readAsText(file);
}

function confirmResetData() {
    openModal(`
        <div class="modal-header">
            <h3>🗑️ Reset All Data</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            <div class="confirm-dialog">
                <div class="confirm-icon">⚠️</div>
                <h3>Are you absolutely sure?</h3>
                <p>This will permanently delete ALL data including members, payments, and attendance. This cannot be undone.</p>
                <div class="confirm-actions">
                    <button class="btn btn-danger" onclick="resetAllData()">Yes, Reset Everything</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        </div>
    `, 'small');
}

function resetAllData() {
    DB.resetAll();
    closeModal();
    DB.seed();
    showToast('Data reset to defaults', 'warning');
    renderApp();
}

// ══════════════════════════════════════════════════════════════
// ██ MORE (Mobile)
// ══════════════════════════════════════════════════════════════
function renderMore(container) {
    const items = [
        { icon: '📋', label: 'Membership Plans', page: 'plans' },
        { icon: '⏰', label: 'Expiry Management', page: 'expiry' },
        { icon: '💬', label: 'Reminders', page: 'reminders' },
        { icon: '📈', label: 'Reports', page: 'reports' },
        { icon: '⚙️', label: 'Settings', page: 'settings' }
    ];

    container.innerHTML = `
        <div class="page">
            <div class="page-header">
                <h2>More</h2>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${items.map(item => `
                    <div class="card" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;gap:14px;" onclick="navigate('${item.page}')">
                        <span style="font-size:1.4rem;">${item.icon}</span>
                        <span style="font-weight:600;font-size:0.95rem;">${item.label}</span>
                        <span style="margin-left:auto;color:var(--text-muted);">→</span>
                    </div>
                `).join('')}
            </div>

            <div class="divider" style="margin:32px 0;"></div>

            <div class="card" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;gap:14px;border-color:rgba(239,68,68,0.2);" onclick="handleLogout()">
                <span style="font-size:1.4rem;">⏻</span>
                <span style="font-weight:600;font-size:0.95rem;color:var(--red);">Logout</span>
            </div>
        </div>
    `;
}
