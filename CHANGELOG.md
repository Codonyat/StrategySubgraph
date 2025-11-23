# Subgraph Changes - Transaction and Prize Limiting

## Overview
Implemented automatic data rotation to limit storage while keeping the most recent and relevant data.

## Storage Limits

### Transactions (10 maximum)
- Only the **10 most recent transactions** are stored
- Includes:
  - MINT transactions
  - REDEEM transactions
  - TRANSFER transactions to the fee pool (0x00000000000fee50000000add2e5500000000000)
- **Note**: Mints are NOT double-counted as transfers (transfers from address zero are ignored)

### Lottery Prizes (7 maximum)
- Only the **7 most recent lottery prizes** (by day) are stored
- Each prize includes:
  - Winner address
  - Amount
  - `claimed` status (boolean)
  - `expired` status (boolean)
  - Claim/expiry timestamps and transaction hashes
  - Associated user entity

### Auction Prizes (7 maximum)
- Only the **7 most recent auction prizes** (by day) are stored
- Each prize includes:
  - Winner address
  - STRAT amount and MON paid
  - `claimed` status (boolean)
  - `expired` status (boolean)
  - Claim/expiry timestamps and transaction hashes
  - Bid count
  - Associated user entity

## Schema Changes

### ProtocolStats Entity
**New field added:**
```graphql
transactionCounter: Int!
```
- Used to generate sequential transaction IDs
- Increments with each new transaction (mint, redeem, or transfer to fee pool)

### Transaction Entity
**ID format changed:**
- **Old**: `{txHash}-{logIndex}` (e.g., "0xabc...123-0")
- **New**: Sequential numbers (e.g., "0", "1", "2", ...)
- This enables efficient rotation of old transactions

## New Functionality

### Transfer Tracking
- New handler: `handleTransfer()`
- Tracks transfers TO the fee pool address only
- Ignores transfers from address zero (to avoid counting mints as transfers)
- Creates Transaction entities with type "TRANSFER" for all transfers to the fee pool
- **Note**: When a mint or redeem occurs and transfers fees to the pool, this will create TWO separate transactions:
  - One MINT/REDEEM transaction (with fee information)
  - One TRANSFER transaction (for the fee transfer to pool)
  - This is intentional to track all activity

### Automatic Rotation

#### Transaction Rotation
- Triggered on: Every mint, redeem, or transfer to fee pool
- Function: `rotateTransactions()`
- Behavior: When adding a new transaction, if 10+ transactions exist, deletes the oldest ones
- Location: src/mapping.ts:67-92

#### Lottery Prize Rotation
- Triggered on: Every lottery win
- Function: `rotateLotteryPrizes(currentDay)`
- Behavior: Deletes prizes older than 7 days from the current day
- Location: src/mapping.ts:95-111

#### Auction Prize Rotation
- Triggered on: Every auction win
- Function: `rotateAuctionPrizes(currentDay)`
- Behavior: Deletes prizes older than 7 days from the current day
- Location: src/mapping.ts:113-129

## Constants (src/mapping.ts)
```typescript
const MAX_TRANSACTIONS = 10;  // Maximum transactions to keep
const MAX_PRIZES = 7;         // Maximum prizes (lottery/auction) to keep
const FEES_POOL_ADDRESS = "0x00000000000fee50000000add2e5500000000000";
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
```

## Modified Files

1. **schema.graphql**
   - Added `transactionCounter: Int!` to ProtocolStats

2. **src/mapping.ts**
   - Updated `getOrCreateProtocolStats()` to initialize `transactionCounter`
   - Modified `rotateTransactions()` to work with sequential IDs
   - Modified `rotateLotteryPrizes()` to use day-based rotation
   - Modified `rotateAuctionPrizes()` to use day-based rotation
   - Updated `handleMinted()` to call rotation and use sequential IDs
   - Updated `handleRedeemed()` to call rotation and use sequential IDs
   - Updated `handleLotteryWon()` to call prize rotation
   - Updated `handleAuctionWon()` to call prize rotation
   - Added `handleTransfer()` to track transfers to fee pool

3. **subgraph.yaml**
   - Already configured with Transfer event handler

## GraphQL Query Impact

### Querying Recent Transactions
```graphql
{
  transactions(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    type
    user
    monAmount
    stratAmount
    fee
    timestamp
    txHash
  }
}
```
**Note**: Only returns up to 10 most recent transactions

### Querying Recent Lottery Prizes
```graphql
{
  lotteryPrizes(first: 7, orderBy: day, orderDirection: desc) {
    id
    day
    winner
    amount
    claimed
    expired
    claimTimestamp
    expiryTimestamp
  }
}
```
**Note**: Only returns up to 7 most recent lottery prizes

### Querying Recent Auction Prizes
```graphql
{
  auctionPrizes(first: 7, orderBy: day, orderDirection: desc) {
    id
    day
    winner
    stratAmount
    monPaid
    claimed
    expired
    claimTimestamp
    expiryTimestamp
    bidCount
  }
}
```
**Note**: Only returns up to 7 most recent auction prizes

## Breaking Changes

⚠️ **Transaction ID format changed** - If your app relies on transaction IDs being in `{txHash}-{logIndex}` format, you'll need to update your queries to use the `txHash` field directly instead of parsing the ID.

## Deployment Notes

1. This change requires a **full reindex** of the subgraph
2. Old transactions and prizes beyond the limits will be deleted during the rotation process
3. Make sure to update the subgraph version before deploying
