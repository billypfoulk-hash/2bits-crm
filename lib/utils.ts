import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DeliverableStatus, PipelineStage } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const STATUS_CONFIG: Record<DeliverableStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'bg-zinc-700 text-zinc-300' },
  in_progress: { label: 'In Progress', color: 'bg-blue-900/60 text-blue-300' },
  in_review: { label: 'In Review', color: 'bg-amber-900/60 text-amber-300' },
  approved: { label: 'Approved', color: 'bg-emerald-900/60 text-emerald-300' },
  posted: { label: 'Posted', color: 'bg-purple-900/60 text-purple-300' },
};

export const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-zinc-700 text-zinc-300' },
  in_talks: { label: 'In Talks', color: 'bg-blue-900/60 text-blue-300' },
  contract: { label: 'Contract', color: 'bg-amber-900/60 text-amber-300' },
  active: { label: 'Active', color: 'bg-emerald-900/60 text-emerald-300' },
  completed: { label: 'Completed', color: 'bg-purple-900/60 text-purple-300' },
};
