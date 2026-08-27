import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const counts = await pool.query(`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from migration_user_aliases) as user_aliases,
        (select count(*)::int from products) as products,
        (select count(*)::int from orders) as orders,
        (select count(*)::int from payments) as payments,
        (select count(*)::int from reviews) as reviews,
        (select count(*)::int from coupons) as coupons
    `);
    const integrity = await pool.query(`
      select
        (select count(*)::int from orders o left join users u on u.id = o.user_id where u.id is null) as orphan_orders,
        (select count(*)::int from payments p left join orders o on o.id = p.order_id where o.id is null) as orphan_payments,
        (select count(*)::int from reviews r left join products p on p.id = r.product_id where p.id is null) as orphan_review_products,
        (select count(*)::int from reviews r left join users u on u.id = r.user_id where u.id is null) as orphan_review_users
    `);
    const latestRun = await pool.query(`
      select source, counts, completed_at from migration_runs order by completed_at desc limit 1
    `);

    const problems = Object.values(integrity.rows[0]).some((value) => Number(value) !== 0);
    console.log("Neon counts:", counts.rows[0]);
    console.log("Referential integrity:", integrity.rows[0]);
    console.log("Latest migration:", latestRun.rows[0] || null);
    if (problems) throw new Error("Neon verification found orphaned records");
    console.log("Neon verification passed.");
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("Neon verification failed:", error.message);
  process.exitCode = 1;
});
