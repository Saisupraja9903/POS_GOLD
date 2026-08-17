import { useEffect, useRef, useState } from 'react';
import { CreditCard, Eye, Gem, ScanLine, Search, Trash2, X } from 'lucide-react';
import { api } from '../auth';
import type { JewelleryItem, PriceQuote } from '../types';
import { formatMoney } from '../utils/format';
import '../styles/billing.css';
import { CustomerSelector, SelectedCustomerCard } from '../components/customers/CustomerSelector';
import type { Customer } from '../types/customer';
import { ReceiptExperience } from '../components/receipt/ReceiptExperience';

export function BillingPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JewelleryItem[]>([]);
  const [cart, setCart] = useState<JewelleryItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, PriceQuote>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
      const priced = await Promise.all(items.map(async item => [item.id, (await api.post<PriceQuote>('/sales/quote', { item_id: item.id, tax_rate_percent: '3' })).data] as const));
      setCart(items);
      setQuotes(Object.fromEntries(priced));
    } catch (reason: any) { setError(reason.response?.data?.error?.message || 'Unable to load the active cart.'); }
  }

  useEffect(() => { void loadActiveCart(); }, []);

  async function searchInventory() {
    if (!query.trim()) return;
    setError('');
    try {
      const { data } = await api.get('/jewellery', { params: { barcode: query.trim() } });
      const found = data.filter((item: JewelleryItem) => ['SHOP', 'SHOP_OWNED'].includes(item.ownership) && item.available_count > 0);
      setResults(found);
      if (found.length === 1) await addToCart(found[0]);
    } catch {
      setError('Unable to search branch inventory.');
    }
  }

  async function addToCart(item: JewelleryItem) {
    if (cartIds.current.has(item.id) || addingIds.current.has(item.id)) return;
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
        <div className="context"><span><i /> Live branch inventory</span><span>Pricing is calculated and locked by the server</span></div>
        {error && <div className="notice error">{error}</div>}
        <div className="result-head"><div><h2>Product results</h2><p>Only sellable items assigned to this branch are shown.</p></div><b>{results.length} found</b></div>
        <ProductResults items={results} busy={busy} onAdd={addToCart} />
      </div>
      <BillPanel customer={customer} openCustomer={() => setCustomerOpen(true)} removeCustomer={() => setCustomer(null)} cart={cart} quotes={quotes} total={total} onRemove={removeFromCart} onClear={clearCart} onEstimate={() => setEstimateOpen(true)} onCheckout={() => setCheckoutOpen(true)} />
      {checkoutOpen && <PaymentModal total={total} busy={busy} method={paymentMethod} setMethod={setPaymentMethod} onClose={() => setCheckoutOpen(false)} onConfirm={completeSale} />}
      {estimateOpen && <EstimatePreview cart={cart} quotes={quotes} total={total} customer={customer} onClose={() => setEstimateOpen(false)} />}
      <CustomerSelector open={customerOpen} onClose={() => setCustomerOpen(false)} onSelect={(selected) => { setCustomer(selected); setCustomerOpen(false); }} />
    </section>
  );
}

function SearchBar({ query, setQuery, onSearch }: { query: string; setQuery: (value: string) => void; onSearch: () => void }) {
  return <div className="scan"><ScanLine /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} placeholder="Scan barcode, then press Enter to add" /><button onClick={onSearch}><Search /> Add</button>{query && <button className="clear" onClick={() => setQuery('')}><X /></button>}</div>;
}

function ProductResults({ items, busy, onAdd }: { items: JewelleryItem[]; busy: boolean; onAdd: (item: JewelleryItem) => void }) {
  return <div className="product-list">{items.map((item) => { const unavailable = item.available_count === 0 || item.availability_status === 'OUT_OF_STOCK'; return <article key={item.id}><div className="gem"><Gem /></div><div className="product-copy"><small>{item.sku || 'JEWELLERY'}</small><h3>{item.tag_number}</h3><p>{item.barcode}</p></div><div className="weights"><span>GROSS<b>{item.gross_weight} g</b></span><span>NET<b>{item.net_weight} g</b></span><span>FINE<b>{item.fine_weight} g</b></span></div><mark className={unavailable ? 'out-of-stock' : 'available'}>{unavailable ? 'OUT OF STOCK' : 'AVAILABLE'}</mark><button disabled={busy || unavailable} onClick={() => onAdd(item)}>Add to bill</button></article>})}{!items.length && <div className="search-empty"><ScanLine /><h3>Ready to scan</h3><p>Scan a jewellery barcode to validate availability and request authoritative pricing.</p><kbd>Enter</kbd></div>}</div>;
}

function BillPanel({ customer, openCustomer, removeCustomer, cart, quotes, total, onRemove, onClear, onEstimate, onCheckout }: { customer: Customer | null; openCustomer: () => void; removeCustomer: () => void; cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; total: number; onRemove: (id: string) => void; onClear: () => void; onEstimate: () => void; onCheckout: () => void }) {
  return <aside className="bill-panel"><SelectedCustomerCard customer={customer} onOpen={openCustomer} onRemove={removeCustomer}/><div className="cart-title"><h2>Bill items</h2><b>{cart.length}</b></div><div className="cart">{cart.map((item) => { const price = quotes[item.id]?.breakdown; return <article key={item.id}><button aria-label={`Remove ${item.tag_number}`} onClick={() => onRemove(item.id)}><Trash2 /></button><small>{item.tag_number}</small><h3>{item.sku || 'Gold jewellery'}</h3><div><span>{item.net_weight} g net</span><b>{formatMoney(price?.total)}</b></div><dl><dt>Gold value</dt><dd>{formatMoney(price?.metal_value)}</dd><dt>Making</dt><dd>{formatMoney(price?.making_charge)}</dd><dt>GST</dt><dd>{formatMoney(price?.tax_amount)}</dd></dl></article>; })}{!cart.length && <div className="cart-empty"><Gem /><p>No items in this bill</p></div>}</div><div className="bill-total"><p><span>Items</span><b>{cart.length}</b></p><p><span>Estimated total</span><b>{formatMoney(total)}</b></p><small>Estimates use live rates. The final invoice is revalidated at checkout.</small><div><small>ESTIMATED GRAND TOTAL</small><strong>{formatMoney(total)}</strong></div><button className="estimate-button" disabled={!cart.length} onClick={onEstimate}><Eye /> View estimate</button><button disabled={!cart.length} onClick={onCheckout}><CreditCard /> Proceed to payment</button><nav><button disabled>Old gold</button><button disabled>Exchange</button><button onClick={onClear}>Clear</button></nav></div></aside>;
}

function EstimatePreview({ cart, quotes, total, customer, onClose }: { cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; total: number; customer: Customer | null; onClose: () => void }) {
  return <div className="modal estimate-modal" role="dialog" aria-modal="true" aria-label="Estimated billing slip"><div><button className="modal-x" aria-label="Close estimate" onClick={onClose}><X /></button><small>ESTIMATED BILLING SLIP</small><h2>Provisional estimate</h2><p>{customer ? `Prepared for ${customer.name}` : 'Customer not selected'}</p><div className="estimate-lines">{cart.map((item, index) => <p key={item.id}><span>{index + 1}. {item.tag_number}<small>{item.net_weight} g net</small></span><b>{formatMoney(quotes[item.id]?.breakdown.total)}</b></p>)}</div><div className="pay-total"><span>Estimated total</span><b>{formatMoney(total)}</b></div><p className="estimate-note">This is not a tax invoice. Rates, availability, and final total are confirmed during payment.</p><button onClick={onClose}>Back to bill</button></div></div>;
}


function PaymentModal({ total, busy, method, setMethod, onClose, onConfirm }: { total: number; busy: boolean; method: string; setMethod: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal"><div><button className="modal-x" onClick={onClose}><X /></button><small>SECURE CHECKOUT</small><h2>Collect payment</h2><p>Final price and availability are revalidated atomically by the backend.</p><div className="pay-total"><span>Amount due</span><b>{formatMoney(total)}</b></div><label>Payment method<select value={method} onChange={(e) => setMethod(e.target.value)}><option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option></select></label><button disabled={busy} onClick={onConfirm}>{busy ? 'Processing…' : 'Confirm sale'}</button></div></div>;
}
