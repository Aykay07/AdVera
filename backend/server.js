const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();

app.use(cors());
app.use(express.json());


// HARDHAT BLOCKCHAIN CONNECTION

const provider = new ethers.JsonRpcProvider(
    "http://127.0.0.1:8545"
);


// Hardhat default private key
const privateKey =
"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const wallet =
new ethers.Wallet(
    privateKey,
    provider
);


// CONTRACT

const contractAddress =
"0x5FbDB2315678afecb367f032d93F642f64180aa3";


const abi=[

"function batchCount() view returns(uint256)",

"function getBatch(uint256) view returns(tuple(uint256 campaignId,bytes32 advertiserMerkleRoot,bytes32 publisherMerkleRoot,uint256 advertiserCount,uint256 publisherCount,uint256 variancePct,uint8 status,uint256 timestamp,uint256 penaltyBasisPoints))",

"function submitBatchProofs(bytes32,bytes32,uint256,uint256,uint256)"

];


// use wallet instead of provider
const contract =
new ethers.Contract(
contractAddress,
abi,
wallet
);


const STATUS=[
"Pending",
"Verified",
"Disputed",
"Settled"
];



// DASHBOARD API

app.get("/dashboard",async(req,res)=>{

try{

const totalBatches=
await contract.batchCount();

let batches=[];

for(
let i=0;
i<Number(totalBatches);
i++
){

const b=
await contract.getBatch(i);

batches.push({

batchId:i,

campaignId:
Number(b.campaignId),

advertiserMerkleRoot:
b.advertiserMerkleRoot,

publisherMerkleRoot:
b.publisherMerkleRoot,

advertiserCount:
Number(b.advertiserCount),

publisherCount:
Number(b.publisherCount),

variancePct:
Number(b.variancePct)/100,

status:
STATUS[
Number(b.status)
],

timestamp:
Number(b.timestamp),

penaltyBasisPoints:
Number(b.penaltyBasisPoints)

});

}

res.json(batches);

}
catch(err){

console.log(err);

res.status(500).json({
error:"dashboard failed"
});

}

});




// GENERATE NEW BATCH

app.post("/generateBatch",async(req,res)=>{

try{

const campaignId=
Math.floor(Math.random()*1000);

const advertiserCount=
Math.floor(Math.random()*5000)+5000;


// create some disputed and some verified batches
const variance=
Math.random()*20;

const publisherCount=
Math.floor(
advertiserCount*
(1-variance/100)
);

const advRoot=
ethers.keccak256(
ethers.toUtf8Bytes(
"adv"+Date.now()
)
);

const pubRoot=
ethers.keccak256(
ethers.toUtf8Bytes(
"pub"+Date.now()
)
);


const tx=
await contract.submitBatchProofs(

advRoot,
pubRoot,
campaignId,
advertiserCount,
publisherCount

);

await tx.wait();

res.json({
success:true
});

}
catch(err){

console.log(err);

res.status(500).json({
error:"batch generation failed"
});

}

});



app.listen(
5000,
()=>{

console.log(
"Backend running at http://localhost:5000"
);

});