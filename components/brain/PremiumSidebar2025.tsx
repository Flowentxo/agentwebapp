/**
 * 🎨 Premium Sidebar 2025
 * Gruppierte Navigation mit emotionalen Microinteractions
 * Radikales SaaS-UX Design
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { type LucideIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeType?: 'new' | 'count' | 'pro';
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface PremiumSidebar2025Props {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  sections: NavigationSection[];
}

export function PremiumSidebar2025({
  activeView,
  onViewChange,
  collapsed,
  onToggle,
  sections,
}: PremiumSidebar2025Props) {
  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{
        x: 0,
        width: collapsed ? 88 : 280
      }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 200
      }}
      className="relative h-screen bg-background border-r border-border flex flex-col shadow-xl"
      style={{
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 8px 16px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* === BRAND HEADER === */}
      <div className="px-6 py-8 border-b border-border dark:border-gray-800">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              {/* Logo with Gradient */}
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <Sparkles className="h-6 w-6 text-white relative z-10" />
                  {/* Animated glow */}
                  <motion.div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3), transparent)'
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                </div>
              </div>

              {/* Brand Text */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                  Brain AI
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Knowledge Hub
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-center"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
              >
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* === NAVIGATION SECTIONS === */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto overflow-x-hidden">
        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              {/* Section Title */}
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + sectionIndex * 0.1 }}
                  className="px-3 mb-3"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                </motion.div>
              )}

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.1 + sectionIndex * 0.1 + itemIndex * 0.05,
                        type: 'spring',
                        stiffness: 200
                      }}
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
                      )}
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                          : 'transparent'
                      }}
                    >
                      {/* Active Indicator - Flowing Line */}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full"
                          style={{
                            background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 0 12px rgba(99, 102, 241, 0.6)'
                          }}
                          transition={{
                            type: 'spring',
                            damping: 20,
                            stiffness: 300
                          }}
                        />
                      )}

                      {/* Icon with Hover Effect */}
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 transition-all duration-200',
                            isActive && 'scale-110'
                          )}
                        />
                        {/* Glow Effect on Active */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full blur-md"
                            style={{
                              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent)'
                            }}
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.4, 0.7, 0.4]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut'
                            }}
                          />
                        )}
                      </motion.div>

                      {/* Label */}
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 text-left whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Badge */}
                      {!collapsed && item.badge && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-semibold shrink-0',
                            item.badgeType === 'new' && 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                            item.badgeType === 'pro' && 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                            !item.badgeType && 'bg-muted dark:bg-gray-800 text-muted-foreground'
                          )}
                        >
                          {item.badge}
                        </motion.span>
                      )}

                      {/* Tooltip for Collapsed State */}
                      {collapsed && (
                        <div className="absolute left-full ml-4 px-4 py-2 bg-card dark:bg-muted text-white dark:text-foreground text-sm font-medium rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl">
                          <div className="flex items-center gap-2">
                            {item.label}
                            {item.badge && (
                              <span className="text-xs opacity-75">({item.badge})</span>
                            )}
                          </div>
                          {/* Tooltip Arrow */}
                          <div
                            className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent"
                            style={{
                              borderRightColor: 'rgb(17, 24, 39)'
                            }}
                          />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </nav>

      {/* === FOOTER - Collapse Toggle === */}
      <div className="p-4 border-t border-border dark:border-gray-800">
        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'group w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-muted-foreground hover:text-foreground dark:hover:text-white transition-all',
            collapsed && 'justify-center px-0',
            'hover:bg-muted dark:hover:bg-gray-800'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="flex-1 text-left">Collapse</span>
            </>
          )}
        </motion.button>
      </div>

      {/* === DECORATIVE GRADIENT EDGE === */}
      <div
        className="absolute top-0 right-0 w-px h-full pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%)'
        }}
      />
    </motion.aside>
  );
}
