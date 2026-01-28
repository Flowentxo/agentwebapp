export type Playbook = {
  id: string;
  title: string;
  markdown: string; // raw md
  steps: { id: string; text: string; done?: boolean }[];
};
