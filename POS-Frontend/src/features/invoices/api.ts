import { api } from '../../auth';
export const invoiceApi={list:(params:Record<string,unknown>)=>api.get('/pos/invoices',{params}),detail:(id:string)=>api.get(`/pos/invoices/${id}`)};
