import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateShort(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'ADMIN': return 'badge-admin';
    case 'COACH': return 'badge-coach';
    case 'CAPTAIN': return 'badge-captain';
    default: return 'badge-player';
  }
}

export function getRoleLabel(role: string) {
  switch (role) {
    case 'SPORTS_OFFICER': return 'Sports Officer';
    default: return role.charAt(0) + role.slice(1).toLowerCase();
  }
}

export function getPositionLabel(pos: string | null | undefined) {
  if (!pos) return '—';
  return pos.replace('_', ' ').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
}

export function getEventTypeColor(type: string) {
  switch (type) {
    case 'MATCH': return 'text-red-400';
    case 'TOURNAMENT': return 'text-amber-400';
    case 'FITNESS': return 'text-green-400';
    case 'MEETING': return 'text-blue-400';
    case 'PRACTICE': return 'text-brand-400';
    default: return 'text-zinc-400';
  }
}

export function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'URGENT': return 'badge-urgent';
    case 'HIGH': return 'badge-high';
    case 'NORMAL': return 'badge-normal';
    default: return 'badge-low';
  }
}
