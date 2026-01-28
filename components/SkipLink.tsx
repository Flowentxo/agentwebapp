export default function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-black/80 focus:px-3 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>
  );
}
