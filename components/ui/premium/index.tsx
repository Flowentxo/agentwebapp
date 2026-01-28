'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens, animations } from '@/lib/design-system';

// --- PAGE LAYOUT ---
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen px-6 py-8 lg:px-10"
      style={{ background: tokens.bgPage, fontFamily: tokens.fontFamily }}
    >
      <div className="max-w-[1440px] mx-auto space-y-6">
        {children}
      </div>
    </div>
  );
}

// --- PAGE HEADER ---
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/40 font-medium max-w-md leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex gap-4">{actions}</div>}
    </header>
  );
}

// --- BENTO CARD ---
interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export function BentoCard({ children, className = '', delay = 0, onClick }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`
        p-8 rounded-[40px] border border-white/5 relative overflow-hidden group
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: tokens.bgCard,
        backdropFilter: 'blur(50px)',
        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.01), 0 20px 50px rgba(0,0,0,0.15)',
      }}
    >
      {/* SPOTLIGHT EFFECT */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%)',
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

// --- STAT CARD ---
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { value: number; label?: string };
  color?: 'indigo' | 'teal' | 'green' | 'red' | 'yellow';
  delay?: number;
}

export function StatCard({ icon, label, value, subtext, trend, color = 'indigo', delay = 0 }: StatCardProps) {
  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  };

  return (
    <BentoCard delay={delay} className="flex flex-col justify-between">
      <div className={`p-2 rounded-xl w-fit border ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="mt-4">
        <p className="text-sm text-white/40">{label}</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
        {subtext && <p className="text-xs text-white/30 mt-1">{subtext}</p>}
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
          <span className={trend.value >= 0 ? 'text-green-400' : 'text-red-400'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          {trend.label && <span className="text-white/20">{trend.label}</span>}
        </div>
      )}
    </BentoCard>
  );
}

// --- BADGE ---
interface BadgeProps {
  text: string;
  color?: 'indigo' | 'teal' | 'green' | 'red' | 'yellow' | 'white';
}

export function Badge({ text, color = 'indigo' }: BadgeProps) {
  const colorMap = {
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
    teal: 'bg-teal-500/20 text-teal-300 border-teal-500/20',
    green: 'bg-green-500/20 text-green-400 border-green-500/20',
    red: 'bg-red-500/20 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    white: 'bg-card/10 text-white/60 border-white/10',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border w-fit ${colorMap[color]}`}>
      {text}
    </span>
  );
}

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gradient' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className = '', ...props }, ref) => {
    const variants = {
      primary: 'bg-card text-black hover:bg-card/90 shadow-xl shadow-white/10',
      secondary: 'bg-card/10 hover:bg-card/20 border border-white/10 text-white',
      gradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20',
      ghost: 'bg-transparent hover:bg-card/5 text-white/60 hover:text-white',
    };

    const sizes = {
      sm: 'px-4 py-2 text-[10px]',
      md: 'px-6 py-3 text-xs',
      lg: 'px-8 py-4 text-sm',
    };

    return (
      <button
        ref={ref}
        className={`
          ${variants[variant]}
          ${sizes[size]}
          rounded-full font-bold uppercase tracking-widest
          transition-all hover:scale-105 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// --- SECTION HEADER ---
interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ icon, title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-2xl font-bold text-white flex items-center gap-3">
        {icon && <span className="text-white/20">{icon}</span>}
        {title}
      </h3>
      {action}
    </div>
  );
}

// --- DATA TABLE ---
interface Column<T> {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = 'No data available.',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-white/5 bg-card/[0.02]"
      style={{ backdropFilter: 'blur(30px)' }}
    >
      <table className="w-full text-left text-sm">
        <thead className="text-[10px] uppercase font-bold tracking-widest text-white/30 bg-card/5">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-8 py-5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-20 text-center text-white/20 italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            <AnimatePresence>
              {data.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onRowClick?.(item)}
                  className={`hover:bg-card/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`px-8 py-5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                      {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- PROGRESS RING ---
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  percentage,
  size = 192,
  strokeWidth = 8,
  color = tokens.accent,
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(1, percentage / 100) * circumference);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'circOut' }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black">{Math.round(percentage)}%</span>
        {sublabel && <span className="text-[10px] uppercase tracking-tighter text-white/30">{sublabel}</span>}
      </div>
    </div>
  );
}

// --- LOADING STATE ---
export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-white text-sm tracking-widest uppercase font-light"
      >
        {text}
      </motion.div>
    </div>
  );
}

// --- EMPTY STATE ---
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4 text-white/20">{icon}</div>}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-sm text-white/40 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

// --- ALERT BANNER ---
interface AlertBannerProps {
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp?: string;
  onDismiss?: () => void;
}

export function AlertBanner({ severity, message, timestamp, onDismiss }: AlertBannerProps) {
  const colors = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-200',
    warning: 'bg-orange-500/10 border-orange-500/20 text-orange-200',
    error: 'bg-red-500/10 border-red-500/20 text-red-200',
    success: 'bg-green-500/10 border-green-500/20 text-green-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border flex items-start gap-4 ${colors[severity]}`}
    >
      <div className="flex-1">
        <p className="font-bold text-sm">{message}</p>
        {timestamp && <p className="text-xs opacity-70 mt-1">{timestamp}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity">
          &times;
        </button>
      )}
    </motion.div>
  );
}

// --- ICON WRAPPER ---
interface IconWrapperProps {
  children: React.ReactNode;
  color?: 'indigo' | 'teal' | 'green' | 'red' | 'yellow' | 'white';
  size?: 'sm' | 'md' | 'lg';
}

export function IconWrapper({ children, color = 'indigo', size = 'md' }: IconWrapperProps) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    white: 'text-white/60 bg-card/5 border-white/10',
  };

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <div className={`rounded-xl border w-fit ${colors[color]} ${sizes[size]}`}>
      {children}
    </div>
  );
}
