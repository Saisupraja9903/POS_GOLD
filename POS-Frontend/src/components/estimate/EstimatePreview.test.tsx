import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PosUser } from '../../types';
import { createEstimatedBillData, EstimatedBillDocument } from './EstimatedBillDocument';
import { EstimateBillPreview } from './EstimateBillPreview';

const user: PosUser = { full_name: 'Asha Verma', email: 'asha@aurum.in', business_name: 'Aurum Jewellers', branch_name: 'Main Branch', role: { name: 'Cashier', code: 'cashier' }, permissions: ['billing.view'] };
const cart = [{ id: 'ring-1', product_id: 'flower-ring', name: 'Flower Ring', tag_number: 'FR-1001', barcode: 'BR1001', purity: '22K / 916', gross_weight: '12.300', stone_weight: '2.100', net_weight: '10.200', fine_weight: '8.910', wastage_percent: '10', status: 'AVAILABLE', available_count: 2, availability_status: 'AVAILABLE' as const, ownership: 'BRANCH' }, { id: 'ring-2', product_id: 'flower-ring', name: 'Flower Ring', tag_number: 'FR-1002', barcode: 'BR1002', purity: '22K / 916', gross_weight: '10.000', stone_weight: '1.000', net_weight: '9.000', fine_weight: '7.900', wastage_percent: '10', status: 'AVAILABLE', available_count: 2, availability_status: 'AVAILABLE' as const, ownership: 'BRANCH' }, { id: 'chain-1', product_id: 'gold-chain', name: 'Gold Chain', tag_number: 'GC-2001', barcode: 'GC2001', purity: '22K / 916', gross_weight: '18.500', stone_weight: '0.400', net_weight: '18.100', fine_weight: '16.110', wastage_percent: '8', status: 'AVAILABLE', available_count: 1, availability_status: 'AVAILABLE' as const, ownership: 'BRANCH' }];
const quotes = Object.fromEntries(cart.map(item => [item.id, { rate_per_gram: '7000', breakdown: { metal_value: '60000', making_charge: '1200', wastage_value: '6000', discount: '0', subtotal: '67200', tax_amount: '1344', total: '68544' } }]));

describe('estimated bill document', () => {
  it('groups quantity by design in the one reusable document', () => {
    const data = createEstimatedBillData({ cart, quotes, customer: { name: 'Riya Shah', phone: '9876543210' }, user, issuedAt: new Date('2026-08-18T10:00:00Z') });
    render(<EstimatedBillDocument data={data} />);
    expect(screen.getAllByText(/^EST-/)).toHaveLength(2);
    expect(screen.getByText('PRODUCT DETAILS')).toBeInTheDocument();
    expect(screen.getAllByText('Flower Ring')).toHaveLength(1);
    expect(screen.getByText('Stone charges')).toBeInTheDocument();
    expect(screen.getByText(/please retain this estimate for reference/i)).toBeInTheDocument();
  });

  it('prints the rendered shared document', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<EstimateBillPreview cart={cart} quotes={quotes} customer={null} user={user} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /print estimate/i }));
    expect(print).toHaveBeenCalledOnce();
    expect(document.querySelector('.estimate-print-document')).toBeInTheDocument();
    print.mockRestore();
  });
});
