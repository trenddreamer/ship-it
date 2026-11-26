// The header's icons: line drawings in the text colour, hidden from screen
// readers (the link or button around each one carries its name).
import type { HeaderIcon } from "~/modules/navigation";

function Icon({ children }: { children: React.ReactNode }) {
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

/** Two arrows chasing each other: something that repeats. */
function Subscriptions() {
  return (
    <Icon>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </Icon>
  );
}

/** A receipt. */
function Charges() {
  return (
    <Icon>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  );
}

/** A shop front. */
function Vendor() {
  return (
    <Icon>
      <path d="M3 9l1.5-5h15L21 9z" />
      <path d="M4 9v11h16V9" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  );
}

/** A shield. */
function Admin() {
  return (
    <Icon>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
    </Icon>
  );
}

export const linkIcons: Record<HeaderIcon, () => React.JSX.Element> = {
  subscriptions: Subscriptions,
  charges: Charges,
  vendor: Vendor,
  admin: Admin,
};

/** An in-tray. */
export function InboxIcon() {
  return (
    <Icon>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
    </Icon>
  );
}

/** A head and shoulders. */
export function PersonIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}
