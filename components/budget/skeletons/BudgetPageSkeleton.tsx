'use client';

/**
 * BudgetPageSkeleton - Loading skeleton for PremiumBudgetPage
 *
 * Provides consistent skeleton loading states that match the final layout
 * to prevent Cumulative Layout Shift (CLS).
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';

// =====================================================
// SKELETON PRIMITIVES
// =====================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      className={`bg-card/5 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

// =====================================================
// CARD SKELETONS
// =====================================================

function SkeletonCard({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={`p-6 rounded-3xl border border-white/10 bg-card/[0.02] ${className}`}
      style={{
        backdropFilter: 'blur(50px)',
        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02), 0 10px 30px rgba(0,0,0,0.2)',
      }}
    >
      {children}
    </div>
  );
}

// =====================================================
// BUDDY INSIGHT SKELETON
// =====================================================

export function BuddyInsightSkeleton() {
  return (
    <SkeletonCard className="relative overflow-hidden">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="shrink-0">
          <Skeleton className="w-16 h-16 rounded-2xl" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          <SkeletonText lines={2} />

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-card/5 rounded-xl">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>

        {/* Health Score */}
        <div className="shrink-0 text-right">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-12 w-16 rounded-xl" />
        </div>
      </div>
    </SkeletonCard>
  );
}

// =====================================================
// FORECAST CHART SKELETON
// =====================================================

export function ForecastChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <SkeletonCard className="lg:col-span-2">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Chart Area */}
        <div
          className="w-full bg-card/[0.02] rounded-xl flex items-end justify-between p-4 gap-2"
          style={{ height }}
        >
          {/* Y-Axis */}
          <div className="flex flex-col justify-between h-full w-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>

          {/* Bars/Lines placeholder */}
          <div className="flex-1 flex items-end justify-around gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-3 rounded-t"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

// =====================================================
// DONUT CHART SKELETON
// =====================================================

export function DonutChartSkeleton() {
  return (
    <SkeletonCard>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Donut */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-48 h-48 relative">
            <Skeleton className="w-full h-full rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-background" />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 w-full space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

// =====================================================
// STAT CARD SKELETON
// =====================================================

export function StatCardSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex flex-col h-full">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="mt-4 flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-3 w-20 mt-2" />
      </div>
    </SkeletonCard>
  );
}

// =====================================================
// TABLE SKELETON
// =====================================================

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonCard>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/5">
        {/* Table Header */}
        <div className="bg-card/5 px-6 py-4 grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-white/5">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-6 py-4 grid grid-cols-5 gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-18" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

// =====================================================
// COST CENTER TABLE SKELETON
// =====================================================

export function CostCenterTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="text-right">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/[0.02]">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>

        {/* Table Header */}
        <div className="bg-card/5 px-6 py-4 grid grid-cols-6 gap-4">
          {['Name', 'Code', 'Budget', 'Used', 'Utilization', 'Actions'].map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-5 grid grid-cols-6 gap-4 items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <div>
                <Skeleton className="h-2 w-full rounded-full mb-1" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-card/[0.02]">
          <div className="grid grid-cols-6 gap-4">
            <Skeleton className="h-5 w-20" />
            <div />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// FULL PAGE SKELETON
// =====================================================

export function BudgetPageSkeleton() {
  return (
    <div className="min-h-full bg-transparent overflow-hidden relative font-sans">
      {/* Header Skeleton */}
      <header className="px-10 py-6 relative border-b border-white/[0.03]">
        <div className="max-w-[1600px] mx-auto flex items-end justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="flex items-center gap-4 pb-1">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-2xl" />
          </div>
        </div>
      </header>

      {/* Tab Navigation Skeleton */}
      <div className="px-10 pt-6 border-b border-white/[0.05]">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center gap-1">
            <Skeleton className="h-10 w-32 rounded-t-xl" />
            <Skeleton className="h-10 w-40 rounded-t-xl" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="max-w-[1600px] mx-auto px-10 py-8 pb-32 space-y-8">
        {/* Buddy Insight */}
        <BuddyInsightSkeleton />

        {/* Forecast + Donut Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ForecastChartSkeleton />
          <DonutChartSkeleton />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Recent Activity */}
        <TableSkeleton rows={4} />
      </main>
    </div>
  );
}

export default BudgetPageSkeleton;
