// `npm run db:seed`: fills a freshly migrated database with realistic
// Marketplace data. Every agent run starts from a new database, migrated
// and then seeded with this, so keep it deterministic and quick.
//
// Add seed data here as tables are added to schema.ts.
import { databasePath, db, type DB } from "./client.server";
import { products, vendors, type VendorApprovalStatus } from "./schema";

interface SeedVendor {
  name: string;
  description: string;
  approvalStatus: VendorApprovalStatus;
  products: SeedProduct[];
}

interface SeedProduct {
  name: string;
  description: string;
  /** Price per Delivery, in whole cents. */
  priceCents: number;
}

const seedVendors: SeedVendor[] = [
  {
    name: "Karoo Free-Range Farm",
    description: "Pasture-raised eggs and meat from a family farm outside Graaff-Reinet.",
    approvalStatus: "approved",
    products: [
      {
        name: "Free-range eggs (30)",
        description: "A tray of 30 large free-range eggs, collected the day before.",
        priceCents: 15000,
      },
      {
        name: "Karoo lamb box",
        description: "2 kg of mixed lamb cuts: chops, shoulder and mince.",
        priceCents: 52500,
      },
      {
        name: "Beef boerewors",
        description: "1 kg of traditional coiled boerewors, made in small batches.",
        priceCents: 18900,
      },
    ],
  },
  {
    name: "Cape Town Coffee Roasters",
    description: "Speciality coffee roasted weekly in Woodstock.",
    approvalStatus: "approved",
    products: [
      {
        name: "House espresso blend (500 g)",
        description: "Chocolatey Brazilian and Ethiopian blend, whole bean.",
        priceCents: 21000,
      },
      {
        name: "Single-origin filter (250 g)",
        description: "A rotating single origin, roasted light for pour-over.",
        priceCents: 14500,
      },
    ],
  },
  {
    name: "Durban Spice Co.",
    description: "Hand-blended masalas and spices from Durban's Grey Street.",
    approvalStatus: "approved",
    products: [],
  },
  {
    name: "Joburg Craft Bakery",
    description: "Sourdough and pastries from Maboneng, baked overnight.",
    approvalStatus: "pending",
    products: [
      { name: "Sourdough loaf", description: "A 900 g country sourdough.", priceCents: 6500 },
    ],
  },
  {
    name: "Garden Route Honey",
    description: "Raw fynbos honey from hives near Knysna.",
    approvalStatus: "rejected",
    products: [
      {
        name: "Fynbos honey (500 g)",
        description: "Raw, unfiltered fynbos honey.",
        priceCents: 12000,
      },
    ],
  },
];

export function seed(database: DB): void {
  database.transaction((tx) => {
    tx.delete(products).run();
    tx.delete(vendors).run();
    for (const vendor of seedVendors) {
      const { id } = tx
        .insert(vendors)
        .values({
          name: vendor.name,
          description: vendor.description,
          approvalStatus: vendor.approvalStatus,
        })
        .returning({ id: vendors.id })
        .get();
      for (const product of vendor.products) {
        tx.insert(products)
          .values({ vendorId: id, ...product })
          .run();
      }
    }
  });
}

seed(db);
console.log(`Seeded ${databasePath}.`);
