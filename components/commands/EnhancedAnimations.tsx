/**
 * COMMAND CENTER - Enhanced Animations
 *
 * Smooth, performant animations using CSS + Framer Motion
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

// =====================================================
// ANIMATION VARIANTS
// =====================================================

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// =====================================================
// REUSABLE ANIMATED COMPONENTS
// =====================================================

interface FadeInWrapperProps {
  children: ReactNode;
  delay?: number;
}

export function FadeInWrapper({ children, delay = 0 }: FadeInWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInUp}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerListProps {
  children: ReactNode;
}

export function StaggerList({ children }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
}

export function StaggerItem({ children }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  );
}

interface SlideInPanelProps {
  children: ReactNode;
  isOpen: boolean;
}

export function SlideInPanel({ children, isOpen }: SlideInPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[rgb(var(--surface-1))] shadow-2xl"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PulseProps {
  children: ReactNode;
  color?: string;
}

export function Pulse({ children, color = 'rgba(99, 102, 241, 0.3)' }: PulseProps) {
  return (
    <motion.div
      className="relative"
      animate={{
        boxShadow: [
          `0 0 0 0 ${color}`,
          `0 0 0 10px transparent`,
          `0 0 0 0 transparent`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MagneticButton({ children, onClick, className = '' }: MagneticButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  delay?: number;
}

export function FloatingElement({ children, delay = 0 }: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}

interface ShimmerProps {
  children: ReactNode;
}

export function Shimmer({ children }: ShimmerProps) {
  return (
    <motion.div
      className="relative overflow-hidden"
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
        backgroundSize: '200% 100%',
      }}
    >
      {children}
    </motion.div>
  );
}
