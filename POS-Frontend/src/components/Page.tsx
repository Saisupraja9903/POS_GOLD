import type { ReactNode } from 'react';
import { Gem } from 'lucide-react';

interface PageProps { title: string; subtitle: string; children: ReactNode; }

export function Page({ title, subtitle, children }: PageProps) {
  return <section className="mx-auto max-w-[1350px] p-7">
    <div className="mb-[22px]"><h2 className="m-0 font-['Cormorant_Garamond'] text-[24px] font-bold">{title}</h2><p className="my-1 text-[11px] text-[#82847f]">{subtitle}</p></div>
    {children}
  </section>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="p-[110px_20px] text-center text-[#8a8e87]"><Gem className="text-[#83733f]" /><p>{text}</p></div>;
}

export function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return <div className="p-[110px_20px] text-center text-[#a22]"><p>{text}</p><button className="mx-auto mt-3 flex gap-[7px] border-0 bg-[#c2a144] px-[14px] py-[10px]" onClick={retry}>Retry</button></div>;
}

export function UnavailableState({ text }: { text: string }) {
  return <div className="mt-[18px] max-w-[640px] border border-[#e7e4dc] bg-white p-6"><span className="text-[9px] tracking-[1px] text-[#c19f43]">NOT AVAILABLE</span><h3 className="mb-[6px]">Workflow protected</h3><p className="text-[11px] text-[#82847f]">{text}</p></div>;
}
