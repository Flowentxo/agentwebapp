'use client';

/**
 * TEMPLATE DIALOG
 *
 * Thin wrapper that renders the Unified TemplateGallery component.
 * The TemplateGallery handles its own Portal rendering to ensure
 * proper z-index layering above all other UI elements.
 *
 * This wrapper exists to maintain backwards compatibility with
 * existing code that uses the TemplateDialog component.
 *
 * @version 2.0.0 - Now uses the Unified TemplateGallery from pipelines/editor
 */

import React from 'react';
import { TemplateGallery } from '@/components/pipelines/editor/TemplateGallery';

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** @deprecated - Template selection is now handled internally by TemplateGallery */
  onTemplateSelect?: (workflow: any) => void;
}

/**
 * TemplateDialog - Wrapper for the Unified Template Gallery
 *
 * The TemplateGallery component now handles:
 * - Portal rendering (z-[9999])
 * - Template selection and configuration
 * - Loading templates into the pipeline store
 *
 * This wrapper simply passes through the isOpen and onClose props.
 */
export function TemplateDialog({
  isOpen,
  onClose,
}: TemplateDialogProps) {
  return (
    <TemplateGallery
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}

export default TemplateDialog;
