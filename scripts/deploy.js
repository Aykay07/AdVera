const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
 
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AdDispute with account:", deployer.address);
 
  const AdDispute = await hre.ethers.getContractFactory("AdDispute");
  const adDispute = await AdDispute.deploy();
  await adDispute.waitForDeployment();
  const address = await adDispute.getAddress();
  console.log("AdDispute deployed to:", address);
 
  const artifact = await hre.artifacts.readArtifact("AdDispute");
  const outDir = path.join(__dirname, "..", "backend", "src", "chain");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "deployment.json"),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );
  console.log("Wrote backend/src/chain/deployment.json");
}
 
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});