const { ethers } = require("hardhat");

async function main(){

const contractAddress=
"0x5FbDB2315678afecb367f032d93F642f64180aa3";

const contract=
await ethers.getContractAt(
"AdDispute",
contractAddress
);


// Batch 1
await contract.submitBatchProofs(

ethers.keccak256(
ethers.toUtf8Bytes(
"adv1"
)
),

ethers.keccak256(
ethers.toUtf8Bytes(
"pub1"
)
),

101,      // campaign id
10000,    // advertiser count
9800      // publisher count

);


// Batch 2

await contract.submitBatchProofs(

ethers.keccak256(
ethers.toUtf8Bytes(
"adv2"
)
),

ethers.keccak256(
ethers.toUtf8Bytes(
"pub2"
)
),

102,
10000,
8500

);

console.log(
"Test batches added"
);

}

main()
.catch(console.error);