import type { JewelleryItem, PosUser, PriceQuote } from '../../types';
import { formatMoney } from '../../utils/format';

type CartItem = JewelleryItem & { product_id?: string; name?: string; wastage_percent?: string | null };
export interface EstimatedBillData { estimateNumber: string; issuedAt: Date; customer: { name?: string; phone?: string; email?: string | null } | null; salesperson: string; branch: string; items: Array<{ id: string; name: string; purity: string; quantity: number; grossWeight: number; stoneWeight: number; netWeight: number; fineGold: number; wastage: string; goldRate: number; makingCharges: number; gst: number; total: number }>; weights: { totalItems: number; totalQuantity: number; gross: number; net: number; fine: number }; pricing: { goldValue: number; wastage: number; makingCharges: number; stoneCharges: number; discount: number; taxableValue: number; gst: number; total: number } }
const number = (value: unknown) => Number(value || 0);

export function createEstimatedBillData({ cart, quotes, customer, user, issuedAt = new Date() }: { cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; customer: EstimatedBillData['customer']; user: PosUser; issuedAt?: Date }): EstimatedBillData {
  const groups = Object.values((cart as CartItem[]).reduce((all, item) => { const key = item.product_id || item.id; (all[key] ||= []).push(item); return all; }, {} as Record<string, CartItem[]>));
  const sum = (items: CartItem[], field: keyof JewelleryItem) => items.reduce((total, item) => total + number(item[field]), 0);
  const amount = (items: CartItem[], field: keyof PriceQuote['breakdown']) => items.reduce((total, item) => total + number(quotes[item.id]?.breakdown[field]), 0);
  const all = cart as CartItem[];
  const items = groups.map(group => { const first = group[0]; return { id: first.product_id || first.id, name: first.name || first.sku || 'Gold jewellery', purity: first.purity || '—', quantity: group.length, grossWeight: sum(group, 'gross_weight'), stoneWeight: sum(group, 'stone_weight'), netWeight: sum(group, 'net_weight'), fineGold: sum(group, 'fine_weight'), wastage: first.wastage_percent ?? 'Not configured', goldRate: number(quotes[first.id]?.rate_per_gram), makingCharges: amount(group, 'making_charge'), gst: amount(group, 'tax_amount'), total: amount(group, 'total') }; });
  const pricing = { goldValue: amount(all, 'metal_value'), wastage: all.reduce((total, item) => total + number(quotes[item.id]?.breakdown.wastage_value ?? quotes[item.id]?.breakdown.wastage_charge), 0), makingCharges: amount(all, 'making_charge'), stoneCharges: amount(all, 'stone_value'), discount: amount(all, 'discount'), taxableValue: amount(all, 'subtotal'), gst: amount(all, 'tax_amount'), total: amount(all, 'total') };
  return { estimateNumber: `EST-${issuedAt.getTime().toString(36).toUpperCase()}`, issuedAt, customer, salesperson: user.full_name, branch: user.branch_name || '—', items, weights: { totalItems: items.length, totalQuantity: all.length, gross: sum(all, 'gross_weight'), net: sum(all, 'net_weight'), fine: sum(all, 'fine_weight') }, pricing };
}

export function EstimatedBillDocument({ data }: { data: EstimatedBillData }) {
  const priceRows: Array<[string, number, boolean?]> = [['Gold value', data.pricing.goldValue], ['Wastage', data.pricing.wastage], ['Making charges', data.pricing.makingCharges], ['Stone charges', data.pricing.stoneCharges], ['Discount', data.pricing.discount, true], ['Taxable value', data.pricing.taxableValue], ['GST', data.pricing.gst]];
  return <article className="estimate-print-document" data-estimate-id={data.estimateNumber}>
    <header className="quotation-hero"><h1>POS GOLD</h1></header>
    <section className="estimate-meta"><div><b>PRICE ESTIMATE</b><span>{data.issuedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>{data.issuedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div><div><span>{data.estimateNumber}</span><span>Staff #{data.salesperson}</span><span>{data.branch}</span></div></section>
    <section className="quotation-customer"><b>{data.customer ? `Customer: ${data.customer.name || 'Walk-in Customer'}` : 'Walk-in Customer'}</b>{data.customer?.phone && <span>{data.customer.phone}</span>}</section>
    <section className="quotation-items"><header><b>PRODUCT DETAILS</b><span>{data.weights.totalQuantity} item{data.weights.totalQuantity === 1 ? '' : 's'}</span></header>{data.items.map((item, index) => <article className="quotation-item" key={item.id}><header><span>{index + 1}.</span><div><h3>{item.name}</h3><p>{item.purity} · Qty {item.quantity}</p></div><strong>{formatMoney(item.total)}</strong></header><div className="quotation-facts"><Fact label="Gross" value={`${item.grossWeight.toFixed(3)} g`} /><Fact label="Stone" value={`${item.stoneWeight.toFixed(3)} g`} /><Fact label="Net" value={`${item.netWeight.toFixed(3)} g`} /><Fact label="Fine gold" value={`${item.fineGold.toFixed(3)} g`} /><Fact label="Wastage" value={item.wastage === 'Not configured' ? item.wastage : `${item.wastage}%`} /><Fact label="Gold rate" value={item.goldRate ? `${formatMoney(item.goldRate)} / g` : '—'} /><Fact label="Making" value={formatMoney(item.makingCharges)} /><Fact label="GST" value={formatMoney(item.gst)} /></div></article>)}</section>
    <section className="quotation-price-summary">{priceRows.map(([label, value, negative]) => <p key={label}><span>{label}</span><b>{negative ? '− ' : ''}{formatMoney(value)}</b></p>)}<p className="quotation-grand"><span>Estimated total</span><b>{formatMoney(data.pricing.total)}</b></p></section>
    <footer className="quotation-note"><Barcode value={data.estimateNumber} /><b>{data.estimateNumber}</b><p>Please retain this estimate for reference. Final price is confirmed at billing.</p><small>Computer Generated Estimate</small></footer>
  </article>;
}
function Fact({ label, value }: { label: string; value: string | number }) { return <p><span>{label}</span><b>{value}</b></p>; }
function Barcode({ value }: { value: string }) {
  const widths = [...value].flatMap(character => {
    const code = character.charCodeAt(0);
    return [1 + (code % 3), 1 + ((code >> 2) % 3), 1 + ((code >> 4) % 3), 1 + ((code >> 1) % 2)];
  });
  let x = 3;
  return <svg className="receipt-barcode" role="img" aria-label={`Barcode for ${value}`} viewBox="0 0 100 28" preserveAspectRatio="none">
    <title>Barcode for {value}</title>
    <rect x="0" y="0" width="100" height="28" fill="#fff" />
    {widths.map((width, index) => { const bar = <rect key={index} x={x} y="0" width={width} height="28" fill="#111" />; x += width + 1; return bar; })}
  </svg>;
}
