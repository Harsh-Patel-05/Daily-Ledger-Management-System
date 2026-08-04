export default function Loader({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className={`${sizes[size]} rounded-full border-primary/20 border-t-primary animate-spin`}
        style={{ borderWidth: size === 'sm' ? 2 : size === 'lg' ? 4 : 3 }}
      />
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader size="lg" text="Loading..." />
    </div>
  );
}
