// test-api.js — Comprehensive API test suite for S1 GYMA
const assert = require('assert');

async function runTests() {
    console.log('🚀 Running S1 GYMA API Suite...\n');

    // Helper mock req/res
    function createMockReqRes(method, body = {}, query = {}) {
        const req = {
            method,
            body,
            query,
            headers: {}
        };
        const res = {
            statusCode: 200,
            headers: {},
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            setHeader(k, v) {
                this.headers[k] = v;
                return this;
            },
            json(data) {
                this.body = data;
                return this;
            },
            end(data) {
                if (data && !this.body) {
                    try { this.body = JSON.parse(data); } catch(e) { this.body = data; }
                }
                return this;
            }
        };
        return { req, res };
    }

    // 1. Test Server Startup Safety (no document/window errors)
    console.log('1️⃣ Checking server modules for browser dependencies...');
    assert.strictEqual(typeof document, 'undefined', 'document must be undefined on server');
    assert.strictEqual(typeof window, 'undefined', 'window must be undefined on server');
    require('./db');
    require('./app');
    console.log('   ✅ No browser globals required at server startup.');

    // 2. Test /api/auth
    console.log('\n2️⃣ Testing /api/auth...');
    const authHandler = require('./api/auth');
    
    // Login with valid credentials
    const { req: reqAuth, res: resAuth } = createMockReqRes('POST', { username: 'admin', password: 'admin123' });
    await authHandler(reqAuth, resAuth);
    assert.strictEqual(resAuth.statusCode, 200, 'Login should succeed');
    assert.strictEqual(resAuth.body.success, true);
    console.log('   ✅ Login API works (username: admin, status: 200)');

    // Check session
    const { req: reqSess, res: resSess } = createMockReqRes('GET');
    await authHandler(reqSess, resSess);
    assert.strictEqual(resSess.statusCode, 200);
    assert.ok(resSess.body.session, 'Session should exist');
    console.log('   ✅ Session API works');

    // 3. Test /api/dashboard
    console.log('\n3️⃣ Testing /api/dashboard...');
    const dashHandler = require('./api/dashboard');
    const { req: reqDash, res: resDash } = createMockReqRes('GET');
    await dashHandler(reqDash, resDash);
    assert.strictEqual(resDash.statusCode, 200);
    assert.ok(resDash.body.stats, 'Dashboard stats present');
    assert.ok(resDash.body.revenue, 'Revenue stats present');
    console.log(`   ✅ Dashboard API works (Total members: ${resDash.body.stats.totalMembers}, Active: ${resDash.body.stats.activeMembers})`);

    // 4. Test /api/members
    console.log('\n4️⃣ Testing /api/members...');
    const membersHandler = require('./api/members');
    const { req: reqMembers, res: resMembers } = createMockReqRes('GET');
    await membersHandler(reqMembers, resMembers);
    assert.strictEqual(resMembers.statusCode, 200);
    assert.ok(resMembers.body.data.length > 0, 'Members list populated');
    console.log(`   ✅ Members API works (${resMembers.body.data.length} members loaded)`);

    // Add new member
    const newMemberData = {
        name: 'Test Member',
        phone: '9999988888',
        plan: '3 Months',
        status: 'Active'
    };
    const { req: reqAddMem, res: resAddMem } = createMockReqRes('POST', newMemberData);
    await membersHandler(reqAddMem, resAddMem);
    assert.strictEqual(resAddMem.statusCode, 201);
    assert.ok(resAddMem.body.data.memberId, 'Generated memberId');
    console.log(`   ✅ Add Member API works (Assigned ID: ${resAddMem.body.data.memberId})`);

    // 5. Test /api/attendance
    console.log('\n5️⃣ Testing /api/attendance...');
    const attendanceHandler = require('./api/attendance');
    const { req: reqAtt, res: resAtt } = createMockReqRes('GET');
    await attendanceHandler(reqAtt, resAtt);
    assert.strictEqual(resAtt.statusCode, 200);
    console.log(`   ✅ Attendance GET API works (${resAtt.body.count} records today)`);

    // Mark attendance
    const { req: reqMarkAtt, res: resMarkAtt } = createMockReqRes('POST', { memberId: 'S1-00001', mode: 'QR' });
    await attendanceHandler(reqMarkAtt, resMarkAtt);
    assert.strictEqual(resMarkAtt.statusCode, 201);
    assert.strictEqual(resMarkAtt.body.data.memberId, 'S1-00001');
    console.log('   ✅ Mark Attendance API works (Mode: QR, ID: S1-00001)');

    // 6. Test /api/payments
    console.log('\n6️⃣ Testing /api/payments...');
    const paymentsHandler = require('./api/payments');
    const { req: reqPay, res: resPay } = createMockReqRes('GET');
    await paymentsHandler(reqPay, resPay);
    assert.strictEqual(resPay.statusCode, 200);
    console.log(`   ✅ Payments GET API works (${resPay.body.count} transactions)`);

    // Record payment
    const { req: reqRecPay, res: resRecPay } = createMockReqRes('POST', {
        memberId: 'S1-00001',
        amount: 2500,
        paymentMode: 'UPI',
        plan: '3 Months',
        type: 'renewal'
    });
    await paymentsHandler(reqRecPay, resRecPay);
    assert.strictEqual(resRecPay.statusCode, 201);
    console.log('   ✅ Record Payment API works (Amount: ₹2500, Mode: UPI)');

    console.log('\n✨ ALL API TESTS PASSED! ZERO "document is not defined" ERRORS! ✨\n');
}

runTests().catch(err => {
    console.error('❌ API Test Failed:', err);
    process.exit(1);
});
