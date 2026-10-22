export default function Button({ variant = "", full = false, children, ...props }) {
  return (
    <button className={`btn ${variant} ${full ? "full" : ""}`} {...props}>
      {children}
    </button>
  );
}
