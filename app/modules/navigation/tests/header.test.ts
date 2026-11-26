import { describe, expect, it } from "vitest";
import { headerNav } from "../index";

const customer = {
  email: "customer@ship-it.test",
  kind: "customer",
  home: "/",
  unread: 0,
} as const;

describe("headerNav", () => {
  it("gives a Customer short links to their Subscriptions and Charges", () => {
    expect(headerNav(customer).links).toEqual([
      { to: "/subscriptions", label: "Subscriptions", icon: "subscriptions" },
      { to: "/charges", label: "Charges", icon: "charges" },
    ]);
  });

  it("gives a Vendor and an Admin a link to the page they land on", () => {
    expect(headerNav({ ...customer, kind: "vendor", home: "/vendor" }).links).toEqual([
      { to: "/vendor", label: "Vendor page", icon: "vendor" },
    ]);
    expect(headerNav({ ...customer, kind: "admin", home: "/admin" }).links).toEqual([
      { to: "/admin", label: "Admin", icon: "admin" },
    ]);
  });

  it("follows the page an Account lands on, wherever that is", () => {
    expect(headerNav({ ...customer, kind: "vendor", home: "/elsewhere" }).links).toEqual([
      { to: "/elsewhere", label: "Vendor page", icon: "vendor" },
    ]);
  });

  it("names who is signed in, and their Account type, for the account menu", () => {
    expect(headerNav(customer).account).toEqual({
      email: "customer@ship-it.test",
      kindName: "Customer",
    });
    expect(headerNav({ ...customer, kind: "vendor" }).account.kindName).toBe("Vendor");
    expect(headerNav({ ...customer, kind: "admin" }).account.kindName).toBe("Admin");
  });

  it("shows the Inbox with no badge when nothing is unread", () => {
    expect(headerNav(customer).inbox).toEqual({ to: "/inbox", label: "Inbox", badge: null });
  });

  it("counts unread Notifications in the badge and the Inbox's name", () => {
    expect(headerNav({ ...customer, unread: 1 }).inbox).toEqual({
      to: "/inbox",
      label: "Inbox (1 unread)",
      badge: "1",
    });
    expect(headerNav({ ...customer, unread: 9 }).inbox.badge).toBe("9");
  });

  it("caps the badge at 9+, while the name keeps the full count", () => {
    expect(headerNav({ ...customer, unread: 10 }).inbox).toEqual({
      to: "/inbox",
      label: "Inbox (10 unread)",
      badge: "9+",
    });
  });
});
