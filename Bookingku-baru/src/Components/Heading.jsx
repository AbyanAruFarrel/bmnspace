export default function Heading({ title, subtitle }) {
  return (
    <div className="page-heading" style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {subtitle && <p className="muted" style={{ margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  );
}
