import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:5174/pos/', { waitUntil: 'networkidle' });
  const invoiceId = await page.evaluate(async () => {
    const login = await fetch('/pos-api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.jewellery', password: 'ChangeMe!123' }) }).then(r => r.json());
    sessionStorage.setItem('pos_access_token', login.access_token);
    sessionStorage.setItem('pos_refresh_token', login.refresh_token);
    const invoices = await fetch('/pos-api/v1/pos/invoices?page=1&page_size=1', { headers: { Authorization: `Bearer ${login.access_token}` } }).then(r => r.json());
    return invoices.items[0]?.id;
  });
  if (!invoiceId) throw new Error('No real invoice is available for print verification.');
  await page.goto(`http://localhost:5174/pos/invoices/${invoiceId}`, { waitUntil: 'networkidle' });
  await page.locator('.invoice-print-document').waitFor({ state: 'visible' });
  const screenText = await page.locator('.invoice-print-document').innerText();
  const invoiceNumber = (await page.locator('.invoice-title b').textContent())?.trim();
  await page.emulateMedia({ media: 'print' });
  const printState = await page.evaluate(() => ({
    invoiceVisibility: getComputedStyle(document.querySelector('.invoice-print-document')).visibility,
    invoiceDisplay: getComputedStyle(document.querySelector('.invoice-print-document')).display,
    sidebarDisplay: getComputedStyle(document.querySelector('.side')).display,
    actionsDisplay: getComputedStyle(document.querySelector('.invoice-view-actions')).display,
  }));
  const pdfPath = join(tmpdir(), 'pos-invoice-print-verification.pdf');
  const screenshotPath = join(tmpdir(), 'pos-invoice-print-verification.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  const pdf = await readFile(pdfPath);
  const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  const normalizedText = screenText.toLowerCase();
  const contentChecks = Object.fromEntries(['tax invoice', invoiceNumber, 'jewellery details', 'invoice summary', 'payment'].map(value => [value, Boolean(value && normalizedText.includes(value.toLowerCase()))]));
  const requiredContent = Object.values(contentChecks).every(Boolean);
  await writeFile(join(tmpdir(), 'pos-invoice-print-verification.json'), JSON.stringify({ invoiceId, invoiceNumber, pageCount, pdfBytes: pdf.length, requiredContent, contentChecks, printState, pdfPath, screenshotPath }, null, 2));
  process.stdout.write(JSON.stringify({ invoiceId, invoiceNumber, pageCount, pdfBytes: pdf.length, requiredContent, contentChecks, printState, pdfPath, screenshotPath }, null, 2));
} finally {
  await browser.close();
}
