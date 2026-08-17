import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:5174/pos/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const response = await fetch('/pos-api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.jewellery', password: 'ChangeMe!123' }) });
    const login = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(login));
    sessionStorage.setItem('pos_access_token', login.access_token);
    sessionStorage.setItem('pos_refresh_token', login.refresh_token);
  });

  await page.goto('http://localhost:5174/pos/products', { waitUntil: 'networkidle' });
  const productsText = await page.locator('.available-table').innerText();
  const product = await page.evaluate(async () => {
    const token = sessionStorage.getItem('pos_access_token');
    const [products, cart] = await Promise.all([
      fetch('/pos-api/v1/pos/products?page=1&page_size=100', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/pos-api/v1/pos/cart/active', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    const cartIds = new Set(cart.lines.map(line => line.item_id));
    return products.items.find(item => !cartIds.has(item.id)) || products.items[0] || null;
  });
  if (!product) throw new Error('No available ERP product exists for browser barcode verification.');

  let lookupRequests = 0, cartAdds = 0;
  page.on('request', request => {
    if (request.url().includes('/pos/items/lookup')) lookupRequests += 1;
    if (request.method() === 'POST' && request.url().includes('/pos/cart/items')) cartAdds += 1;
  });
  await page.goto('http://localhost:5174/pos/billing', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Scan or type barcode').fill(product.barcode);
  await page.getByPlaceholder('Scan or type barcode').press('Enter');
  await page.getByRole('heading', { name: 'Product result' }).waitFor();
  await page.getByText(`Barcode · ${product.barcode}`).waitFor();
  const cartAddsBeforeClick = cartAdds;
  const resultBox = page.locator('.scan-result');
  const resultText = await resultBox.innerText();
  const addButton = resultBox.getByRole('button', { name: /add to bill/i });
  const canAdd = await addButton.isEnabled();
  let addedLineId = null;
  if (canAdd) {
    await addButton.click();
    await page.waitForLoadState('networkidle');
    addedLineId = await page.evaluate(async id => {
      const token = sessionStorage.getItem('pos_access_token');
      const cart = await fetch('/pos-api/v1/pos/cart/active', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      return cart.lines.find(line => line.item_id === id)?.id || null;
    }, product.id);
    if (addedLineId) await page.evaluate(async lineId => {
      const token = sessionStorage.getItem('pos_access_token');
      await fetch(`/pos-api/v1/pos/cart/items/${lineId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }, addedLineId);
  }
  console.log(JSON.stringify({
    routes: ['/pos/products', '/pos/billing'],
    products: {
      hasProductId: productsText.includes('PRODUCT ID'), hasTag: /(^|\n)TAG($|\n)/.test(productsText),
      headings: ['PRODUCT','BARCODE','PURITY','GROSS','NET','FINE','WASTAGE','AVAILABLE STOCK','ACTION'].filter(x => productsText.includes(x)),
      pieceCountVisible: /\d+ PIECES/.test(productsText),
    },
    billing: { resultDirectlyAfterScanner: await page.locator('.scan + .scan-result').count() === 1, barcodeVisible: resultText.includes(product.barcode), addButtonVisible: await addButton.isVisible(), cartAddsBeforeClick, cartAddsAfterClick: cartAdds, lookupRequests },
  }, null, 2));
} finally { await browser.close(); }
