import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  LotteryWon,
  AuctionWon,
  PrizeClaimed,
  BeneficiaryFunded,
  AuctionStarted,
  BidPlaced,
  Minted,
  Redeemed,
} from "../generated/Strategy/Strategy";
import {
  LotteryPrize,
  AuctionPrize,
  Transaction,
  User,
  ProtocolStats,
  Bid,
} from "../generated/schema";

const PROTOCOL_STATS_ID = "protocol-stats";

function getOrCreateUser(address: Bytes): User {
  let user = User.load(address.toHexString());
  if (user == null) {
    user = new User(address.toHexString());
    user.address = address;
    user.totalLotteryWinnings = BigInt.fromI32(0);
    user.totalAuctionWinnings = BigInt.fromI32(0);
    user.totalAuctionSpent = BigInt.fromI32(0);
    user.lotteryWinCount = 0;
    user.auctionWinCount = 0;
    user.totalMinted = BigInt.fromI32(0);
    user.totalRedeemed = BigInt.fromI32(0);
    user.transactionCount = 0;
    user.save();
  }
  return user;
}

function getOrCreateProtocolStats(): ProtocolStats {
  let stats = ProtocolStats.load(PROTOCOL_STATS_ID);
  if (stats == null) {
    stats = new ProtocolStats(PROTOCOL_STATS_ID);
    stats.totalLotteryPrizes = BigInt.fromI32(0);
    stats.totalAuctionPrizes = BigInt.fromI32(0);
    stats.totalLotteryClaimed = BigInt.fromI32(0);
    stats.totalAuctionClaimed = BigInt.fromI32(0);
    stats.totalLotteryExpired = BigInt.fromI32(0);
    stats.totalAuctionExpired = BigInt.fromI32(0);
    stats.lotteryCount = 0;
    stats.auctionCount = 0;
    stats.totalMinted = BigInt.fromI32(0);
    stats.totalRedeemed = BigInt.fromI32(0);
    stats.totalFees = BigInt.fromI32(0);
    stats.totalTransactions = 0;
    stats.save();
  }
  return stats;
}

export function handleLotteryWon(event: LotteryWon): void {
  let id = event.params.day.toString() + "-lottery";
  let prize = new LotteryPrize(id);

  prize.day = event.params.day;
  prize.winner = event.params.winner;
  prize.amount = event.params.amount;
  prize.claimed = false;
  prize.expired = false;
  prize.timestamp = event.block.timestamp;
  prize.blockNumber = event.block.number;
  prize.txHash = event.transaction.hash;

  // Update user
  let user = getOrCreateUser(event.params.winner);
  prize.user = user.id;
  user.lotteryWinCount = user.lotteryWinCount + 1;
  user.totalLotteryWinnings = user.totalLotteryWinnings.plus(event.params.amount);
  user.save();

  // Update protocol stats
  let stats = getOrCreateProtocolStats();
  stats.lotteryCount = stats.lotteryCount + 1;
  stats.totalLotteryPrizes = stats.totalLotteryPrizes.plus(event.params.amount);
  stats.save();

  prize.save();
}

export function handleAuctionWon(event: AuctionWon): void {
  let id = event.params.day.toString() + "-auction";
  let prize = new AuctionPrize(id);

  prize.day = event.params.day;
  prize.winner = event.params.winner;
  prize.stratAmount = event.params.stratAmount;
  prize.monPaid = event.params.monPaid;
  prize.claimed = false;
  prize.expired = false;
  prize.timestamp = event.block.timestamp;
  prize.blockNumber = event.block.number;
  prize.txHash = event.transaction.hash;

  // Update user
  let user = getOrCreateUser(event.params.winner);
  prize.user = user.id;
  user.auctionWinCount = user.auctionWinCount + 1;
  user.totalAuctionWinnings = user.totalAuctionWinnings.plus(event.params.stratAmount);
  user.totalAuctionSpent = user.totalAuctionSpent.plus(event.params.monPaid);
  user.save();

  // Update protocol stats
  let stats = getOrCreateProtocolStats();
  stats.auctionCount = stats.auctionCount + 1;
  stats.totalAuctionPrizes = stats.totalAuctionPrizes.plus(event.params.stratAmount);
  stats.save();

  prize.save();
}

export function handlePrizeClaimed(event: PrizeClaimed): void {
  let winner = event.params.winner;
  let amount = event.params.amount;

  // Try to find matching lottery prize first
  // Search the last 30 lottery prizes (more than 7 to account for possible delays)
  let foundLottery = false;
  for (let i = 0; i < 30; i++) {
    let lotteryId = i.toString() + "-lottery";
    let lottery = LotteryPrize.load(lotteryId);

    if (lottery != null &&
        lottery.winner.equals(winner) &&
        lottery.amount.equals(amount) &&
        !lottery.claimed &&
        !lottery.expired) {
      lottery.claimed = true;
      lottery.claimTimestamp = event.block.timestamp;
      lottery.claimTxHash = event.transaction.hash;
      lottery.save();

      // Update protocol stats
      let stats = getOrCreateProtocolStats();
      stats.totalLotteryClaimed = stats.totalLotteryClaimed.plus(amount);
      stats.save();

      foundLottery = true;
      break;
    }
  }

  // If not found in lottery prizes, search auction prizes
  if (!foundLottery) {
    for (let i = 0; i < 30; i++) {
      let auctionId = i.toString() + "-auction";
      let auction = AuctionPrize.load(auctionId);

      if (auction != null &&
          auction.winner.equals(winner) &&
          auction.stratAmount.equals(amount) &&
          !auction.claimed &&
          !auction.expired) {
        auction.claimed = true;
        auction.claimTimestamp = event.block.timestamp;
        auction.claimTxHash = event.transaction.hash;
        auction.save();

        // Update protocol stats
        let stats = getOrCreateProtocolStats();
        stats.totalAuctionClaimed = stats.totalAuctionClaimed.plus(amount);
        stats.save();

        break;
      }
    }
  }
}

export function handleBeneficiaryFunded(event: BeneficiaryFunded): void {
  let previousWinner = event.params.previousWinner;
  let beneficiary = event.params.beneficiary;
  let amount = event.params.amount;

  // Try to find matching lottery prize first
  let foundLottery = false;
  for (let i = 0; i < 30; i++) {
    let lotteryId = i.toString() + "-lottery";
    let lottery = LotteryPrize.load(lotteryId);

    if (lottery != null &&
        lottery.winner.equals(previousWinner) &&
        !lottery.claimed &&
        !lottery.expired) {
      lottery.expired = true;
      lottery.expiryTimestamp = event.block.timestamp;
      lottery.expiryTxHash = event.transaction.hash;
      lottery.beneficiary = beneficiary;
      lottery.save();

      // Update protocol stats
      let stats = getOrCreateProtocolStats();
      stats.totalLotteryExpired = stats.totalLotteryExpired.plus(lottery.amount);
      stats.save();

      foundLottery = true;
      break;
    }
  }

  // If not found in lottery prizes, search auction prizes
  if (!foundLottery) {
    for (let i = 0; i < 30; i++) {
      let auctionId = i.toString() + "-auction";
      let auction = AuctionPrize.load(auctionId);

      if (auction != null &&
          auction.winner.equals(previousWinner) &&
          !auction.claimed &&
          !auction.expired) {
        auction.expired = true;
        auction.expiryTimestamp = event.block.timestamp;
        auction.expiryTxHash = event.transaction.hash;
        auction.beneficiary = beneficiary;
        auction.save();

        // Update protocol stats
        let stats = getOrCreateProtocolStats();
        stats.totalAuctionExpired = stats.totalAuctionExpired.plus(auction.stratAmount);
        stats.save();

        break;
      }
    }
  }
}

export function handleAuctionStarted(event: AuctionStarted): void {
  // This event is mainly for tracking auction start
  // The actual prize entity is created when AuctionWon is emitted
  // We can use this to initialize auction data if needed
  let id = event.params.day.toString() + "-auction";
  let auction = AuctionPrize.load(id);

  if (auction == null) {
    auction = new AuctionPrize(id);
    auction.day = event.params.day;
    auction.winner = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    auction.stratAmount = event.params.stratAmount;
    auction.monPaid = BigInt.fromI32(0);
    auction.claimed = false;
    auction.expired = false;
    auction.timestamp = event.block.timestamp;
    auction.blockNumber = event.block.number;
    auction.txHash = event.transaction.hash;
    auction.bidCount = 0;
    auction.user = "0x0000000000000000000000000000000000000000";
    auction.save();
  }
}

export function handleBidPlaced(event: BidPlaced): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let bid = new Bid(id);

  bid.bidder = event.params.bidder;
  bid.amount = event.params.amount;
  bid.day = event.params.day;
  bid.timestamp = event.block.timestamp;
  bid.blockNumber = event.block.number;
  bid.txHash = event.transaction.hash;

  // Link to auction
  let auctionId = event.params.day.toString() + "-auction";
  bid.auction = auctionId;

  // Update auction bid count
  let auction = AuctionPrize.load(auctionId);
  if (auction != null) {
    if (auction.bidCount == null) {
      auction.bidCount = 1;
    } else {
      auction.bidCount = auction.bidCount! + 1;
    }
    auction.save();
  }

  bid.save();
}

export function handleMinted(event: Minted): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let transaction = new Transaction(id);

  transaction.type = "MINT";
  transaction.user = event.params.to;
  transaction.monAmount = event.params.monAmount;
  transaction.stratAmount = event.params.stratAmount;
  transaction.fee = event.params.fee;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.txHash = event.transaction.hash;

  // Update user
  let user = getOrCreateUser(event.params.to);
  transaction.userEntity = user.id;
  user.totalMinted = user.totalMinted.plus(event.params.stratAmount);
  user.transactionCount = user.transactionCount + 1;
  user.save();

  // Update protocol stats
  let stats = getOrCreateProtocolStats();
  stats.totalMinted = stats.totalMinted.plus(event.params.stratAmount);
  stats.totalFees = stats.totalFees.plus(event.params.fee);
  stats.totalTransactions = stats.totalTransactions + 1;
  stats.save();

  transaction.save();
}

export function handleRedeemed(event: Redeemed): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let transaction = new Transaction(id);

  transaction.type = "REDEEM";
  transaction.user = event.params.from;
  transaction.monAmount = event.params.monAmount;
  transaction.stratAmount = event.params.stratAmount;
  transaction.fee = event.params.fee;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.txHash = event.transaction.hash;

  // Update user
  let user = getOrCreateUser(event.params.from);
  transaction.userEntity = user.id;
  user.totalRedeemed = user.totalRedeemed.plus(event.params.stratAmount);
  user.transactionCount = user.transactionCount + 1;
  user.save();

  // Update protocol stats
  let stats = getOrCreateProtocolStats();
  stats.totalRedeemed = stats.totalRedeemed.plus(event.params.stratAmount);
  stats.totalFees = stats.totalFees.plus(event.params.fee);
  stats.totalTransactions = stats.totalTransactions + 1;
  stats.save();

  transaction.save();
}
