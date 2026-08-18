import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://localhost:5174/pos/', { waitUntil: 'networkidle' });

const validation = await page.evaluate(async () => {
  const ReactModule = await import('/pos/node_modules/.vite/deps/react.js');
  const React = ReactModule.default;
  const ReactDom = await import('/pos/node_modules/.vite/deps/react-dom_client.js');
  const createRoot = ReactDom.createRoot || ReactDom.default.createRoot;
  const { EstimateBillPreview } = await import('/pos/src/components/estimate/EstimateBillPreview.tsx');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const user = { full_name: 'Asha Verma', email: 'asha@example.com', business_name: 'POS Gold', branch_name: 'Main Branch', role: { name: 'Cashier', code: 'cashier' }, permissions: ['*'] };
  const product = (id, productId, name, quantity, wastage) => Array.from({ length: quantity }, (_, index) => ({ id: `${id}-${index}`, product_id: productId, name, tag_number: `${id}-${index}`, barcode: `${id}-${index}`, purity: '22K / 916', gross_weight: '10.000', stone_weight: '0.500', net_weight: '9.500', fine_weight: '8.550', wastage_percent: wastage, status: 'AVAILABLE', available_count: quantity, availability_status: 'AVAILABLE', ownership: 'BRANCH' }));
  const cart = [...product('ring', 'flower-ring', 'Flower Ring', 2, '10'), ...product('chain', 'gold-chain', 'Gold Chain', 1, '8'), ...product('earring', 'gold-earrings', 'Gold Earrings', 3, '5')];
  const quotes = Object.fromEntries(cart.map(item => [item.id, { rate_per_gram: '7000', breakdown: { metal_value: '66500', wastage_value: '6650', making_charge: '1200', discount: '0', subtotal: '74350', tax_amount: '2230.5', total: '76580.5' } }]));
  createRoot(root).render(React.createElement(EstimateBillPreview, { cart, quotes, customer: { name: 'Test Customer', phone: '9876543210' }, user, onClose: () => {} }));
  await new Promise(resolve => setTimeout(resolve, 300));
  const element = document.getElementById('estimated-bill-pdf');
  return { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0, products: [...document.querySelectorAll('.estimate-stage .quotation-item h3')].map(node => node.textContent) };
});
if (validation.width === 0 || validation.height === 0) throw new Error(`PDF target has invalid dimensions: ${JSON.stringify(validation)}`);
if (validation.products.join('|') !== 'Flower Ring|Gold Chain|Gold Earrings') throw new Error(`Unexpected grouped product cards: ${validation.products.join('|')}`);

await mkdir('test-artifacts', { recursive: true });
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: 'test-artifacts/estimated-bill-print-multi-item.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
await page.emulateMedia({ media: 'screen' });
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download PDF' }).click();
const download = await downloadPromise;
await download.saveAs('test-artifacts/estimated-bill-multi-item.pdf');
console.log(JSON.stringify({ validation, suggestedFilename: download.suggestedFilename() }));
await browser.close();
