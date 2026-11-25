import { describe, expect, it } from "vitest";
import { openInbox, sendNotification } from "../index";
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
});
