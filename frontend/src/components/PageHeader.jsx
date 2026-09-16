export default function PageHeader({ title, description }) {
  return (
    <header className="app-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
