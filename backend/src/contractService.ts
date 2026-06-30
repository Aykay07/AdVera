import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();
 
const deploymentPath = path.join(__dirname, "chain", "deployment.json");
 
function loadDeployment() {
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "Missing backend/src/chain/deployment.json — go back and run the deploy script from phase 2."
    );
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
}
 
export function getContract() {
  const { address, abi } = loadDeployment();
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(process.env.GATEWAY_PRIVATE_KEY as string, provider);
  return new ethers.Contract(address, abi, wallet);
}
 
export async function submitBatchProofs(opts: {
  advRoot: string; pubRoot: string; campaignId: number;
  advertiserCount: number; publisherCount: number;
}) {
  const contract = getContract();
  const tx = await contract.submitBatchProofs(
    opts.advRoot, opts.pubRoot, opts.campaignId, opts.advertiserCount, opts.publisherCount
  );
  return tx.wait();
}
 
export async function getBatch(batchId: number) {
  return getContract().getBatch(batchId);
}
 
export async function getBatchCount() {
  return getContract().batchCount();
}