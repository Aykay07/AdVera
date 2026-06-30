import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "clearad",
  waitForConnections: true,
  connectionLimit: 10,
});

export type Side = "advertiser" | "publisher";

// export async function initDb() {
//   await pool.execute(`
// CREATE TABLE IF NOT EXISTS events (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   campaignId VARCHAR(255) NOT NULL,
//   side ENUM('advertiser','publisher') NOT NULL,
//   leaf VARCHAR(255) NOT NULL,
//   createdAt BIGINT NOT NULL,
//   INDEX idx_events_campaign_side (campaignId, side)
// )
// `);
// }
export async function initDb() {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL connected");
    conn.release();

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId VARCHAR(255) NOT NULL,
        side ENUM('advertiser','publisher') NOT NULL,
        leaf VARCHAR(255) NOT NULL,
        createdAt BIGINT NOT NULL,
        INDEX idx_events_campaign_side (campaignId, side)
      )
    `);
  } catch (err: any) {
    console.error("FULL ERROR:");
    console.error(err);

    if (err.errors) {
      console.error("INNER ERRORS:");
      for (const e of err.errors) {
        console.error(e);
      }
    }

    throw err;
  }
}

export async function insertEvent(side: Side, campaignId: string, leaf: string) {
  await pool.execute(
    "INSERT INTO events (campaignId, side, leaf, createdAt) VALUES (?, ?, ?, ?)",
    [campaignId, side, leaf, Date.now()]
  );
}

export async function countPending(side: Side, campaignId: string): Promise<number> {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) as c FROM events WHERE campaignId = ? AND side = ?",
    [campaignId, side]
  );
  return (rows as any[])[0].c;
}

export async function drainEvents(side: Side, campaignId: string): Promise<string[]> {
  const [rows] = (await pool.execute(
    "SELECT id, leaf FROM events WHERE campaignId = ? AND side = ?",
    [campaignId, side]
  )) as any;
  if (rows.length === 0) return [];
  const ids = rows.map((r: any) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  await pool.execute(`DELETE FROM events WHERE id IN (${placeholders})`, ids);
  return rows.map((r: any) => r.leaf);
}

export async function activeCampaigns(): Promise<string[]> {
  const [rows] = (await pool.execute("SELECT DISTINCT campaignId FROM events")) as any;
  return rows.map((r: any) => r.campaignId);
}

export default pool;