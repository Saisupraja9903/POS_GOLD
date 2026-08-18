import { useEffect, useRef, useState } from 'react';
import { CreditCard, Eye, Gem, Minus, Plus, ScanLine, Search, Trash2, X } from 'lucide-react';
import { api } from '../auth';
import type { JewelleryItem, PosUser, PriceQuote } from '../types';
import { formatMoney } from '../utils/format';
import '../styles/billing.css';
import '../styles/quantity.css';
import { CustomerSelector, SelectedCustomerCard } from '../components/customers/CustomerSelector';
import type { Customer } from '../types/customer';
import { ReceiptExperience } from '../components/receipt/ReceiptExperience';
import { EstimateBillPreview } from '../components/estimate/EstimateBillPreview';

interface CartItem extends JewelleryItem { cartLineId: string; product_id: string; name?: string; huid?: string; purity?: string; wastage_percent: string | null }

export function BillingPage({ user }: { user: PosUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JewelleryItem[]>([]);
  const [cart, setCart] = useState<JewelleryItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, PriceQuote>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [invoice, setInvoice] = useState<any>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const cartIds = useRef(new Set(cart.map(item => item.id)));
  const addingIds = useRef(new Set<string>());

  useEffect(() => { cartIds.current = new Set(cart.map(item => item.id)); }, [cart]);
  async function loadActiveCart() {
    try {
      const { data } = await api.get('/pos/cart/active');
      const lines = data.lines as Array<JewelleryItem & { id: string; item_id: string }>;
      const items = lines.map(line => ({ ...line, id: line.item_id, cartLineId: line.id } as JewelleryItem));
      const priced = await Promise.all(items.map(async item => [item.id, (await api.post<PriceQuote>('/sales/quote', { item_id: item.id, tax_rate_percent: '3', ...(Number((item as CartItem).wastage_percent) > 0 ? { wastage: { method: 'PERCENTAGE', value: (item as CartItem).wastage_percent } } : {}) })).data] as const));
      setCart(items);
      setQuotes(Object.fromEntries(priced));
    } catch (reason: any) { setError(reason.response?.data?.error?.message || 'Unable to load the active cart.'); }
  }

  useEffect(() => { void loadActiveCart(); }, []);

  async function searchInventory() {
    if (!query.trim()) return;
    setError(''); setLookupError(''); setSearching(true);
    try {
      const { data } = await api.get('/pos/items/lookup', { params: { code: query.trim() } });
      setResults([data]);
      const quote = await api.post<PriceQuote>('/sales/quote', { item_id: data.id, tax_rate_percent: '3', ...(Number(data.wastage_percent) > 0 ? { wastage: { method: 'PERCENTAGE', value: data.wastage_percent } } : {}) });
      setQuotes(current => ({ ...current, [data.id]: quote.data }));
      if (cartIds.current.has(data.id)) setError('This jewellery item is already in the bill.');
    } catch (reason: any) {
      const message = reason.response?.data?.error?.message || `Product not found for barcode ${query.trim()}.`;
      setResults([]); setLookupError(message);
    } finally { setSearching(false); }
  }

  async function addToCart(item: JewelleryItem) {
    if (cartIds.current.has(item.id)) { setError('This jewellery item is already in the bill.'); return; }
    if (addingIds.current.has(item.id)) return;
    addingIds.current.add(item.id);
    setBusy(true);
    try {
      const { data } = await api.post('/sales/quote', { item_id: item.id, tax_rate_percent: '3' });
      await api.post('/pos/cart/items', null, { params: { item_id: item.id } });
      setQuotes((current) => ({ ...current, [item.id]: data }));
      await loadActiveCart();
      setQuery('');
      setResults([]);
    } catch (reason: any) {
      if (reason.response?.status === 409) {
        setError('This jewellery item is no longer available.');
        const { data } = await api.get('/jewellery', { params: { barcode: item.barcode } });
        setResults(data);
      } else setError(reason.response?.data?.error?.message || 'Unable to price this item.');
    } finally {
      addingIds.current.delete(item.id);
      setBusy(false);
    }
  }

  function removeFromCart(itemId: string) {
    const line = cart.find(item => item.id === itemId) as JewelleryItem & { cartLineId?: string } | undefined;
    if (!line?.cartLineId) return;
    void api.delete(`/pos/cart/items/${line.cartLineId}`).then(loadActiveCart).catch(() => setError('Unable to remove this item from the cart.'));
  }

  async function incrementGroup(item: JewelleryItem) {
    if (busy) return;
    setBusy(true); setError('');
    try { await api.post('/pos/cart/products', { product_item_id: item.id, quantity: 1 }); await loadActiveCart(); }
    catch (reason: any) { setError(reason.response?.data?.error?.message || 'No additional piece is available.'); }
    finally { setBusy(false); }
  }

  function removeGroup(productId: string) {
    const item = cart.find(line => (line as CartItem).product_id === productId);
    if (!item) return;
    void api.delete(`/pos/cart/products/by-item/${item.id}`).then(loadActiveCart).catch(() => setError('Unable to remove this product from the cart.'));
  }

  async function updateWastage(item: JewelleryItem, value: string) {
    if (!user.permissions.includes('*') && !user.permissions.includes('billing.edit')) { setError('You do not have permission to override wastage.'); return; }
    if (!/^\d+(\.\d+)?$/.test(value) || Number(value) < 0) { setError('Enter a valid wastage percentage.'); return; }
    setBusy(true); setError('');
    try { await api.patch('/pos/cart/products/wastage', { product_item_id: item.id, wastage_percent: value }); await loadActiveCart(); }
    catch (reason: any) { setError(reason.response?.data?.error?.message || 'Enter a valid wastage percentage.'); }
    finally { setBusy(false); }
  }

  function clearCart() {
    if (!cart.length || !window.confirm('Clear every item from this active cart?')) return;
    void Promise.all(cart.map(item => api.delete(`/pos/cart/items/${(item as JewelleryItem & { cartLineId: string }).cartLineId}`))).then(loadActiveCart).catch(() => setError('Unable to clear the active cart.'));
  }

  async function completeSale() {
    if (!cart.length) return;
    setBusy(true);
    try {
      const amount = total.toFixed(2);
      const { data } = await api.post('/pos/cart/checkout', {
        customer_id: customer?.id || null,
        tax_rate_percent: '3',
        payments: [{ method: paymentMethod, amount }],
      });
      setInvoice(data);
      setCheckoutOpen(false);
      cartIds.current.clear();
      setCart([]);
      setQuotes({});
    } catch (reason: any) {
      if (reason.response?.status === 409) {
        setError('One or more jewellery items are no longer available. Your cart has been kept so you can correct it and retry.');
      } else setError(reason.response?.data?.error?.message || 'Checkout failed. Item availability and payment were not changed.');
    } finally {
      setBusy(false);
    }
  }

  const total = cart.reduce((sum, item) => sum + Number(quotes[item.id]?.breakdown.total || 0), 0);

  if (invoice) {
    return <ReceiptExperience invoice={invoice} onNewSale={() => setInvoice(null)} />;
  }

  return (
    <section className="billing">
      <div className="selling">
        <SearchBar query={query} setQuery={setQuery} onSearch={searchInventory} />
        <ProductResults items={results} busy={busy} searching={searching} error={lookupError} barcode={query} quote={results[0] ? quotes[results[0].id] : undefined} onClear={() => { setQuery(''); setResults([]); setLookupError(''); }} onAdd={addToCart} />
        <div className="context"><span><i /> Live branch inventory</span><span>Pricing is calculated and locked by the server</span></div>
        {error && <div className="notice error">{error}</div>}
      </div>
      <BillPanel customer={customer} openCustomer={() => setCustomerOpen(true)} removeCustomer={() => setCustomer(null)} cart={cart} quotes={quotes} total={total} busy={busy} canEdit={user.permissions.includes('*') || user.permissions.includes('billing.edit')} onIncrement={incrementGroup} onWastage={updateWastage} onRemove={removeFromCart} onRemoveGroup={removeGroup} onClear={clearCart} onEstimate={() => setEstimateOpen(true)} onCheckout={() => setCheckoutOpen(true)} />
      {checkoutOpen && <PaymentModal total={total} busy={busy} method={paymentMethod} setMethod={setPaymentMethod} onClose={() => setCheckoutOpen(false)} onConfirm={completeSale} />}
      {estimateOpen && <EstimateBillPreview cart={cart} quotes={quotes} customer={customer} user={user} onClose={() => setEstimateOpen(false)} />}
      <CustomerSelector open={customerOpen} onClose={() => setCustomerOpen(false)} onSelect={(selected) => { setCustomer(selected); setCustomerOpen(false); }} />
    </section>
  );
}

function SearchBar({ query, setQuery, onSearch }: { query: string; setQuery: (value: string) => void; onSearch: () => void }) {
  return <div className="scan"><ScanLine /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => ['Enter', 'F2'].includes(e.key) && onSearch()} placeholder="Scan or type barcode" /><button onClick={onSearch}><Search /> Search</button>{query && <button className="clear" onClick={() => setQuery('')}><X /></button>}</div>;
}

function LegacyProductResults({ items, busy, onAdd }: { items: JewelleryItem[]; busy: boolean; onAdd: (item: JewelleryItem) => void }) {
  return <div className="product-list">{items.map((item) => { const unavailable = item.available_count === 0 || item.availability_status === 'OUT_OF_STOCK'; return <article key={item.id}><div className="gem"><Gem /></div><div className="product-copy"><small>{item.sku || 'JEWELLERY'}</small><h3>{item.tag_number}</h3><p>{item.barcode}</p></div><div className="weights"><span>GROSS<b>{item.gross_weight} g</b></span><span>NET<b>{item.net_weight} g</b></span><span>FINE<b>{item.fine_weight} g</b></span></div><mark className={unavailable ? 'out-of-stock' : 'available'}>{unavailable ? 'OUT OF STOCK' : 'AVAILABLE'}</mark><button disabled={busy || unavailable} onClick={() => onAdd(item)}>Add to bill</button></article>})}{!items.length && <div className="search-empty"><ScanLine /><h3>Ready to scan</h3><p>Scan a jewellery barcode to validate availability and request authoritative pricing.</p><kbd>Enter</kbd></div>}</div>;
}

function ProductResults({ items, busy, searching, error, barcode, quote, onClear, onAdd }: { items: JewelleryItem[]; busy: boolean; searching: boolean; error: string; barcode: string; quote?: PriceQuote; onClear: () => void; onAdd: (item: JewelleryItem) => void }) {
  return <section className="scan-result"><div className="result-head"><div><h2>Product result</h2><p>Review the serialized piece before adding it to the bill.</p></div></div><div className="product-list">{searching ? <div className="search-empty"><ScanLine /><h3>Looking up barcode…</h3></div> : error ? <div className="search-empty result-error"><X /><h3>Product not found</h3><p>{error}</p><small>Barcode · {barcode}</small><button onClick={onClear}>Clear</button></div> : items.map(item => <article key={item.id}><div className="gem"><Gem /></div><div className="product-copy"><small>{item.sku || 'JEWELLERY'}</small><h3>{item.name || item.tag_number}</h3><p>Barcode · {item.barcode}</p>{item.huid && <p>HUID · {item.huid}</p>}<p>Purity · {item.purity}{item.fineness ? ` / ${Number(item.fineness).toFixed(0)}` : ''}</p></div><div className="weights"><span>GROSS WEIGHT<b>{item.gross_weight} g</b></span><span>NET WEIGHT<b>{item.net_weight} g</b></span><span>FINE GOLD<b>{item.fine_weight} g</b></span><span>WASTAGE<b>{item.wastage_percent || '0'}%</b></span><span>AVAILABLE<b>{item.available_count} pieces</b></span></div><dl className="result-price"><dt>Gold value</dt><dd>{formatMoney(quote?.breakdown.metal_value)}</dd><dt>Making</dt><dd>{formatMoney(quote?.breakdown.making_charge)}</dd><dt>GST</dt><dd>{formatMoney(quote?.breakdown.tax_amount)}</dd><dt>Estimate</dt><dd>{formatMoney(quote?.breakdown.total)}</dd></dl><mark className="available">AVAILABLE</mark><button disabled={busy || !quote} onClick={() => onAdd(item)}>Add to bill</button></article>)}{!searching && !error && !items.length && <div className="search-empty"><ScanLine /><h3>Ready to scan</h3><p>Scan a jewellery barcode or HUID to validate authoritative branch inventory.</p><kbd>Enter</kbd></div>}</div></section>;
}

function LegacyBillPanel({ customer, openCustomer, removeCustomer, cart, quotes, total, onRemove, onClear, onEstimate, onCheckout }: { customer: Customer | null; openCustomer: () => void; removeCustomer: () => void; cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; total: number; onRemove: (id: string) => void; onClear: () => void; onEstimate: () => void; onCheckout: () => void }) {
  return <aside className="bill-panel"><SelectedCustomerCard customer={customer} onOpen={openCustomer} onRemove={removeCustomer}/><div className="cart-title"><h2>Bill items</h2><b>{cart.length}</b></div><div className="cart">{cart.map((item) => { const price = quotes[item.id]?.breakdown; return <article key={item.id}><button aria-label={`Remove ${item.tag_number}`} onClick={() => onRemove(item.id)}><Trash2 /></button><small>{item.tag_number}</small><h3>{item.sku || 'Gold jewellery'}</h3><div><span>{item.net_weight} g net</span><b>{formatMoney(price?.total)}</b></div><dl><dt>Gold value</dt><dd>{formatMoney(price?.metal_value)}</dd><dt>Making</dt><dd>{formatMoney(price?.making_charge)}</dd><dt>GST</dt><dd>{formatMoney(price?.tax_amount)}</dd></dl></article>; })}{!cart.length && <div className="cart-empty"><Gem /><p>No items in this bill</p></div>}</div><div className="bill-total"><p><span>Items</span><b>{cart.length}</b></p><p><span>Estimated total</span><b>{formatMoney(total)}</b></p><small>Estimates use live rates. The final invoice is revalidated at checkout.</small><div><small>ESTIMATED GRAND TOTAL</small><strong>{formatMoney(total)}</strong></div><button className="estimate-button" disabled={!cart.length} onClick={onEstimate}><Eye /> View estimate</button><button disabled={!cart.length} onClick={onCheckout}><CreditCard /> Proceed to payment</button><nav><button disabled>Old gold</button><button disabled>Exchange</button><button onClick={onClear}>Clear</button></nav></div></aside>;
}

function BillPanel({ customer, openCustomer, removeCustomer, cart, quotes, total, busy, canEdit, onIncrement, onWastage, onRemove, onRemoveGroup, onClear, onEstimate, onCheckout }: { customer: Customer | null; openCustomer: () => void; removeCustomer: () => void; cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; total: number; busy: boolean; canEdit: boolean; onIncrement: (item: JewelleryItem) => void; onWastage: (item: JewelleryItem, value: string) => void; onRemove: (id: string) => void; onRemoveGroup: (productId: string) => void; onClear: () => void; onEstimate: () => void; onCheckout: () => void }) {
  const groups = Object.values((cart as CartItem[]).reduce((result, item) => { (result[item.product_id] ||= []).push(item); return result; }, {} as Record<string, CartItem[]>));
  const sum = (items: CartItem[], field: keyof JewelleryItem) => items.reduce((value, item) => value + Number(item[field] || 0), 0).toFixed(3);
  const wastageEditor = (item: CartItem) => canEdit
    ? <label className="wastage-input">Wastage <input key={item.wastage_percent ?? 'unset'} defaultValue={item.wastage_percent ?? ''} placeholder="Not configured" inputMode="decimal" onBlur={event => event.currentTarget.value && onWastage(item, event.currentTarget.value)} /> %</label>
    : <p>Wastage: {item.wastage_percent ?? 'Not configured'}</p>;
  return <aside className="bill-panel"><SelectedCustomerCard customer={customer} onOpen={openCustomer} onRemove={removeCustomer}/><div className="cart-title"><h2>Bill items</h2><b>{groups.length}</b></div><div className="cart">{groups.map(items => {
    const first = items[0]; const pricePart = (field: keyof PriceQuote['breakdown']) => items.reduce((value, item) => value + Number(quotes[item.id]?.breakdown[field] || 0), 0);
    return <article key={first.product_id}><button aria-label={`Remove ${first.sku || first.name}`} onClick={() => onRemoveGroup(first.product_id)}><Trash2 /></button><small>{first.sku || first.tag_number} · {first.purity}</small><h3>{first.name || first.sku || 'Gold jewellery'}</h3><div className="cart-quantity"><button aria-label="Decrease quantity" disabled={busy} onClick={() => items.length === 1 ? onRemoveGroup(first.product_id) : onRemove(items[items.length - 1].id)}><Minus /></button><b>{items.length}</b><button aria-label="Increase quantity" disabled={busy} onClick={() => onIncrement(first)}><Plus /></button></div><p>{items.length} physical piece{items.length === 1 ? '' : 's'} selected</p><small>{items.map(item => `${item.barcode}${item.huid ? ` / ${item.huid}` : ''}`).join(' · ')}</small><label className="wastage-input">Wastage <input key={first.wastage_percent} defaultValue={first.wastage_percent || '0'} inputMode="decimal" onBlur={event => onWastage(first, event.currentTarget.value)} /> %</label><dl><dt>Gross</dt><dd>{sum(items, 'gross_weight')} g</dd><dt>Net</dt><dd>{sum(items, 'net_weight')} g</dd><dt>Fine</dt><dd>{sum(items, 'fine_weight')} g</dd><dt>Gold value</dt><dd>{formatMoney(pricePart('metal_value'))}</dd><dt>Making</dt><dd>{formatMoney(pricePart('making_charge'))}</dd><dt>Wastage</dt><dd>{formatMoney(pricePart('wastage_value'))}</dd><dt>GST</dt><dd>{formatMoney(pricePart('tax_amount'))}</dd><dt>Line total</dt><dd>{formatMoney(pricePart('total'))}</dd></dl></article>;
  })}{!cart.length && <div className="cart-empty"><Gem /><p>No items in this bill</p></div>}</div><div className="bill-total"><p><span>Physical pieces</span><b>{cart.length}</b></p><p><span>Estimated total</span><b>{formatMoney(total)}</b></p><small>Each quantity unit is a distinct serialized jewellery item.</small><div><small>ESTIMATED GRAND TOTAL</small><strong>{formatMoney(total)}</strong></div><button className="estimate-button" disabled={!cart.length} onClick={onEstimate}><Eye /> View estimate</button><button disabled={!cart.length} onClick={onCheckout}><CreditCard /> Proceed to payment</button><nav><button disabled>Old gold</button><button disabled>Exchange</button><button onClick={onClear}>Clear</button></nav></div></aside>;
}

function PaymentModal({ total, busy, method, setMethod, onClose, onConfirm }: { total: number; busy: boolean; method: string; setMethod: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal"><div><button className="modal-x" onClick={onClose}><X /></button><small>SECURE CHECKOUT</small><h2>Collect payment</h2><p>Final price and availability are revalidated atomically by the backend.</p><div className="pay-total"><span>Amount due</span><b>{formatMoney(total)}</b></div><label>Payment method<select value={method} onChange={(e) => setMethod(e.target.value)}><option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option></select></label><button disabled={busy} onClick={onConfirm}>{busy ? 'Processing…' : 'Confirm sale'}</button></div></div>;
}
