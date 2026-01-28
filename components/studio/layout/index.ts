/**
 * Studio Layout Components
 *
 * Exports all layout components for the Visual Agent Studio.
 * These components decompose the large VisualAgentStudio.tsx into
 * focused, maintainable sub-components.
 *
 * @version 1.0.0
 */

export { StudioHeader, type StudioHeaderProps, type StudioMode } from './StudioHeader';
export { StudioSidebar, type StudioSidebarProps } from './StudioSidebar';
export {
  StudioMain,
  type StudioMainProps,
  type LibraryGroup,
  type LibraryItem,
  type TemplateOption,
} from './StudioMain';
