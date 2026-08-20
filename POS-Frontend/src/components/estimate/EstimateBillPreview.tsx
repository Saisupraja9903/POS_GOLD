import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Printer, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { JewelleryItem, PosUser, PriceQuote } from '../../types';
import type { Customer } from '../../types/customer';
import '../../styles/estimate.css';
import { createEstimatedBillData, EstimatedBillDocument } from './EstimatedBillDocument';

export function EstimateBillPreview({ cart, quotes, customer, user, onClose }: { cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; customer: Customer | null; user: PosUser; onClose: () => void }) {
  const [data] = useState(() => createEstimatedBillData({ cart, quotes, customer, user }));
  const [pdfError, setPdfError] = useState('');
  const [creatingPdf, setCreatingPdf] = useState(false);

  const print = () => {
    const estimate = document.querySelector<HTMLElement>('.estimate-print-root .estimate-print-document');
    const root = estimate?.parentElement;
    if (!estimate || !root) return;
    // Preserve the screen receipt design and reduce it only enough to fit one A4 page.
    root.style.setProperty('--estimate-print-scale', String(Math.min(1, 1020 / estimate.offsetHeight)));
    const pageStyle = document.createElement('style');
    pageStyle.textContent = '@page { size: A4 portrait; margin: 0; }';
    document.head.append(pageStyle);
    document.body.classList.add('printing-estimate');
    const restore = () => {
      document.body.classList.remove('printing-estimate');
      pageStyle.remove();
    };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
  };

  const download = async () => {
    const element = document.getElementById('estimated-bill-pdf');
    if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) { setPdfError('The estimate is not ready for PDF export. Please try again.'); return; }
    setCreatingPdf(true); setPdfError('');
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const canvas = await html2canvas(element, { backgroundColor: '#fffdf7', scale: 2, useCORS: true, logging: false, windowWidth: element.offsetWidth, windowHeight: element.offsetHeight });
      if (!canvas.width || !canvas.height) throw new Error('The estimate PDF canvas is empty.');
      const pageWidth = 80;
      const pageHeight = (canvas.height / canvas.width) * pageWidth;
      const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight], orientation: 'portrait', compress: true });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      pdf.save(`POS-GOLD-ESTIMATE-${data.estimateNumber}.pdf`);
    } catch (error) { console.error('Unable to generate Estimated Bill PDF', error); setPdfError('Unable to generate the Estimated Bill PDF. Please try again.'); }
    finally { setCreatingPdf(false); }
  };

  return <div className="estimate-overlay" role="dialog" aria-modal="true" aria-label="Price estimate">
    <header className="estimate-controls"><div><small>POS GOLD · JEWELLERY COUNTER</small><h2>Price estimate</h2></div><nav>
      <button onClick={print}><Printer /> Print estimate</button>
      <button disabled={creatingPdf} onClick={download}><Download /> {creatingPdf ? 'Preparing PDF…' : 'Download PDF'}</button>
      <button onClick={onClose}><X /> Back to bill</button>
    </nav></header>
    {pdfError && <p className="estimate-pdf-error" role="alert">{pdfError}</p>}
    <main className="estimate-stage"><div className="estimate-print-root"><EstimatedBillDocument data={data} /></div></main>
    <div id="estimated-bill-pdf" className="estimate-pdf-renderer" aria-hidden="true"><EstimatedBillDocument data={data} /></div>
  </div>;
}
