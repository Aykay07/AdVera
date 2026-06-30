// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
 
contract AdDispute {
  enum Status { Pending, Verified, Disputed, Settled }
 
  struct BatchMetadata {
    uint256 campaignId;
    bytes32 advertiserMerkleRoot;
    bytes32 publisherMerkleRoot;
    uint256 advertiserCount;
    uint256 publisherCount;
    uint256 variancePct;          // scaled by 100 -> 500 == 5.00%
    Status status;
    uint256 timestamp;
    uint256 penaltyBasisPoints;   // billing clawback, 100 = 1%
  }
 
  address public owner;
  uint256 public disputeThresholdPct = 500; // 5.00%
  mapping(uint256 => BatchMetadata) public batches;
  uint256 public batchCount;
  mapping(address => bool) public authorizedGateways;
 
  event GatewayAuthorized(address indexed gateway, bool allowed);
  event BatchSubmitted(uint256 indexed batchId, uint256 indexed campaignId, bytes32 advertiserMerkleRoot, bytes32 publisherMerkleRoot);
  event BatchSettled(uint256 indexed batchId, Status status, uint256 variancePct, uint256 penaltyBasisPoints);
 
  modifier onlyOwner() { require(msg.sender == owner, "AdDispute: not owner"); _; }
  modifier onlyGateway() { require(authorizedGateways[msg.sender], "AdDispute: not an authorized gateway"); _; }
 
  constructor() {
    owner = msg.sender;
    authorizedGateways[msg.sender] = true; // convenient for local testing
  }
 
  function setGateway(address gateway, bool allowed) external onlyOwner {
    authorizedGateways[gateway] = allowed;
    emit GatewayAuthorized(gateway, allowed);
  }
 
  function setDisputeThreshold(uint256 newThresholdPctScaled) external onlyOwner {
    disputeThresholdPct = newThresholdPctScaled;
  }
 
  function submitBatchProofs(
    bytes32 _advRoot, bytes32 _pubRoot, uint256 _campaignId,
    uint256 _advertiserCount, uint256 _publisherCount
  ) external onlyGateway returns (uint256 batchId) {
    batchId = batchCount++;
    BatchMetadata storage b = batches[batchId];
    b.campaignId = _campaignId;
    b.advertiserMerkleRoot = _advRoot;
    b.publisherMerkleRoot = _pubRoot;
    b.advertiserCount = _advertiserCount;
    b.publisherCount = _publisherCount;
    b.timestamp = block.timestamp;
    b.status = Status.Pending;
    emit BatchSubmitted(batchId, _campaignId, _advRoot, _pubRoot);
    _settle(batchId);
  }
 
  function _settle(uint256 batchId) internal {
    BatchMetadata storage b = batches[batchId];
    uint256 diff = b.advertiserCount > b.publisherCount
      ? b.advertiserCount - b.publisherCount
      : b.publisherCount - b.advertiserCount;
    uint256 variancePct = b.advertiserCount == 0 ? 0 : (diff * 10000) / b.advertiserCount;
    b.variancePct = variancePct;
    if (variancePct > disputeThresholdPct) {
      b.status = Status.Disputed;
      uint256 excess = variancePct - disputeThresholdPct;
      b.penaltyBasisPoints = excess > 5000 ? 5000 : excess;
    } else {
      b.status = Status.Verified;
      b.penaltyBasisPoints = 0;
    }
    emit BatchSettled(batchId, b.status, b.variancePct, b.penaltyBasisPoints);
  }
 
  function markSettled(uint256 batchId) external onlyOwner {
    require(batches[batchId].status == Status.Disputed, "AdDispute: not disputed");
    batches[batchId].status = Status.Settled;
    emit BatchSettled(batchId, Status.Settled, batches[batchId].variancePct, batches[batchId].penaltyBasisPoints);
  }
 
  function getBatch(uint256 batchId) external view returns (BatchMetadata memory) {
    return batches[batchId];
  }
}