import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

async function captureAllScreenshots() {
  console.log('📸 [Screenshot Studio] Starting high-resolution capture of all HRMS interfaces...');

  // Find Edge executable
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  let edgePath = possiblePaths.find((p) => fs.existsSync(p));

  if (!edgePath) {
    throw new Error('Microsoft Edge executable not found at standard paths');
  }

  const outDir = path.resolve(__dirname, '../../docs/screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // 2x Retina scaling for ultra-crisp screenshots
    },
  });

  const page = await browser.newPage();

  try {
    // 1. Login Page
    console.log('1. Capturing Login & Org Portal...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(outDir, '01_login_portal.png') });

    // 2. Perform Login as SuperAdmin
    console.log('2. Signing in as SuperAdmin...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'apex-ceylon',
        email: 'admin@apexceylon.com',
        password: 'Admin@12345',
      }),
    }).then((r) => r.json());

    const token = loginRes.data.accessToken;
    const user = loginRes.data.user;

    await page.evaluate(
      ({ t, u }) => {
        localStorage.setItem('hrms_token', t);
        localStorage.setItem('hrms_user', JSON.stringify(u));
      },
      { t: token, u: user }
    );

    // 3. Overview Dashboard
    console.log('3. Capturing Executive Dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '02_executive_dashboard.png') });

    // 4. Employee Directory & 360
    console.log('4. Capturing Employee 360 & Directory...');
    await page.goto('http://localhost:3000/dashboard/employees', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '03_employee_360_directory.png') });

    // 5. Dynamic QR Attendance Kiosk
    console.log('5. Capturing Dynamic QR Attendance Kiosk...');
    await page.goto('http://localhost:3000/dashboard/attendance', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '04_dynamic_qr_attendance.png') });

    // 6. Multi-Policy Leave Management
    console.log('6. Capturing Multi-Policy Leave Management...');
    await page.goto('http://localhost:3000/dashboard/leave', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '05_multi_policy_leave.png') });

    // 7. Statutory Payroll Engine
    console.log('7. Capturing Sri Lankan Statutory Payroll Engine...');
    await page.goto('http://localhost:3000/dashboard/payroll', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '06_statutory_payroll.png') });

    // 8. Lifecycle & Hardware Assets
    console.log('8. Capturing Assets & Lifecycle Offboarding...');
    await page.goto('http://localhost:3000/dashboard/lifecycle', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '07_lifecycle_and_assets.png') });

    // 9. HR Policy AI Assistant (RAG Engine)
    console.log('9. Capturing Internal HR Policy Assistant (RAG)...');
    await page.goto('http://localhost:3000/dashboard/rag', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '08_hr_policy_rag_ai.png') });

    // 10. Immutable Security Audit Trail
    console.log('10. Capturing Forensic Security Audit Trail...');
    await page.goto('http://localhost:3000/dashboard/audit', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '09_security_audit_trail.png') });

    console.log('🎉 [Screenshot Studio] All 9 interfaces captured successfully in docs/screenshots/!');
  } finally {
    await browser.close();
  }
}

captureAllScreenshots().catch((err) => {
  console.error('Screenshot studio error:', err);
  process.exit(1);
});
