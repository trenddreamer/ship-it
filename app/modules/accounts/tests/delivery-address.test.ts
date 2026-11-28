import { describe, expect, it } from "vitest";
import { deliveryAddressLine } from "../client";
import {
  deliveryAddressSchema,
  findDeliveryAddress,
  setDeliveryAddress,
  signUpCustomer,
} from "../index";
import { freshDatabase } from "~/db/fresh-database";

const home = {
  street: "12 Long Street",
  suburb: "Gardens",
  city: "Cape Town",
  postalCode: "8001",
};

async function customer(database: Awaited<ReturnType<typeof freshDatabase>>, email: string) {
  const result = await signUpCustomer(database, { email, password: "a-good-password" });
  if (!result.ok) throw new Error("sign-up failed");
  return result.account.id;
}

describe("a Customer's Delivery Address", () => {
  it("is missing until they set it", async () => {
    const database = await freshDatabase();
    const thandi = await customer(database, "thandi@example.test");

    expect(await findDeliveryAddress(database, thandi)).toBeNull();

    await setDeliveryAddress(database, thandi, home);
    expect(await findDeliveryAddress(database, thandi)).toEqual(home);
  });

  it("is one per Customer: setting it again changes it", async () => {
    const database = await freshDatabase();
    const thandi = await customer(database, "thandi@example.test");
    const moved = {
      street: "3 Jan Smuts Avenue",
      suburb: "Parktown",
      city: "Johannesburg",
      postalCode: "2193",
    };

    await setDeliveryAddress(database, thandi, home);
    await setDeliveryAddress(database, thandi, moved);

    expect(await findDeliveryAddress(database, thandi)).toEqual(moved);
  });

  it("belongs to that Customer only", async () => {
    const database = await freshDatabase();
    const thandi = await customer(database, "thandi@example.test");
    const sipho = await customer(database, "sipho@example.test");

    await setDeliveryAddress(database, thandi, home);

    expect(await findDeliveryAddress(database, sipho)).toBeNull();
  });
});

describe("deliveryAddressSchema", () => {
  it("trims each line", () => {
    expect(
      deliveryAddressSchema.parse({
        street: " 12 Long Street ",
        suburb: " Gardens",
        city: "Cape Town ",
        postalCode: " 8001 ",
      }),
    ).toEqual(home);
  });

  it("asks for every line", () => {
    const result = deliveryAddressSchema.safeParse({
      street: " ",
      suburb: "",
      city: "",
      postalCode: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ["street", "Enter the street address."],
      ["suburb", "Enter the suburb."],
      ["city", "Enter the city or town."],
      ["postalCode", "Enter the 4-digit postal code."],
    ]);
  });

  it("takes a postal code of exactly 4 digits", () => {
    for (const postalCode of ["800", "80011", "80O1"]) {
      expect(deliveryAddressSchema.safeParse({ ...home, postalCode }).success).toBe(false);
    }
    expect(deliveryAddressSchema.safeParse({ ...home, postalCode: "0002" }).success).toBe(true);
  });

  it("caps each line's length", () => {
    const long = "x".repeat(121);
    for (const field of ["street", "suburb", "city"] as const) {
      const result = deliveryAddressSchema.safeParse({ ...home, [field]: long });
      expect(result.error?.issues[0]?.message).toBe("Keep it to 120 characters.");
    }
    expect(deliveryAddressSchema.safeParse({ ...home, street: "x".repeat(120) }).success).toBe(
      true,
    );
  });
});

describe("a Delivery Address on one line", () => {
  it("names the street, suburb, city and postal code, in that order", () => {
    expect(deliveryAddressLine(home)).toBe("12 Long Street, Gardens, Cape Town, 8001");
  });
});
