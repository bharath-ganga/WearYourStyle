import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  phoneNumber: text("phone_number").notNull().default(""),
  address: jsonb("address").notNull().default(sql`'""'::jsonb`),
  addresses: jsonb("addresses").notNull().default(sql`'[]'::jsonb`),
  wishlist: text("wishlist").array().notNull().default(sql`ARRAY[]::text[]`),
  stylePreferences: jsonb("style_preferences").notNull().default(sql`'{}'::jsonb`),
  measurements: jsonb("measurements").notNull().default(sql`'{}'::jsonb`),
  role: text("role").notNull().default("customer"),
  refreshToken: text("refresh_token"),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
  check("users_role_check", sql`${table.role} in ('customer', 'admin')`),
]);

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  imgSource: text("img_source"),
  brand: text("brand"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  category: text("category"),
  gender: text("gender"),
  sizes: text("sizes").array().notNull().default(sql`ARRAY[]::text[]`),
  colors: text("colors").array().notNull().default(sql`ARRAY[]::text[]`),
  stock: integer("stock").notNull().default(0),
  description: text("description"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  ...timestamps,
}, (table) => [
  index("products_category_idx").on(table.category),
  index("products_gender_idx").on(table.gender),
]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  ...timestamps,
}, (table) => [
  index("orders_user_id_idx").on(table.userId),
  index("orders_created_at_idx").on(table.createdAt),
]);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  ...timestamps,
}, (table) => [index("payments_order_id_idx").on(table.orderId)]);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("reviews_product_user_unique").on(table.productId, table.userId),
  index("reviews_product_id_idx").on(table.productId),
  check("reviews_rating_check", sql`${table.rating} between 1 and 5`),
]);

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex("coupons_code_upper_unique").on(sql`upper(${table.code})`),
  check("coupons_discount_check", sql`${table.discountPercent} between 0 and 100`),
]);

export const migrationRuns = pgTable("migration_runs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  counts: jsonb("counts").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
});

export const migrationUserAliases = pgTable("migration_user_aliases", {
  sourceUserId: text("source_user_id").primaryKey(),
  targetUserId: text("target_user_id").notNull(),
  source: text("source").notNull().default("firebase-firestore"),
  migratedAt: timestamp("migrated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("migration_user_aliases_target_idx").on(table.targetUserId)]);
