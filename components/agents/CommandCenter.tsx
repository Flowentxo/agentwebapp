/**
 * CommandCenter - Wrapper component
 * Forwards to the real CommandCenter implementation
 */

import { CommandCenter as RealCommandCenter } from '@/components/commands/CommandCenter';

interface CommandCenterProps {
  onCommandExecute?: (command: any) => void;
  autoFocus?: boolean;
  [key: string]: any;
}

export function CommandCenter(props: CommandCenterProps) {
  return <RealCommandCenter {...props} />;
}
