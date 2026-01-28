'use client';

/**
 * FLOWENT AI STUDIO - NODE ICON COMPONENT
 *
 * Dynamic icon component that maps node definitions to Lucide icons.
 *
 * @version 2.0.0
 */

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { NodeDefinition } from '@/lib/studio/node-definitions';

// ============================================================================
// TYPES
// ============================================================================

export interface NodeIconProps {
  /** Node definition or icon name */
  node?: NodeDefinition;
  /** Direct icon name (alternative to node) */
  iconName?: string;
  /** Icon size */
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom color (overrides node color) */
  color?: string;
  /** Show background circle */
  showBackground?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// SIZE MAP
// ============================================================================

const SIZE_MAP = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function NodeIcon({
  node,
  iconName,
  size = 'md',
  color,
  showBackground = false,
  className = '',
}: NodeIconProps) {
  // Determine icon name
  const name = iconName || node?.icon || 'Zap';

  // Get size in pixels
  const sizePixels = typeof size === 'number' ? size : SIZE_MAP[size] || SIZE_MAP.md;

  // Get color
  const iconColor = color || node?.color || '#8B5CF6';

  // Get icon component
  const IconComponent = (LucideIcons as Record<string, React.ElementType>)[name] || LucideIcons.Zap;

  // Calculate background size
  const bgSize = sizePixels * 2;

  if (showBackground) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${className}`}
        style={{
          width: bgSize,
          height: bgSize,
          backgroundColor: `${iconColor}20`,
        }}
      >
        <IconComponent
          style={{ color: iconColor }}
          width={sizePixels}
          height={sizePixels}
        />
      </div>
    );
  }

  return (
    <IconComponent
      className={className}
      style={{ color: iconColor }}
      width={sizePixels}
      height={sizePixels}
    />
  );
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

export const CATEGORY_ICONS: Record<string, string> = {
  triggers: 'Zap',
  ai: 'Brain',
  data: 'Database',
  flow: 'GitBranch',
  core: 'Code',
  integrations: 'Plug',
  crm: 'Users',
  communication: 'MessageSquare',
  productivity: 'CheckSquare',
};

// ============================================================================
// PROVIDER ICONS
// ============================================================================

export const PROVIDER_ICONS: Record<string, string> = {
  hubspot: 'Building2',
  salesforce: 'Cloud',
  slack: 'MessageSquare',
  gmail: 'Mail',
  google: 'Chrome',
  github: 'Github',
  notion: 'BookOpen',
  airtable: 'Table',
  stripe: 'CreditCard',
  twilio: 'Phone',
  openai: 'Bot',
  anthropic: 'Brain',
};

// ============================================================================
// EXPORTS
// ============================================================================

export default NodeIcon;
