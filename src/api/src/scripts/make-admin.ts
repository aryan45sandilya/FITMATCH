import { getDb } from "../db/index.js";

const email = process.argv[2];
if (!email) {
  console.error("usage: npm run make-admin -- someone@example.com");
  process.exit(1);
}
const db = await getDb();
const { rows } = await db.query("UPDATE users SET role = 'admin' WHERE lower(email) = lower($1) RETURNING email", [email]);
console.log(rows.length ? `${email} is now an admin` : `no user with email ${email}`);
await db.close();
