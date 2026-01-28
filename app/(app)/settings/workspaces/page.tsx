import { redirect } from 'next/navigation';

export default function WorkspacesSettingsPage() {
  redirect('/settings?tab=workspaces');
}

