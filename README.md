# S1 GYMA — Premium Gym Management & Attendance System

> **STRENGTH • DISCIPLINE • RESULTS**

A complete, high-performance web application designed for commercial gyms in India. Built with a sleek black & gold aesthetic, optimized for mobile operations and desktop dashboards.

---

## 🌟 Key Features

### 1. 📊 Executive Dashboard
- **Real-Time KPIs**: Total active members, today's attendance, monthly new admissions, pending renewals, and total revenue.
- **Expiry Alerts**: Dynamic tracking for memberships expiring today, in 3 days, 7 days, and expired memberships.
- **Quick Action Bar**: Fast shortcuts for adding members, marking attendance, renewing plans, and recording transactions.

### 2. 👥 Member Management
- Member profiles with photo capture/upload, contact info, emergency contacts, blood group, and medical notes.
- Status badges (`Active`, `Expiring Soon`, `Expired`, `Pending`).
- Unique Member ID & QR Code generation for seamless check-ins.
- Digital Membership Card download with branded aesthetics.
- Multi-field search, filtering, and bulk Excel/CSV export.

### 3. ⚡ Attendance Tracker & Scanner
- **Dual Mode**: Camera QR Code scanner and Manual Search/1-click check-in.
- Real-time verification: Instantly shows member status, photo, plan expiry, and remaining days upon scan.
- Daily attendance log, peak hour activity distribution, and attendance history export.

### 4. 💳 Membership Plans & Subscriptions
- Customizable plans (Monthly, Quarterly, Half-Yearly, Annual) with admission fees and discounts.
- Automatic expiry date calculation and grace period handling.
- Renewal workflows preserving history and tracking continuity.

### 5. 💰 Billing, Payments & Invoices
- Indian Rupee (₹) financial tracking across Cash, UPI (GPay, PhonePe, Paytm), Card, and Bank Transfer.
- Payment history and outstanding balance ledger.
- Instant PDF receipt generator with gym branding, GST/tax details, and printable format.

### 6. 📱 WhatsApp Integration
- Pre-composed direct WhatsApp messaging templates for:
  - Welcome messages & credentials
  - Expiry reminders (7 days, 3 days, day of expiry)
  - Payment & renewal receipts
  - Attendance alerts & workout tips

### 7. 📈 Reports & Analytics
- Monthly revenue trends and plan distribution charts.
- Member retention and churn rates.
- One-click Excel/SheetJS and CSV export for accountants and owners.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Installation & Launch

1. Clone or download the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/s1-gym.git
   cd s1-gym
   ```

2. Run the application:
   ```bash
   node server.js
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid, Glassmorphism, Micro-animations), Vanilla JavaScript (ES6+).
- **Storage**: Browser IndexedDB / LocalStorage for offline-first, low-latency performance.
- **Libraries**:
  - `QRCode.js` & `html5-qrcode` (QR Generation & Live Scanning)
  - `jsPDF` (Digital Receipt Generation)
  - `SheetJS (xlsx)` (Excel Export)
  - Google Fonts (`Inter` & `Orbitron`)

---

## 📄 License
MIT License. Crafted for **S1 GYMA**.
