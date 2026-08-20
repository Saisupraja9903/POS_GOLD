import { Gem } from 'lucide-react';
import { formatMoney } from '../../utils/format';

export const isInvoicePrintable = (invoice: any) => Boolean(invoice?.id && invoice?.invoice_number && invoice?.total != null && Array.isArray(invoice?.items) && invoice.items.length);

export function InvoiceDocument({ invoice, business }: { invoice: any; business: any }) {
  return <PhysicalInvoiceDocument invoice={{ ...invoice, items: groupInvoiceItems(invoice.items || []) }} business={business} />;
}

function PhysicalInvoiceDocument({ invoice, business }: { invoice: any; business: any }) {
  const date = new Date(invoice.invoice_date);
  const price = totalPriceBreakdown(invoice.items?.map((item: any) => item.price) || [invoice.snapshot?.price || {}]);
  return <article className="invoice-print-document" data-invoice-id={invoice.id}>
    <header className="invoice-shop"><span className="invoice-logo"><Gem /></span><div className="invoice-business"><small>FINE JEWELLERY</small><h1>{business?.business_name || invoice.branch}</h1><p>Jewellery &amp; Precious Metals</p></div><div className="invoice-title"><small>TAX INVOICE</small><b>{invoice.invoice_number}</b><mark>{invoice.payment_status || 'PAID'}</mark></div></header>
    <section className="invoice-meta"><div><small>INVOICE DATE</small><b>{date.toLocaleDateString('en-IN', { dateStyle: 'medium' })}</b></div><div><small>TIME</small><b>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></div><div><small>BRANCH</small><b>{invoice.branch}</b></div>{(invoice.salesperson_name || invoice.salesperson_id) && <div><small>SALES PERSON</small><b>{invoice.salesperson_name || invoice.salesperson_id}</b></div>}</section>
    {invoice.customer && <section className="invoice-parties"><div><small>CUSTOMER</small><b>{invoice.customer.name}</b>{invoice.customer.phone && <span>Phone · {invoice.customer.phone}</span>}</div></section>}
    <section className="invoice-items-print"><div className="invoice-section-title"><h2>Jewellery details</h2><span>{invoice.items.length} serialized item{invoice.items.length === 1 ? '' : 's'}</span></div><table><thead><tr><th>#</th><th>Item</th><th>Identification</th><th>Gross</th><th>Stone</th><th>Net</th><th>Fine</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{invoice.items.map((item: any, index: number) => <tr className="invoice-item-row" key={item.id}><td>{index + 1}</td><td><b>{item.name}</b>{item.huid && <small>HUID · {item.huid}</small>}</td><td><b>Tag · {item.tag_number}</b><small>Barcode · {item.barcode}</small><small>Product ID · {item.id}</small></td><td>{item.gross_weight} g</td><td>{item.stone_weight} g</td><td>{item.net_weight} g</td><td>{item.fine_weight} g</td><td>{item.rate?.rate_per_gram != null ? `${formatMoney(item.rate.rate_per_gram)} / g` : '—'}</td><td><b>{formatMoney(item.line_total)}</b></td></tr>)}</tbody></table></section>
    <div className="invoice-bottom"><section className="invoice-payments"><h2>Payment</h2>{invoice.payments.map((payment: any, index: number) => <p key={`${payment.method}-${index}`}><span>{payment.method}{payment.reference ? ` · ${payment.reference}` : ''}</span><b>{formatMoney(payment.amount)}</b></p>)}<p className="paid"><span>Total paid</span><b>{formatMoney(invoice.amount_paid)}</b></p><p><span>Balance</span><b>{formatMoney(invoice.balance)}</b></p></section><section className="invoice-totals"><h2>Invoice summary</h2>{price.metal_value != null && <p><span>Metal value</span><b>{formatMoney(price.metal_value)}</b></p>}{price.making_charge != null && <p><span>Making charges</span><b>{formatMoney(price.making_charge)}</b></p>}{price.wastage_value != null && <p><span>Wastage</span><b>{formatMoney(price.wastage_value)}</b></p>}{price.other_charges != null && Number(price.other_charges) > 0 && <p><span>Other charges</span><b>{formatMoney(price.other_charges)}</b></p>}{price.discount != null && Number(price.discount) > 0 && <p><span>Discount</span><b>− {formatMoney(price.discount)}</b></p>}{price.subtotal != null && <p><span>Subtotal</span><b>{formatMoney(price.subtotal)}</b></p>}{price.tax_amount != null && <p><span>GST</span><b>{formatMoney(price.tax_amount)}</b></p>}<p className="invoice-grand"><span>Total</span><b>{formatMoney(invoice.total)}</b></p></section></div>
    <footer><div><p>Thank you for choosing {business?.business_name || invoice.branch}.</p><small>We appreciate your business.</small></div><div><b>Authorised invoice</b><small>Computer-generated document · {invoice.invoice_number}</small></div></footer>
  </article>;
}

function groupInvoiceItems(items: any[]) {
  return Object.values(items.reduce((groups, item) => {
    const key = item.product_id || `${item.name}:${item.rate?.purity_id || ''}`;
    if (!groups[key]) groups[key] = { ...item, id: key, quantity: 1, physical_ids: [item.id] };
    else {
      const group = groups[key]; group.quantity += 1; group.physical_ids.push(item.id);
      group.tag_number = `${group.tag_number}, ${item.tag_number}`; group.barcode = `${group.barcode}, ${item.barcode}`;
      if (item.huid) group.huid = group.huid ? `${group.huid}, ${item.huid}` : item.huid;
      for (const field of ['gross_weight', 'stone_weight', 'net_weight', 'fine_weight', 'line_total']) group[field] = String(Number(group[field] || 0) + Number(item[field] || 0));
      for (const field of ['metal_value', 'making_charge', 'wastage_value', 'other_charges', 'discount', 'subtotal', 'tax_amount', 'total']) group.price[field] = String(Number(group.price?.[field] || 0) + Number(item.price?.[field] || 0));
    }
    return groups;
  }, {} as Record<string, any>));
}

function totalPriceBreakdown(prices: any[]) {
  const fields = ['metal_value', 'making_charge', 'wastage_value', 'other_charges', 'discount', 'subtotal', 'tax_amount'];
  return prices.reduce((total, price) => {
    for (const field of fields) total[field] = Number(total[field] || 0) + Number(price?.[field] || 0);
    return total;
  }, {} as Record<string, number>);
}
