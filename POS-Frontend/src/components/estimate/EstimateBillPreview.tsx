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
  const download = async () => {
    const element = document.getElementById('estimated-bill-pdf');
    if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) { setPdfError('The estimate is not ready for PDF export. Please try again.'); return; }
    setCreatingPdf(true); setPdfError('');
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const canvas = await html2canvas(element, { backgroundColor: '#fffdf7', scale: 2, useCORS: true, logging: false, windowWidth: element.offsetWidth, windowHeight: element.offsetHeight });
      if (!canvas.width || !canvas.height) throw new Error('The estimate PDF canvas is empty.');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const pageWidth = 210, pageHeight = 297;
      // One estimate is deliberately exported as one A4 page. Scale proportionally so the
      // complete shared document fits without cropping or generating an empty overflow page.
      const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const renderedWidth = canvas.width * scale, renderedHeight = canvas.height * scale;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - renderedWidth) / 2, (pageHeight - renderedHeight) / 2, renderedWidth, renderedHeight, undefined, 'FAST');
      pdf.save(`POS-GOLD-ESTIMATE-${data.estimateNumber}.pdf`);
    } catch (error) { console.error('Unable to generate Estimated Bill PDF', error); setPdfError('Unable to generate the Estimated Bill PDF. Please try again.'); }
    finally { setCreatingPdf(false); }
  };
  return <div className="estimate-overlay" role="dialog" aria-modal="true" aria-label="Price estimate"><header className="estimate-controls"><div><small>POS GOLD · JEWELLERY COUNTER</small><h2>Price estimate</h2></div><nav><button onClick={() => window.print()}><Printer /> Print estimate</button><button disabled={creatingPdf} onClick={download}><Download /> {creatingPdf ? 'Preparing PDF…' : 'Download PDF'}</button><button onClick={onClose}><X /> Back to bill</button></nav></header>{pdfError && <p className="estimate-pdf-error" role="alert">{pdfError}</p>}<main className="estimate-stage"><div className="estimate-print-root"><EstimatedBillDocument data={data} /></div></main><div id="estimated-bill-pdf" className="estimate-pdf-renderer" aria-hidden="true"><EstimatedBillDocument data={data} /></div></div>;
}
