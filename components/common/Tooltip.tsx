import { useId, useState, cloneElement, ReactElement } from 'react';

interface TooltipProps {
  children: ReactElement;
  label: string;
}

/**
 * Accessible Tooltip Component
 *
 * - Keyboard & hover accessible
 * - ARIA-compliant (role="tooltip", aria-describedby)
 * - Works on touch devices (focus-based)
 * - No external dependencies
 *
 * Usage:
 * <Tooltip label="This is a helpful description">
 *   <button>Hover me</button>
 * </Tooltip>
 */
export function Tooltip({ children, label }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {cloneElement(children, { 'aria-describedby': id })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-20 -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                     px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border shadow-md
                     pointer-events-none whitespace-nowrap"
        >
          {label}
          {/* Tooltip Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                       w-2 h-2 rotate-45 bg-surface border-r border-b border-border"
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
