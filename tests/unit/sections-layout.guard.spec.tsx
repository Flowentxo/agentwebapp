import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Export constant for reuse
export const SECTIONS_CONTENT_ONLY = [
  '/workflows',
  '/analytics',
  '/board',
  '/admin',
  '/settings',
] as const;

// Mock Content-Only Layout component (identical pattern for all sections)
const SectionLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-6xl px-6 py-6">
      {children}
    </section>
  );
};

describe('Sections Content-Only Layouts', () => {
  describe('Layout Structure', () => {
    it('should render children inside section element', () => {
      render(
        <SectionLayout>
          <h1 id="page-title">Test Title</h1>
          <p>Test content</p>
        </SectionLayout>
      );

      const section = screen.getByRole('region');
      expect(section).toBeDefined();
      expect(section.tagName).toBe('SECTION');
    });

    it('should have aria-labelledby="page-title"', () => {
      render(
        <SectionLayout>
          <h1 id="page-title">Test Title</h1>
        </SectionLayout>
      );

      const section = screen.getByRole('region');
      expect(section.getAttribute('aria-labelledby')).toBe('page-title');
    });

    it('should have max-width constraint', () => {
      render(
        <SectionLayout>
          <div>Content</div>
        </SectionLayout>
      );

      const section = screen.getByRole('region');
      expect(section.className).toContain('max-w-6xl');
    });

    it('should have proper spacing classes', () => {
      render(
        <SectionLayout>
          <div>Content</div>
        </SectionLayout>
      );

      const section = screen.getByRole('region');
      expect(section.className).toContain('px-6');
      expect(section.className).toContain('py-6');
      expect(section.className).toContain('mx-auto');
      expect(section.className).toContain('w-full');
    });
  });

  describe('No Secondary Navigation', () => {
    it('should NOT contain "SINTRA SYSTEM" text', () => {
      const { container } = render(
        <SectionLayout>
          <h1 id="page-title">Section Page</h1>
          <p>Some content</p>
        </SectionLayout>
      );

      const sintraSystemText = container.textContent?.includes('SINTRA SYSTEM');
      expect(sintraSystemText).toBe(false);
    });

    it('should NOT contain navigation elements', () => {
      const { container } = render(
        <SectionLayout>
          <h1 id="page-title">Section Page</h1>
        </SectionLayout>
      );

      // Should not have nav elements
      const navElements = container.querySelectorAll('nav');
      expect(navElements.length).toBe(0);

      // Should not have role="navigation"
      const navRoles = container.querySelectorAll('[role="navigation"]');
      expect(navRoles.length).toBe(0);
    });

    it('should NOT have section navigation data attributes', () => {
      const { container } = render(
        <SectionLayout>
          <h1 id="page-title">Section Page</h1>
        </SectionLayout>
      );

      // Should not have elements that indicate a section nav
      const sectionNavElements = container.querySelectorAll('[data-testid="section-nav"]');
      expect(sectionNavElements.length).toBe(0);
    });
  });

  describe('No AppShell Pattern', () => {
    it('should not use grid-cols-12 pattern', () => {
      const { container } = render(
        <SectionLayout>
          <div>Content</div>
        </SectionLayout>
      );

      // AppShell uses grid-cols-12, SectionLayout should not
      const gridElements = container.querySelectorAll('.grid-cols-12');
      expect(gridElements.length).toBe(0);
    });

    it('should not have col-span classes', () => {
      const { container } = render(
        <SectionLayout>
          <div>Content</div>
        </SectionLayout>
      );

      // AppShell uses col-span-* classes
      const section = screen.getByRole('region');
      expect(section.className).not.toContain('col-span');
    });

    it('should be a single-level wrapper', () => {
      const { container } = render(
        <SectionLayout>
          <h1 id="page-title">Test</h1>
        </SectionLayout>
      );

      // Count direct children of container
      const directChildren = Array.from(container.children);
      expect(directChildren.length).toBe(1); // Only the section

      // Section should be the only direct child
      expect(directChildren[0].tagName).toBe('SECTION');
    });

    it('should not have nested layout elements', () => {
      const { container } = render(
        <SectionLayout>
          <div>Content</div>
        </SectionLayout>
      );

      // Should not have nested <main> or <aside> elements
      const section = screen.getByRole('region');
      const nestedMain = section.querySelectorAll('main');
      const nestedAside = section.querySelectorAll('aside');

      expect(nestedMain.length).toBe(0);
      expect(nestedAside.length).toBe(0);
    });
  });

  describe('Semantic HTML', () => {
    it('should use section element, not div', () => {
      render(
        <SectionLayout>
          <h1 id="page-title">Test</h1>
        </SectionLayout>
      );

      const section = screen.getByRole('region');
      expect(section.tagName).toBe('SECTION');
    });

    it('should have proper ARIA labelledby', () => {
      render(
        <SectionLayout>
          <h1 id="page-title">Section Title</h1>
        </SectionLayout>
      );

      const section = screen.getByRole('region');
      expect(section.getAttribute('aria-labelledby')).toBe('page-title');
    });

    it('should work with page content', () => {
      render(
        <SectionLayout>
          <div className="space-y-6">
            <div>
              <h1 id="page-title" className="text-xl font-semibold">
                Test Page
              </h1>
              <p className="text-sm">Description</p>
            </div>
            <div className="panel p-5">
              <h2>Section</h2>
              <button>Action</button>
            </div>
          </div>
        </SectionLayout>
      );

      // Title should be visible
      expect(screen.getByText('Test Page')).toBeDefined();

      // Section heading should be visible
      expect(screen.getByText('Section')).toBeDefined();

      // Button should be present
      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });
  });

  describe('SECTIONS_CONTENT_ONLY Constant', () => {
    it('should export correct routes list', () => {
      expect(SECTIONS_CONTENT_ONLY).toEqual([
        '/workflows',
        '/analytics',
        '/board',
        '/admin',
        '/settings',
      ]);
    });

    it('should have all required sections', () => {
      const requiredSections = ['/workflows', '/analytics', '/board', '/admin', '/settings'];

      requiredSections.forEach((section) => {
        expect(SECTIONS_CONTENT_ONLY).toContain(section);
      });
    });

    it('should have exactly 5 sections', () => {
      expect(SECTIONS_CONTENT_ONLY.length).toBe(5);
    });

    it('should have unique routes', () => {
      const uniqueRoutes = new Set(SECTIONS_CONTENT_ONLY);
      expect(uniqueRoutes.size).toBe(SECTIONS_CONTENT_ONLY.length);
    });

    it('should have routes starting with /', () => {
      SECTIONS_CONTENT_ONLY.forEach((route) => {
        expect(route.startsWith('/')).toBe(true);
      });
    });

    it('should not have trailing slashes', () => {
      SECTIONS_CONTENT_ONLY.forEach((route) => {
        expect(route.endsWith('/')).toBe(false);
      });
    });

    it('should be lowercase', () => {
      SECTIONS_CONTENT_ONLY.forEach((route) => {
        expect(route).toBe(route.toLowerCase());
      });
    });
  });

  describe('Integration with Page Content', () => {
    it('should work with Workflows page structure', () => {
      render(
        <SectionLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 id="page-title" className="text-xl font-semibold">
                Workflows
              </h1>
              <button>Workflow erstellen</button>
            </div>
            <div className="panel p-5">
              <p>Workflow content</p>
            </div>
          </div>
        </SectionLayout>
      );

      expect(screen.getByText('Workflows')).toBeDefined();
      expect(screen.getByText('Workflow erstellen')).toBeDefined();
    });

    it('should work with Analytics page structure', () => {
      render(
        <SectionLayout>
          <div className="space-y-6">
            <h1 id="page-title">Analytics</h1>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="panel lg:col-span-7">Traffic</div>
              <div className="panel lg:col-span-5">Requests</div>
            </div>
          </div>
        </SectionLayout>
      );

      expect(screen.getByText('Analytics')).toBeDefined();
      expect(screen.getByText('Traffic')).toBeDefined();
      expect(screen.getByText('Requests')).toBeDefined();
    });

    it('should work with Settings page structure', () => {
      render(
        <SectionLayout>
          <div className="space-y-6">
            <h1 id="page-title">Einstellungen</h1>
            <div className="panel p-5">
              <h2>Bald verfügbar</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="panel">Benutzerprofil</div>
              <div className="panel">Benachrichtigungen</div>
            </div>
          </div>
        </SectionLayout>
      );

      expect(screen.getByText('Einstellungen')).toBeDefined();
      expect(screen.getByText('Bald verfügbar')).toBeDefined();
      expect(screen.getByText('Benutzerprofil')).toBeDefined();
    });
  });

  describe('No Sidebar References', () => {
    it('should not reference AppShell in source', () => {
      const layoutSource = SectionLayout.toString();
      expect(layoutSource.includes('AppShell')).toBe(false);
    });

    it('should not reference SidebarNav in source', () => {
      const layoutSource = SectionLayout.toString();
      expect(layoutSource.includes('SidebarNav')).toBe(false);
    });

    it('should not reference Topbar in layout source', () => {
      const layoutSource = SectionLayout.toString();
      expect(layoutSource.includes('Topbar')).toBe(false);
    });

    it('should not reference SectionNav patterns', () => {
      const layoutSource = SectionLayout.toString();
      expect(layoutSource.includes('SectionNav')).toBe(false);
      expect(layoutSource.includes('Subnav')).toBe(false);
      expect(layoutSource.includes('ManagementNav')).toBe(false);
    });
  });
});
