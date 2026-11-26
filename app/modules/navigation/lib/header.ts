import type { AccountKind } from "~/db/schema";

/** Which picture a header link shows beside, or on a phone instead of, its label. */
export type HeaderIcon = "subscriptions" | "charges" | "vendor" | "admin";

export interface HeaderLink {
  to: string;
  /** Short, so the bar fits; also the link's accessible name. */
  label: string;
  icon: HeaderIcon;
}

export interface HeaderNav {
  /** The pages an Account of this type goes to most, after the Marketplace. */
  links: HeaderLink[];
  inbox: {
    to: string;
    /** The Inbox link's accessible name: `Inbox`, or `Inbox (3 unread)`. */
    label: string;
    /** What the unread badge shows (`3`, or `9+` past nine), or null for none. */
    badge: string | null;
  };
  /** Who is signed in, for the account menu. */
  account: { email: string; kindName: string };
}

// A Customer lands on the Marketplace, which the header always links to, so
// their links go elsewhere. A Vendor or an Admin gets a link to the page they
// land on, `home`.
const linksByKind: Record<AccountKind, (home: string) => HeaderLink[]> = {
  customer: () => [
    { to: "/subscriptions", label: "Subscriptions", icon: "subscriptions" },
    { to: "/charges", label: "Charges", icon: "charges" },
  ],
  vendor: (home) => [{ to: home, label: "Vendor page", icon: "vendor" }],
  admin: (home) => [{ to: home, label: "Admin", icon: "admin" }],
};

const kindNames: Record<AccountKind, string> = {
  customer: "Customer",
  vendor: "Vendor",
  admin: "Admin",
};

/** The most unread Notifications the badge counts before it says `9+`. */
const badgeLimit = 9;

/**
 * What the header shows a signed-in Account: the same pattern for every
 * Account type (its own links, the Inbox with an unread badge, and an account
 * menu with its email and type), so only the links differ. `home` is the
 * page the Account lands on after signing in (`landingPath`).
 */
export function headerNav(account: {
  email: string;
  kind: AccountKind;
  home: string;
  unread: number;
}): HeaderNav {
  const { unread } = account;
  return {
    links: linksByKind[account.kind](account.home),
    inbox: {
      to: "/inbox",
      label: unread > 0 ? `Inbox (${unread} unread)` : "Inbox",
      badge: unread <= 0 ? null : unread > badgeLimit ? `${badgeLimit}+` : String(unread),
    },
    account: { email: account.email, kindName: kindNames[account.kind] },
  };
}
