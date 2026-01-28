export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="kb-title" className="mx-auto w-full max-w-6xl px-6 py-6">
      {children}
    </section>
  );
}
