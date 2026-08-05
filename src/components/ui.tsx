import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>{children}</div>;
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={`block text-sm font-semibold text-gray-500 mt-3 mb-1 first:mt-0 ${props.className ?? ''}`}
    />
  );
}

const fieldClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} min-h-[70px] resize-y ${props.className ?? ''}`} />;
}

const selectArrow =
  "bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27%236b7280%27%3E%3Cpath%20fill-rule=%27evenodd%27%20d=%27M5.23%207.21a.75.75%200%20011.06.02L10%2010.94l3.71-3.71a.75.75%200%20111.06%201.06l-4.24%204.25a.75.75%200%2001-1.06%200L5.21%208.29a.75.75%200%2001.02-1.08z%27%20clip-rule=%27evenodd%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:18px] pr-9 appearance-none";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  props,
  ref
) {
  return <select {...props} ref={ref} className={`${fieldClass} ${selectArrow} ${props.className ?? ''}`} />;
});

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-500 text-white active:bg-brand-600',
    secondary: 'bg-gray-200 text-gray-800',
    danger: 'bg-red-100 text-red-600',
  };
  return (
    <button
      {...props}
      className={`rounded-lg font-semibold px-4 py-2.5 text-sm disabled:opacity-50 transition-colors ${variants[variant]} ${className}`}
    />
  );
}

type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-200 text-gray-600',
  };
  return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-center text-gray-400 text-sm py-6">{children}</div>;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`h-6 w-6 rounded-full border-4 border-gray-200 border-t-brand-500 animate-spin ${className}`} />
  );
}

export function formatBRL(valor: number | null | undefined): string {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateBR(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export function todayISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}
