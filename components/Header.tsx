export default function Header({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <header className="mb-6 mt-2 animate-rise">
      <h1 className="text-2xl font-semibold tracking-tight text-mist">{title}</h1>
      {sub && <p className="mt-1 text-sm text-mist-faint">{sub}</p>}
    </header>
  );
}
