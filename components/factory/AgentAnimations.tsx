'use client';

/**
 * AGENT REVOLUTION ANIMATIONS
 *
 * Reusable animation components and hooks
 * Features:
 * - Fade in/out transitions
 * - Scale animations
 * - Stagger animations for lists
 * - Keyboard navigation hooks
 */

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';

// ======================
// ANIMATION STYLES (CSS-in-JS)
// ======================

export const animationStyles = `
  /* Base Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes scaleInBounce {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    70% {
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
    50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8); }
  }

  /* Animation Classes */
  .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
  .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
  .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
  .animate-fade-in-left { animation: fadeInLeft 0.4s ease-out forwards; }
  .animate-fade-in-right { animation: fadeInRight 0.4s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
  .animate-scale-in-bounce { animation: scaleInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
  .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
  .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  .animate-shimmer { animation: shimmer 2s infinite; }
  .animate-spin { animation: spin 1s linear infinite; }
  .animate-bounce { animation: bounce 1s ease-in-out infinite; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-glow { animation: glow 2s ease-in-out infinite; }

  /* Stagger Delays */
  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }
  .stagger-5 { animation-delay: 0.25s; }
  .stagger-6 { animation-delay: 0.3s; }
  .stagger-7 { animation-delay: 0.35s; }
  .stagger-8 { animation-delay: 0.4s; }

  /* Hover Microinteractions */
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .hover-scale {
    transition: transform 0.2s ease;
  }
  .hover-scale:hover {
    transform: scale(1.02);
  }

  .hover-glow {
    transition: box-shadow 0.3s ease;
  }
  .hover-glow:hover {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
  }

  /* Focus States for Keyboard Navigation */
  .focus-ring {
    transition: box-shadow 0.2s ease, outline 0.2s ease;
  }
  .focus-ring:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.5);
  }
  .focus-ring:focus-visible {
    outline: 2px solid rgb(139, 92, 246);
    outline-offset: 2px;
  }
`;

// ======================
// ANIMATION COMPONENTS
// ======================

interface AnimatedProps {
  children: ReactNode;
  animation?: 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'scaleInBounce' | 'slideUp';
  delay?: number;
  duration?: number;
  className?: string;
  triggerOnVisible?: boolean;
}

/**
 * Animated wrapper component
 */
export function Animated({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 400,
  className = '',
  triggerOnVisible = false
}: AnimatedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!triggerOnVisible);

  useEffect(() => {
    if (!triggerOnVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [triggerOnVisible]);

  const animationClass = isVisible ? `animate-${animation.replace(/([A-Z])/g, '-$1').toLowerCase()}` : '';

  return (
    <div
      ref={ref}
      className={`${animationClass} ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        opacity: isVisible ? undefined : 0
      }}
    >
      {children}
    </div>
  );
}

/**
 * Staggered list animation
 */
export function StaggeredList({
  children,
  animation = 'fadeInUp',
  staggerDelay = 50,
  className = ''
}: {
  children: ReactNode[];
  animation?: AnimatedProps['animation'];
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Animated
          key={index}
          animation={animation}
          delay={index * staggerDelay}
        >
          {child}
        </Animated>
      ))}
    </div>
  );
}

// ======================
// KEYBOARD NAVIGATION HOOK
// ======================

interface UseKeyboardNavigationOptions {
  items: string[];
  onSelect: (index: number) => void;
  onEscape?: () => void;
  loop?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'grid';
  gridColumns?: number;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onEscape,
  loop = true,
  orientation = 'vertical',
  gridColumns = 2
}: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (items.length === 0) return;

      const { key } = event;
      let newIndex = focusedIndex;

      switch (key) {
        case 'ArrowDown':
          if (orientation === 'grid') {
            newIndex = focusedIndex + gridColumns;
            if (newIndex >= items.length) {
              newIndex = loop ? focusedIndex % gridColumns : focusedIndex;
            }
          } else if (orientation === 'vertical') {
            newIndex = focusedIndex + 1;
            if (newIndex >= items.length) {
              newIndex = loop ? 0 : focusedIndex;
            }
          }
          event.preventDefault();
          break;

        case 'ArrowUp':
          if (orientation === 'grid') {
            newIndex = focusedIndex - gridColumns;
            if (newIndex < 0) {
              newIndex = loop ? items.length - 1 - (items.length - 1 - focusedIndex) % gridColumns : focusedIndex;
            }
          } else if (orientation === 'vertical') {
            newIndex = focusedIndex - 1;
            if (newIndex < 0) {
              newIndex = loop ? items.length - 1 : 0;
            }
          }
          event.preventDefault();
          break;

        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = focusedIndex + 1;
            if (newIndex >= items.length) {
              newIndex = loop ? 0 : focusedIndex;
            }
          }
          event.preventDefault();
          break;

        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = focusedIndex - 1;
            if (newIndex < 0) {
              newIndex = loop ? items.length - 1 : 0;
            }
          }
          event.preventDefault();
          break;

        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            onSelect(focusedIndex);
          }
          event.preventDefault();
          break;

        case 'Escape':
          onEscape?.();
          setFocusedIndex(-1);
          event.preventDefault();
          break;

        case 'Home':
          newIndex = 0;
          event.preventDefault();
          break;

        case 'End':
          newIndex = items.length - 1;
          event.preventDefault();
          break;

        case 'Tab':
          // Allow natural tab behavior
          break;

        default:
          // Type-ahead: Focus first item starting with pressed key
          if (key.length === 1 && key.match(/[a-z]/i)) {
            const char = key.toLowerCase();
            const startIndex = focusedIndex + 1;
            for (let i = 0; i < items.length; i++) {
              const index = (startIndex + i) % items.length;
              if (items[index].toLowerCase().startsWith(char)) {
                newIndex = index;
                break;
              }
            }
          }
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
      }
    },
    [items, focusedIndex, onSelect, onEscape, loop, orientation, gridColumns]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps: (index: number) => ({
      'data-focused': focusedIndex === index,
      tabIndex: focusedIndex === index ? 0 : -1,
      onFocus: () => setFocusedIndex(index),
      onMouseEnter: () => setFocusedIndex(index),
      role: 'option',
      'aria-selected': focusedIndex === index
    })
  };
}

// ======================
// MOTION PREFERENCES
// ======================

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ======================
// ANIMATION STYLE INJECTION
// ======================

export function AnimationStyles() {
  return (
    <style jsx global>{animationStyles}</style>
  );
}

export default {
  Animated,
  StaggeredList,
  useKeyboardNavigation,
  usePrefersReducedMotion,
  AnimationStyles,
  animationStyles
};
