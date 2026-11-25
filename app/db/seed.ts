// `npm run db:seed`: fills a freshly migrated, empty database with realistic
// Marketplace data. Every agent run starts from a new database, migrated
// and then seeded with this, so keep it deterministic and quick.
//
// It refuses to touch a database that already has rows, so it can never
// wipe real data. To start again, run `npm run db:reset`.
//
// Add seed data here as tables are added to schema.ts.
//
// Demo Accounts, one of every kind (the journey test signs in with these):
//
// - Admin: the first Admin from configuration, by default
//   admin@ship-it.test / admin-password (see app/config.server.ts).
// - Customer: customer@ship-it.test / customer-password, with a Delivery
//   Address and three Subscriptions (`demoSubscriptions`).
// - Vendors: each seeded Vendor's `email` below / vendor-password.
import { sql } from "drizzle-orm";
import { config } from "~/config.server";
import {
  ensureFirstAdmin,
  setDeliveryAddress,
  signUpCustomer,
  signUpVendor,
  type Account,
  type SignUpResult,
} from "~/modules/accounts";
import { addProduct, type NewProduct } from "~/modules/catalogue";
import { subscribe } from "~/modules/subscriptions";
import { today } from "~/today.server";
import { databaseLocation, db, type DB } from "./client.server";
import { decideVendor } from "~/modules/vendors";
import { type DeliverySchedule, type VendorApprovalStatus } from "./schema";

const demoCustomer = { email: "customer@ship-it.test", password: "customer-password" };
const demoVendorPassword = "vendor-password";
const demoCustomerAddress = {
  street: "27 Kloof Street",
  suburb: "Gardens",
  city: "Cape Town",
  postalCode: "8001",
};
/** The demo Customer's Subscriptions, to seeded Products of approved Vendors. */
const demoSubscriptions: { productName: string; deliverySchedule: DeliverySchedule }[] = [
  { productName: "Free-range eggs (30)", deliverySchedule: "weekly" },
  { productName: "Karoo lamb box", deliverySchedule: "monthly" },
  { productName: "House espresso blend (500 g)", deliverySchedule: "every-two-weeks" },
];

interface SeedVendor {
  /** The email of the Vendor's demo Account. */
  email: string;
  name: string;
  description: string;
  approvalStatus: VendorApprovalStatus;
  /** Each with its Price per Delivery in whole cents, and the Delivery Schedules it offers. */
  products: NewProduct[];
}

const seedVendors: SeedVendor[] = [
  {
    email: "karoo@ship-it.test",
    name: "Karoo Free-Range Farm",
    description: "Pasture-raised eggs and meat from a family farm outside Graaff-Reinet.",
    approvalStatus: "approved",
    products: [
      {
        name: "Free-range eggs (30)",
        description: "A tray of 30 large free-range eggs, collected the day before.",
        priceCents: 15000,
        deliverySchedules: ["weekly", "every-two-weeks"],
      },
      {
        name: "Karoo lamb box",
        description: "2 kg of mixed lamb cuts: chops, shoulder and mince.",
        priceCents: 52500,
        deliverySchedules: ["monthly"],
      },
      {
        name: "Beef boerewors",
        description: "1 kg of traditional coiled boerewors, made in small batches.",
        priceCents: 18900,
        deliverySchedules: ["weekly", "every-two-weeks", "monthly"],
      },
    ],
  },
  {
    email: "coffee@ship-it.test",
    name: "Cape Town Coffee Roasters",
    description: "Speciality coffee roasted weekly in Woodstock.",
    approvalStatus: "approved",
    products: [
      {
        name: "House espresso blend (500 g)",
        description: "Chocolatey Brazilian and Ethiopian blend, whole bean.",
        priceCents: 21000,
        deliverySchedules: ["weekly", "every-two-weeks", "monthly"],
      },
      {
        name: "Single-origin filter (250 g)",
        description: "A rotating single origin, roasted light for pour-over.",
        priceCents: 14500,
        deliverySchedules: ["every-two-weeks", "monthly"],
      },
    ],
  },
  {
    email: "spice@ship-it.test",
    name: "Durban Spice Co.",
    description: "Hand-blended masalas and spices from Durban's Grey Street.",
    approvalStatus: "approved",
    products: [],
  },
  {
    email: "bakery@ship-it.test",
    name: "Joburg Craft Bakery",
    description: "Sourdough and pastries from Maboneng, baked overnight.",
    approvalStatus: "pending",
    products: [
      {
        name: "Sourdough loaf",
        description: "A 900 g country sourdough.",
        priceCents: 6500,
        deliverySchedules: ["weekly"],
      },
    ],
  },
  {
    email: "honey@ship-it.test",
    name: "Garden Route Honey",
    description: "Raw fynbos honey from hives near Knysna.",
    approvalStatus: "rejected",
    products: [
      {
        name: "Fynbos honey (500 g)",
        description: "Raw, unfiltered fynbos honey.",
        priceCents: 12000,
        deliverySchedules: ["monthly"],
      },
    ],
  },
];

/** The tables that already hold rows, ignoring Drizzle's own bookkeeping. */
async function tablesWithRows(database: DB): Promise<string[]> {
  const tables = await database.all<{ name: string }>(
    sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations'`,
  );
  const filled: string[] = [];
  for (const { name } of tables) {
    // `all`, not `get`: Drizzle's libSQL `get` throws on a raw query with no rows.
    const rows = await database.all(sql`select 1 from ${sql.identifier(name)} limit 1`);
    if (rows.length > 0) filled.push(name);
  }
  return filled;
}

export async function seed(database: DB): Promise<void> {
  const filled = await tablesWithRows(database);
  if (filled.length > 0) {
    throw new Error(
      `${databaseLocation} already has rows in ${filled.join(", ")}. The seed only fills an empty database. Run \`npm run db:reset\` to start again.`,
    );
  }
  // Accounts go through the same sign-up as everyone's, so their passwords
  // are hashed the same way. That isn't one transaction: if the seed fails
  // part-way, run `npm run db:reset`.
  await ensureFirstAdmin(database, config.firstAdmin);
  const customer = await signedUp(signUpCustomer(database, demoCustomer));
  const productIds = new Map<string, number>();
  for (const vendor of seedVendors) {
    const account = await signedUp(
      signUpVendor(database, {
        email: vendor.email,
        password: demoVendorPassword,
        businessName: vendor.name,
        description: vendor.description,
      }),
    );
    if (account.kind !== "vendor") throw new Error(`${vendor.email} isn't a Vendor Account`);
    const id = account.vendorId;
    // Decided the way an Admin decides, so the Vendor is told in its Inbox.
    if (vendor.approvalStatus !== "pending") {
      const decided = await decideVendor(database, {
        vendorId: id,
        decision: vendor.approvalStatus,
      });
      if (!decided.ok) throw new Error(`Deciding ${vendor.name} failed: ${decided.error}`);
    }
    for (const product of vendor.products) {
      productIds.set(product.name, (await addProduct(database, id, product, today())).id);
    }
  }
  await setDeliveryAddress(database, customer.id, demoCustomerAddress);
  // Subscribed today, so each first Delivery is due tomorrow.
  for (const { productName, deliverySchedule } of demoSubscriptions) {
    const productId = productIds.get(productName);
    if (productId === undefined) throw new Error(`No seeded Product is called ${productName}`);
    const result = await subscribe(database, customer.id, { productId, deliverySchedule }, today());
    if (!result.ok) throw new Error(`Subscribing to ${productName} failed: ${result.error}`);
  }
}

async function signedUp(result: Promise<SignUpResult>): Promise<Account> {
  const outcome = await result;
  if (!outcome.ok) throw new Error(`Seeding an Account failed: ${outcome.error}`);
  return outcome.account;
}

await seed(db);
console.log(`Seeded ${databaseLocation}.`);
