import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { initDb, insertEvent, drainEvents, activeCampaigns, Side } from "./db";
import { hashEvent, buildMerkleTree } from "./merkle";
import { getBatch, getBatchCount, submitBatchProofs } from "./contractService";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 4000;

function trackHandler(side: Side) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const { adId, campaignId, ipHash, timestamp } = req.body as {
        adId: string; campaignId: string; ipHash: string; timestamp?: number;
      };
      if (!adId || !campaignId || !ipHash) {
        return res.status(400).json({ error: "adId, campaignId, and ipHash are required" });
      }
      const ts = timestamp ?? Date.now();
      const leaf = hashEvent(adId, ipHash, ts);
      await insertEvent(side, campaignId, leaf);
      res.status(202).json({ accepted: true, leaf });
    } catch (err) {
      console.error(`[track/${side}] error`, err);
      res.status(500).json({ error: "internal error" });
    }
  };
}

app.post("/track/advertiser-side", trackHandler("advertiser"));
app.post("/track/publisher-side", trackHandler("publisher"));

app.get("/api/batches/count", async (_req, res) => {
  try { res.json({ count: Number(await getBatchCount()) }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/batches", async (_req, res) => {
  try {
    const count = Number(await getBatchCount());
    const batches = [];
    for (let i = 0; i < count; i++) {
      const b = await getBatch(i);
      batches.push({
        batchId: i,
        campaignId: Number(b.campaignId),
        advertiserMerkleRoot: b.advertiserMerkleRoot,
        publisherMerkleRoot: b.publisherMerkleRoot,
        advertiserCount: Number(b.advertiserCount),
        publisherCount: Number(b.publisherCount),
        variancePct: Number(b.variancePct) / 100,
        status: ["Pending", "Verified", "Disputed", "Settled"][Number(b.status)],
        timestamp: Number(b.timestamp),
        penaltyBasisPoints: Number(b.penaltyBasisPoints)
      });
    }
    res.json(batches);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

async function closeBatchForCampaign(campaignId: string) {
  const advLeaves = await drainEvents("advertiser", campaignId);
  const pubLeaves = await drainEvents("publisher", campaignId);
  if (advLeaves.length === 0 && pubLeaves.length === 0) return;

  const { root: advRoot } = buildMerkleTree(advLeaves);
  const { root: pubRoot } = buildMerkleTree(pubLeaves);

  console.log(`[batcher] campaign=${campaignId} adv=${advLeaves.length} pub=${pubLeaves.length}`);

  await submitBatchProofs({
    advRoot, pubRoot, campaignId: Number(campaignId),
    advertiserCount: advLeaves.length, publisherCount: pubLeaves.length
  });
}

async function sweep() {
  for (const campaignId of await activeCampaigns()) {
    try { await closeBatchForCampaign(campaignId); }
    catch (err) { console.error(`[batcher] failed for campaign ${campaignId}`, err); }
  }
}

const INTERVAL_MS = Number(process.env.BATCH_INTERVAL_MS || 15_000);

async function start() {
  await initDb();
  console.log(`[batcher] starting — interval=${INTERVAL_MS}ms`);
  setInterval(sweep, INTERVAL_MS);
  app.listen(PORT, () => console.log(`[clearad-backend] listening on :${PORT}`));
}

start();