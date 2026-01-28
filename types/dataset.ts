export type Dataset = {
  id: string;
  name: string;
  description?: string;
  size?: number; // bytes (optional, fake)
  docs: { id: string; title: string; content: string }[]; // tiny stub
};
