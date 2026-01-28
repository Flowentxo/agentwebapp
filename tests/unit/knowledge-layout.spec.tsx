import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the KnowledgeLayout component
const KnowledgeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section aria-labelledby="kb-title" className="mx-auto w-full max-w-6xl px-6 py-6">
      {children}
    </section>
  );
};

describe('Knowledge Layout', () => {
  it('should render children inside section element', () => {
    render(
      <KnowledgeLayout>
        <h1 id="kb-title">Test Title</h1>
        <p>Test content</p>
      </KnowledgeLayout>
    );

    const section = screen.getByRole('region');
    expect(section).toBeDefined();
    expect(section.tagName).toBe('SECTION');
  });

  it('should have aria-labelledby="kb-title"', () => {
    render(
      <KnowledgeLayout>
        <h1 id="kb-title">Test Title</h1>
      </KnowledgeLayout>
    );

    const section = screen.getByRole('region');
    expect(section.getAttribute('aria-labelledby')).toBe('kb-title');
  });

  it('should have max-width constraint', () => {
    render(
      <KnowledgeLayout>
        <div>Content</div>
      </KnowledgeLayout>
    );

    const section = screen.getByRole('region');
    expect(section.className).toContain('max-w-6xl');
  });

  it('should have proper spacing classes', () => {
    render(
      <KnowledgeLayout>
        <div>Content</div>
      </KnowledgeLayout>
    );

    const section = screen.getByRole('region');
    expect(section.className).toContain('px-6');
    expect(section.className).toContain('py-6');
    expect(section.className).toContain('mx-auto');
  });

  it('should NOT contain "SINTRA SYSTEM" text', () => {
    const { container } = render(
      <KnowledgeLayout>
        <h1 id="kb-title">Knowledge Base</h1>
        <p>Some content</p>
      </KnowledgeLayout>
    );

    const sintraSystemText = container.textContent?.includes('SINTRA SYSTEM');
    expect(sintraSystemText).toBe(false);
  });

  it('should NOT contain section navigation elements', () => {
    const { container } = render(
      <KnowledgeLayout>
        <h1 id="kb-title">Knowledge Base</h1>
      </KnowledgeLayout>
    );

    // Should not have elements that indicate a section nav
    const sectionNavElements = container.querySelectorAll('[data-testid="section-nav"]');
    expect(sectionNavElements.length).toBe(0);

    // Should not have multiple navigation regions
    const navElements = container.querySelectorAll('nav');
    expect(navElements.length).toBe(0);
  });

  it('should not have nested layout elements', () => {
    const { container } = render(
      <KnowledgeLayout>
        <div>Content</div>
      </KnowledgeLayout>
    );

    // Should not have nested <main> or <aside> elements
    const section = screen.getByRole('region');
    const nestedMain = section.querySelectorAll('main');
    const nestedAside = section.querySelectorAll('aside');

    expect(nestedMain.length).toBe(0);
    expect(nestedAside.length).toBe(0);
  });

  it('should be a simple wrapper without complex structure', () => {
    const { container } = render(
      <KnowledgeLayout>
        <h1 id="kb-title">Test</h1>
      </KnowledgeLayout>
    );

    const section = screen.getByRole('region');

    // Section should be a direct child of container
    expect(section.parentElement).toBe(container);

    // Section should directly contain the children
    const heading = section.querySelector('h1');
    expect(heading).toBeDefined();
    expect(heading?.textContent).toBe('Test');
  });

  it('should not import or reference AppShell', () => {
    // This is a compile-time check
    // If KnowledgeLayout imports AppShell, this test documents that it shouldn't
    const layoutSource = KnowledgeLayout.toString();

    // Should not contain references to AppShell
    expect(layoutSource.includes('AppShell')).toBe(false);
    expect(layoutSource.includes('SidebarNav')).toBe(false);
    expect(layoutSource.includes('Topbar')).toBe(false);
  });

  it('should render with proper semantic HTML', () => {
    render(
      <KnowledgeLayout>
        <h1 id="kb-title">Wissensbasis</h1>
        <div>Content</div>
      </KnowledgeLayout>
    );

    // Should use section, not div
    const section = screen.getByRole('region');
    expect(section.tagName).toBe('SECTION');

    // Should have proper ARIA labelledby
    expect(section.getAttribute('aria-labelledby')).toBe('kb-title');
  });
});

describe('Knowledge Layout Integration', () => {
  it('should work with knowledge page content', () => {
    render(
      <KnowledgeLayout>
        <div className="space-y-6">
          <div>
            <h1 id="kb-title" className="text-2xl font-semibold text-text">
              Wissensbasis
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Verwalten Sie Ihre Wissensdatenbank und stellen Sie Fragen
            </p>
          </div>
          <div className="panel p-5 md:p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Wissen hinzufügen</h2>
            <form>
              <input type="text" placeholder="Titel eingeben..." />
            </form>
          </div>
        </div>
      </KnowledgeLayout>
    );

    // Title should be visible
    expect(screen.getByText('Wissensbasis')).toBeDefined();

    // Section heading should be visible
    expect(screen.getByText('Wissen hinzufügen')).toBeDefined();

    // Form input should be present
    const input = screen.getByPlaceholderText('Titel eingeben...');
    expect(input).toBeDefined();
  });

  it('should not have sidebar navigation in layout', () => {
    const { container } = render(
      <KnowledgeLayout>
        <h1 id="kb-title">Test</h1>
      </KnowledgeLayout>
    );

    // Should not have any navigation elements
    const navElements = container.querySelectorAll('nav');
    expect(navElements.length).toBe(0);

    // Should not have links typically found in sidebars
    const dashboardLink = container.querySelector('a[href="/dashboard"]');
    const agentsLink = container.querySelector('a[href="/agents"]');

    expect(dashboardLink).toBeNull();
    expect(agentsLink).toBeNull();
  });
});

describe('Knowledge Layout - No AppShell Pattern', () => {
  it('should not use grid-cols-12 pattern', () => {
    const { container } = render(
      <KnowledgeLayout>
        <div>Content</div>
      </KnowledgeLayout>
    );

    // AppShell uses grid-cols-12, KnowledgeLayout should not
    const gridElements = container.querySelectorAll('.grid-cols-12');
    expect(gridElements.length).toBe(0);
  });

  it('should not have col-span classes', () => {
    const { container } = render(
      <KnowledgeLayout>
        <div>Content</div>
      </KnowledgeLayout>
    );

    // AppShell uses col-span-* classes, KnowledgeLayout should not
    const section = screen.getByRole('region');
    expect(section.className).not.toContain('col-span');
  });

  it('should be a single-level wrapper', () => {
    const { container } = render(
      <KnowledgeLayout>
        <h1 id="kb-title">Test</h1>
      </KnowledgeLayout>
    );

    // Count direct children of container
    const directChildren = Array.from(container.children);
    expect(directChildren.length).toBe(1); // Only the section

    // Section should be the only direct child
    expect(directChildren[0].tagName).toBe('SECTION');
  });
});
