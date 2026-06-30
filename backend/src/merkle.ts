import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

export function buildMerkleTree(leafHashes: string[]) {
  const leaves = leafHashes.map((h) =>
    Buffer.from(h.replace(/^0x/, ""), "hex")
  );

  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
  });

  const root = "0x" + tree.getRoot().toString("hex");

  return { tree, root };
}

export function hashEvent(
  adId: string,
  ipHash: string,
  timestampMs: number
): string {
  const payload = `${adId}:${ipHash}:${timestampMs}`;
  return "0x" + keccak256(payload).toString("hex");
}