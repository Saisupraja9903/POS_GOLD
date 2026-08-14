import type { ReactNode } from 'react';
import { Gem } from 'lucide-react';
import '../styles/page.css';

interface PageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function Page({ title, subtitle, children }: PageProps) {
  return (
    <section className="pos-page">
      <div className="page-title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="page-empty"><Gem /><p>{text}</p></div>;
}

export function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return <div className="page-empty error"><p>{text}</p><button onClick={retry}>Retry</button></div>;
}

export function UnavailableState({ text }: { text: string }) {
  return (
    <div className="unavailable">
      <span>NOT AVAILABLE</span>
      <h3>Workflow protected</h3>
      <p>{text}</p>
    </div>
  );
}
