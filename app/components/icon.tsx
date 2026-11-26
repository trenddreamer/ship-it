// The frame every header icon is drawn in: a 20px line drawing in the text
// colour, hidden from screen readers (the link or button around each one
// carries its name). Pass the drawing's paths, on a 24 by 24 grid, as children.
export function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}
