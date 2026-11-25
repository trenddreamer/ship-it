import { describe, expect, it } from "vitest";
import { countUnread, openInbox, sendNotification } from "../index";
import { addAccount, freshDatabase } from "./database";

const awaitingApproval = {
  kind: "vendor-awaiting-approval",
  vendorName: "Karoo Farm",
} as const;

describe("an Inbox", () => {
  it("lists a Notification sent to its Account", async () => {
    const database = await freshDatabase();
    const admin = await addAccount(database, "admin@example.test", "admin");
    const before = Date.now();

    await sendNotification(database, admin, awaitingApproval);

    const inbox = await openInbox(database, admin);
    expect(inbox).toEqual([
      {
        id: expect.any(Number),
        kind: "vendor-awaiting-approval",
        message: "Karoo Farm signed up as a Vendor and is awaiting approval.",
        sentAt: expect.any(Date),
        unread: true,
      },
    ]);
    expect(inbox[0]!.sentAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(inbox[0]!.sentAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("lists its own Notifications, newest first, and nobody else's", async () => {
    const database = await freshDatabase();
    const admin = await addAccount(database, "admin@example.test", "admin");
    const otherAdmin = await addAccount(database, "other@example.test", "admin");
    const customer = await addAccount(database, "customer@example.test", "customer");

    await sendNotification(database, admin, { ...awaitingApproval, vendorName: "First" });
    await sendNotification(database, otherAdmin, { ...awaitingApproval, vendorName: "Other" });
    await sendNotification(database, admin, { ...awaitingApproval, vendorName: "Second" });

    expect((await openInbox(database, admin)).map((n) => n.message)).toEqual([
      "Second signed up as a Vendor and is awaiting approval.",
      "First signed up as a Vendor and is awaiting approval.",
    ]);
    expect((await openInbox(database, otherAdmin)).map((n) => n.message)).toEqual([
      "Other signed up as a Vendor and is awaiting approval.",
    ]);
    expect(await openInbox(database, customer)).toEqual([]);
  });

  it("counts the unread Notifications until the Inbox is opened", async () => {
    const database = await freshDatabase();
    const admin = await addAccount(database, "admin@example.test", "admin");
    const otherAdmin = await addAccount(database, "other@example.test", "admin");
    expect(await countUnread(database, admin)).toBe(0);

    await sendNotification(database, admin, awaitingApproval);
    await sendNotification(database, admin, awaitingApproval);
    await sendNotification(database, otherAdmin, awaitingApproval);
    expect(await countUnread(database, admin)).toBe(2);

    await openInbox(database, admin);
    expect(await countUnread(database, admin)).toBe(0);
    expect(await countUnread(database, otherAdmin)).toBe(1);
  });

  it("shows which Notifications were unread when it was opened, then marks them read", async () => {
    const database = await freshDatabase();
    const admin = await addAccount(database, "admin@example.test", "admin");
    await sendNotification(database, admin, { ...awaitingApproval, vendorName: "Old" });
    await openInbox(database, admin);
    await sendNotification(database, admin, { ...awaitingApproval, vendorName: "New" });

    expect((await openInbox(database, admin)).map((n) => n.unread)).toEqual([true, false]);
    expect((await openInbox(database, admin)).map((n) => n.unread)).toEqual([false, false]);
  });
});
