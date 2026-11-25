import { describe, expect, it } from "vitest";
import { countUnread, notifyAdmins, openInbox, sendNotification } from "../index";
import { addAccount, freshDatabase } from "./database";

const awaitingApproval = {
  kind: "vendor-awaiting-approval",
  vendorName: "Karoo Farm",
} as const;

describe("sending Notifications", () => {
  it("tells every Admin, and nobody else", async () => {
    const database = await freshDatabase();
    const admins = [
      await addAccount(database, "admin@example.test", "admin"),
      await addAccount(database, "second-admin@example.test", "admin"),
    ];
    const customer = await addAccount(database, "customer@example.test", "customer");
    const vendor = await addAccount(database, "vendor@example.test", "vendor");

    await notifyAdmins(database, awaitingApproval);

    for (const admin of admins) {
      expect((await openInbox(database, admin)).map((n) => n.message)).toEqual([
        "Karoo Farm signed up as a Vendor and is awaiting approval.",
      ]);
    }
    expect(await countUnread(database, customer)).toBe(0);
    expect(await countUnread(database, vendor)).toBe(0);
  });

  it("is part of the caller's transaction: rolled back with it", async () => {
    const database = await freshDatabase();
    const admin = await addAccount(database, "admin@example.test", "admin");

    await database
      .transaction(async (tx) => {
        await sendNotification(tx, admin, awaitingApproval);
        await notifyAdmins(tx, awaitingApproval);
        throw new Error("the change failed");
      })
      .catch(() => {});

    expect(await openInbox(database, admin)).toEqual([]);
  });

  it("is part of the caller's transaction: committed with it", async () => {
    const database = await freshDatabase();
    const admin = await addAccount(database, "admin@example.test", "admin");

    await database.transaction(async (tx) => {
      await sendNotification(tx, admin, awaitingApproval);
      await notifyAdmins(tx, awaitingApproval);
    });

    expect(await countUnread(database, admin)).toBe(2);
  });
});
