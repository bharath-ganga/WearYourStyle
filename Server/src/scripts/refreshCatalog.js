/**
 * Replaces the placeholder catalog data ("Men's Premium Top - Style 10",
 * brand "WearYourStyle Exclusive", every colour black/white) with the real
 * product names, brands and colours taken from each product image, and
 * tops up low stock.
 *
 *   node -r dotenv/config src/scripts/refreshCatalog.js          # dry run
 *   node -r dotenv/config src/scripts/refreshCatalog.js --apply  # write
 */
import { eq, sql } from "drizzle-orm";
import { connectDb, closeDb } from "../db/postgres.js";
import { coupons, products } from "../db/schema.js";
import { randomUUID } from "crypto";

const RESTOCK_BELOW = 20;
const RESTOCK_TO = 40;

const C = {
  black: "#111111", white: "#F5F5F2", grey: "#7A7A7A", cream: "#EFE6D2", stone: "#B4AA96",
  beige: "#D6C3A1", silver: "#BFC1C2", maroon: "#7A1F2B", taupe: "#8B7D6B", offWhite: "#F1ECE1",
  brown: "#6F4A2F", lightBrown: "#B08968", blue: "#2F5DA8", olive: "#6B6B2F", peach: "#F2B39B",
  navy: "#1F2A44", pink: "#E59AB0", green: "#2F7A4A", teal: "#0F7C80", wine: "#6E2232",
  multi: "#C2185B",
};

// Keyed by product id prefix (ids are unique on the first 8 characters).
const CATALOG = {
  // Men's pants
  VjZ09DSJ: ["Black Relaxed Fit Cargo Pants", "Buda Jeans Co", [C.black]],
  xd7VKD42: ["Black Flat-Front Cargo Pants", "Buda Jeans Co", [C.black]],
  I9Q5l2Mm: ["Cream Flat-Front Cargo Pants", "Buda Jeans Co", [C.cream]],
  DUh2mKIv: ["White Relaxed Fit Pants", "Buda Jeans Co", [C.white]],
  CuOkOcKz: ["Stone Camouflage Cargo Pants", "DNMX", [C.stone, C.olive]],
  R8pnTkpk: ["Beige Relaxed Fit Trousers", "Fabflee", [C.beige]],
  htKI2HCV: ["Beige Ribbed Relaxed Pants", "Fabflee", [C.beige]],
  TsniD0w9: ["Jet Black Slim Fit Chinos", "John Players", [C.black]],
  ib2DITyD: ["White Tapered Fit Chinos", "Netplay", [C.white]],
  "8FYpt2NC": ["Black Ankle-Length Trousers", "SHEIN", [C.black]],
  xmcJW7Iq: ["Grey Checked Relaxed Fit Trousers", "The Indian Garage Co", [C.grey]],
  // Women's pants
  vOzRlLwg: ["Silver High-Rise Straight Trousers", "Buda Jeans Co", [C.silver]],
  "9wtKTUiH": ["Taupe Relaxed Fit Pants", "Buda Jeans Co", [C.taupe]],
  "9Yk3vgBT": ["White High-Rise Relaxed Trousers", "Buda Jeans Co", [C.white]],
  TceDnCga: ["White Ribbed Relaxed Pants", "Buda Jeans Co", [C.white]],
  "690MsA1O": ["Off-White Relaxed Trousers", "Hivora", [C.offWhite]],
  "9gsosc2A": ["Black High-Rise Straight Trousers", "Kotty", [C.black]],
  AxGxTH6O: ["Black Elasticated Relaxed Trousers", "Maheshvi", [C.black]],
  yWYD9zPb: ["Brown Scalloped Ankle-Length Trousers", "SHEIN", [C.brown]],
  TFv21AVz: ["Light Brown High-Rise Trousers", "SHEIN", [C.lightBrown]],
  GXij9FWy: ["White Self-Design Straight Trousers", "Stylum", [C.white]],
  RVV3EEXT: ["Maroon Floral Flared Palazzos", "Zwerlon", [C.maroon]],
  // Men's tops
  VwrVXNRf: ["Blue Regular Fit Polo T-Shirt", "Buda Jeans Co", [C.blue]],
  "4k7uSPBt": ["Black Heather Slim Fit T-Shirt", "Columbia", [C.black]],
  bqpxV32C: ["Black Typographic Oversized T-Shirt", "Crazymonk", [C.black]],
  FQG3pGWL: ["White Regular Fit Polo T-Shirt", "Fashion and Youth", [C.white]],
  fIlutbno: ["Maroon Slim Fit Polo T-Shirt", "Louis Philippe", [C.maroon]],
  CRTIKEVr: ["Peach Slim Fit Polo T-Shirt", "Louis Philippe", [C.peach]],
  FtaPh6Dh: ["Navy Blue Regular Fit Polo T-Shirt", "Max", [C.navy]],
  lrP8q36d: ["Pink Striped Polo T-Shirt", "Max", [C.pink, C.white]],
  z8Dx6PSv: ["Green Striped Polo T-Shirt", "Neonomad", [C.green, C.white]],
  "4SNGyRSt": ["Olive Polo Collar T-Shirt", "Vooter", [C.olive]],
  // Women's tops and dresses
  "1HQMexiW": ["Black Floral Print Top", "WearYourStyle", [C.black]],
  W80uCuni: ["Black Printed Blouse", "WearYourStyle", [C.black]],
  GTacL2mf: ["Navy Blue Boat-Neck Sheath Dress", "Fyre Rose", [C.navy]],
  "3TYrxuwm": ["Blue Leaf Print Bodycon Dress", "House of Mira", [C.blue]],
  X9sFu5uR: ["Black Floral A-Line Dress", "Indie Picks", [C.black]],
  Z12lO9Vo: ["Blue Tie & Dye A-Line Dress", "Indie Picks", [C.blue]],
  EqRc6WUU: ["Blue Floral Fit & Flare Dress", "Nyrika", [C.blue]],
  gFU2gm8o: ["Teal Lace V-Neck Tiered Dress", "Outzidr Global", [C.teal]],
  U1xJxGGO: ["Wine Bandhani Print Fit & Flare Dress", "Raiyani Enterprise", [C.wine]],
  ZGtdkHuq: ["Multicoloured Floral Fit & Flare Dress", "Revangi", [C.multi]],
  VbBvUgTF: ["Navy Blue Floral A-Line Dress", "Zwerlon", [C.navy]],
};

const describe = (title, brand, category) => {
  const kind = category === "Shoes" ? "sneakers" : category === "Pants" ? "bottoms" : "tops";
  return `${title} from ${brand}. Part of the WearYourStyle ${kind} edit, with free returns within 7 days.`;
};

// Shoe images are named after the Nike style code, e.g. 0_5324c8eNike-DQ8426-002_1.avif
const shoeFromImage = (imgSource) => {
  const code = /Nike-([A-Z0-9]+-[0-9]+)/.exec(imgSource || "")?.[1];
  return code ? [`Nike Sneaker ${code}`, "Nike"] : null;
};

const apply = process.argv.includes("--apply");
const db = await connectDb();
const rows = await db.select().from(products);
const changes = [];

for (const row of rows) {
  const entry = CATALOG[row.id.slice(0, 8)];
  const shoe = row.category === "Shoes" ? shoeFromImage(row.imgSource) : null;
  const update = {};
  if (entry) {
    const [title, brand, colors] = entry;
    Object.assign(update, { title, brand, colors, description: describe(title, brand, row.category) });
  } else if (shoe) {
    const [title, brand] = shoe;
    Object.assign(update, { title, brand, gender: "unisex", description: describe(title, brand, row.category) });
  }
  if (row.stock < RESTOCK_BELOW) update.stock = RESTOCK_TO;
  if (!Object.keys(update).length) continue;
  changes.push({ id: row.id, from: `${row.title} [stock ${row.stock}]`, to: `${update.title || row.title} [stock ${update.stock ?? row.stock}]` });
  if (apply) await db.update(products).set({ ...update, updatedAt: new Date() }).where(eq(products.id, row.id));
}

console.table(changes);
console.log(`${changes.length} of ${rows.length} products ${apply ? "updated" : "would change (dry run, pass --apply)"}`);

const [welcome] = await db.select().from(coupons).where(sql`upper(${coupons.code}) = 'WELCOME10'`);
if (!welcome) {
  console.log(apply ? "Created coupon WELCOME10 (10%)" : "Would create coupon WELCOME10 (10%)");
  if (apply) await db.insert(coupons).values({ id: randomUUID(), code: "WELCOME10", discountPercent: "10", active: true });
}

await closeDb();
