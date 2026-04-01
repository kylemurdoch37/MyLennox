import React from 'react';

// ---------------------------------------------------------------------------
// GovButton
// ---------------------------------------------------------------------------

interface GovButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function GovButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: GovButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:   'bg-[var(--gov-navy)] text-white hover:bg-[var(--gov-blue)] focus:ring-[var(--gov-blue)]',
    secondary: 'bg-white text-[var(--gov-navy)] border border-[var(--gov-border)] hover:bg-gray-50 focus:ring-[var(--gov-blue)]',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-[var(--gov-navy)] hover:bg-[var(--gov-navy)]/10 focus:ring-[var(--gov-blue)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// GovInput
// ---------------------------------------------------------------------------

interface GovInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function GovInput({ label, error, hint, className = '', id, ...props }: GovInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--gov-text)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--gov-blue)] focus:border-transparent
          ${error ? 'border-red-400 bg-red-50' : 'border-[var(--gov-border)] bg-white'} ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[var(--gov-muted)]">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GovSelect
// ---------------------------------------------------------------------------

interface GovSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function GovSelect({ label, error, options, className = '', id, ...props }: GovSelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--gov-text)]">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--gov-blue)] focus:border-transparent
          ${error ? 'border-red-400 bg-red-50' : 'border-[var(--gov-border)] bg-white'} ${className}`}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GovTextarea
// ---------------------------------------------------------------------------

interface GovTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function GovTextarea({ label, error, className = '', id, ...props }: GovTextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--gov-text)]">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--gov-blue)] focus:border-transparent
          ${error ? 'border-red-400 bg-red-50' : 'border-[var(--gov-border)] bg-white'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GovCard
// ---------------------------------------------------------------------------

interface GovCardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
}

export function GovCard({ className = '', noPad, children, ...props }: GovCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-[var(--gov-border)] shadow-sm ${noPad ? '' : 'p-6'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GovBadge
// ---------------------------------------------------------------------------

interface GovBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'navy';
}

export function GovBadge({ variant = 'default', className = '', children, ...props }: GovBadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger:  'bg-red-100 text-red-800',
    info:    'bg-blue-100 text-blue-800',
    navy:    'bg-[var(--gov-navy)]/10 text-[var(--gov-navy)]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// GovTable
// ---------------------------------------------------------------------------

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface GovTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function GovTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No records found.',
  loading,
}: GovTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gov-border)] bg-gray-50">
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 text-left font-semibold text-[var(--gov-muted)] text-xs uppercase tracking-wider ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--gov-muted)]">
                Loading…
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--gov-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[var(--gov-border)] last:border-0 hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, sub, icon, variant = 'default' }: StatCardProps) {
  const accent = {
    default: 'border-l-[var(--gov-blue)]',
    success: 'border-l-green-500',
    warning: 'border-l-amber-500',
    danger:  'border-l-red-500',
  };
  return (
    <GovCard className={`border-l-4 ${accent[variant]} !p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--gov-muted)] uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--gov-text)]">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[var(--gov-muted)]">{sub}</p>}
        </div>
        {icon && <div className="text-[var(--gov-muted)] opacity-50">{icon}</div>}
      </div>
    </GovCard>
  );
}

// ---------------------------------------------------------------------------
// GovModal
// ---------------------------------------------------------------------------

interface GovModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export function GovModal({ open, onClose, title, children, footer, width = 'md' }: GovModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${widths[width]} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gov-border)]">
          <h3 className="text-base font-semibold text-[var(--gov-text)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--gov-muted)] hover:text-[var(--gov-text)] transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[var(--gov-border)] bg-gray-50 rounded-b-xl flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--gov-text)]">{title}</h2>
        {sub && <p className="text-sm text-[var(--gov-muted)] mt-0.5">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GovTabs
// ---------------------------------------------------------------------------

interface Tab { id: string; label: string; icon?: React.ReactNode }

interface GovTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function GovTabs({ tabs, active, onChange }: GovTabsProps) {
  return (
    <div className="flex gap-1 border-b border-[var(--gov-border)] mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
            ${active === tab.id
              ? 'border-[var(--gov-navy)] text-[var(--gov-navy)]'
              : 'border-transparent text-[var(--gov-muted)] hover:text-[var(--gov-text)]'
            }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search…', className = '' }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gov-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--gov-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--gov-blue)] focus:border-transparent bg-white"
      />
    </div>
  );
}
