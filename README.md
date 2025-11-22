# Strategy (MONSTR) Subgraph

This subgraph indexes events from the Strategy (MONSTR) smart contract on the Monad blockchain, enabling efficient querying of lottery prizes, auction results, transactions, and user activity.

## Overview

The Strategy contract is an ERC20 token with unique mechanics including:
- Daily lottery system for token holders
- Daily auction system using WMON
- Mint and redeem functionality with fees
- Prize claiming system with 7-day expiry

This subgraph tracks all these activities and makes them queryable via GraphQL.

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- Graph CLI (`npm install -g @graphprotocol/graph-cli`)
- Access to a Graph node (local or The Graph Studio)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Contract Address

Edit `subgraph.yaml` and update the following fields:

```yaml
source:
  address: "0x0000000000000000000000000000000000000000" # Replace with actual contract address
  startBlock: 0 # Replace with deployment block number
```

You can find the contract address in your `.env` file (`VITE_CONTRACT_ADDRESS`).

To find the deployment block number, use a block explorer or check the deployment transaction.

### 3. Generate Code

Generate TypeScript types from the GraphQL schema and ABI:

```bash
npm run codegen
```

This will create the `generated/` directory with all necessary types.

### 4. Build the Subgraph

Compile the subgraph:

```bash
npm run build
```

## Deployment

### Option 1: The Graph Studio (Hosted Service)

1. Create a subgraph on [The Graph Studio](https://thegraph.com/studio/)
2. Authenticate with your deploy key:
   ```bash
   graph auth --studio <DEPLOY_KEY>
   ```
3. Deploy:
   ```bash
   npm run deploy
   ```

### Option 2: Local Graph Node

1. Start a local Graph node (see [Graph Node docs](https://github.com/graphprotocol/graph-node))
2. Create the subgraph:
   ```bash
   npm run create-local
   ```
3. Deploy:
   ```bash
   npm run deploy-local
   ```

## Entities

### LotteryPrize
Tracks lottery winners and their prizes:
- `id`: Unique identifier (day-lottery)
- `day`: Day number when lottery was executed
- `winner`: Winner's address
- `amount`: Prize amount in MONSTR (wei)
- `claimed`: Whether prize was claimed
- `expired`: Whether prize expired (sent to beneficiary)
- `timestamp`: Block timestamp of lottery execution

### AuctionPrize
Tracks auction results:
- `id`: Unique identifier (day-auction)
- `day`: Day number when auction concluded
- `winner`: Winner's address
- `stratAmount`: MONSTR amount won
- `monPaid`: MON/WMON paid by winner
- `claimed`: Whether prize was claimed
- `expired`: Whether prize expired
- `bidCount`: Number of bids placed

### Transaction
Tracks all mint and redeem transactions:
- `id`: Unique identifier (txHash-logIndex)
- `type`: "MINT" or "REDEEM"
- `user`: User's address
- `monAmount`: MON amount (deposited or received)
- `stratAmount`: MONSTR amount (minted or burned)
- `fee`: Fee charged
- `timestamp`: Block timestamp

### User
Aggregates user statistics:
- `id`: User's address
- `lotteryWins`: Array of lottery prizes won
- `auctionWins`: Array of auction prizes won
- `totalLotteryWinnings`: Sum of lottery prizes
- `totalAuctionWinnings`: Sum of auction prizes
- `totalAuctionSpent`: Total MON spent on auctions
- `lotteryWinCount`: Number of lotteries won
- `auctionWinCount`: Number of auctions won
- `totalMinted`: Total MONSTR minted
- `totalRedeemed`: Total MONSTR redeemed
- `transactionCount`: Total transactions

### ProtocolStats
Global protocol statistics:
- `totalLotteryPrizes`: Total MONSTR distributed via lottery
- `totalAuctionPrizes`: Total MONSTR distributed via auctions
- `totalLotteryClaimed`: Total lottery prizes claimed
- `totalAuctionClaimed`: Total auction prizes claimed
- `totalLotteryExpired`: Total lottery prizes that expired
- `totalAuctionExpired`: Total auction prizes that expired
- `lotteryCount`: Number of lotteries executed
- `auctionCount`: Number of auctions executed

## Example Queries

### Get Last 7 Lottery Prizes

```graphql
{
  lotteryPrizes(first: 7, orderBy: day, orderDirection: desc) {
    day
    winner
    amount
    claimed
    expired
    timestamp
    txHash
  }
}
```

### Get Last 7 Auction Results

```graphql
{
  auctionPrizes(first: 7, orderBy: day, orderDirection: desc) {
    day
    winner
    stratAmount
    monPaid
    claimed
    expired
    timestamp
    bidCount
  }
}
```

### Get User's Prizes and Stats

```graphql
{
  user(id: "0x...") {
    address
    lotteryWinCount
    auctionWinCount
    totalLotteryWinnings
    totalAuctionWinnings
    totalAuctionSpent
    lotteryWins(orderBy: day, orderDirection: desc) {
      day
      amount
      claimed
      expired
      timestamp
    }
    auctionWins(orderBy: day, orderDirection: desc) {
      day
      stratAmount
      monPaid
      claimed
      expired
      timestamp
    }
  }
}
```

### Get Recent Transactions (Activity Feed)

```graphql
{
  transactions(
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
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

### Get Protocol Statistics

```graphql
{
  protocolStats(id: "protocol-stats") {
    totalLotteryPrizes
    totalAuctionPrizes
    totalLotteryClaimed
    totalAuctionClaimed
    lotteryCount
    auctionCount
    totalMinted
    totalRedeemed
    totalFees
    totalTransactions
  }
}
```

### Get Unclaimed Prizes for a User

```graphql
{
  lotteryPrizes(
    where: {
      winner: "0x...",
      claimed: false,
      expired: false
    }
  ) {
    day
    amount
    timestamp
  }
  auctionPrizes(
    where: {
      winner: "0x...",
      claimed: false,
      expired: false
    }
  ) {
    day
    stratAmount
    monPaid
    timestamp
  }
}
```

## Integration with Frontend

### 1. Update Environment Variables

After deploying the subgraph, add the subgraph URL to your `.env` file:

```bash
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/{SUBGRAPH_ID}/strategy-subgraph/version/latest
```

### 2. Install GraphQL Client

Install Apollo Client or similar:

```bash
npm install @apollo/client graphql
```

### 3. Query from Frontend

Example using Apollo Client:

```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: import.meta.env.VITE_SUBGRAPH_URL,
  cache: new InMemoryCache()
});

// Query recent transactions
const { data } = await client.query({
  query: gql`
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
  `
});
```

### 4. Real-time Updates

For real-time updates on the landing page, you can:

**Option A: Polling**
```javascript
const { data } = await client.query({
  query: TRANSACTIONS_QUERY,
  pollInterval: 5000 // Poll every 5 seconds
});
```

**Option B: Subscriptions (if supported)**
```javascript
const { data } = await client.subscribe({
  query: gql`
    subscription {
      transactions(
        first: 10
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        type
        user
        timestamp
      }
    }
  `
});
```

## Features

### Prize Claim Tracking

The subgraph automatically correlates `PrizeClaimed` events with their corresponding lottery or auction prizes by:
1. Searching the last 30 prizes for matching winner address and amount
2. Marking the prize as claimed with timestamp
3. Updating protocol statistics

### Prize Expiry Tracking

When a prize expires (after 7 days unclaimed), the `BeneficiaryFunded` event is emitted. The subgraph:
1. Finds the prize by previous winner
2. Marks it as expired
3. Records the beneficiary who received the funds
4. Updates protocol statistics

### User Aggregations

User entities automatically aggregate:
- All lottery and auction wins
- Total winnings and spending
- Complete transaction history
- Win counts

## Development

### Testing Locally

To test the subgraph locally:

1. Start a local Graph node (with PostgreSQL and IPFS)
2. Create and deploy:
   ```bash
   npm run create-local
   npm run deploy-local
   ```
3. Query at `http://localhost:8000/subgraphs/name/strategy-subgraph`

### Updating the Subgraph

If you make changes to the schema or mappings:

1. Update the relevant files
2. Run codegen:
   ```bash
   npm run codegen
   ```
3. Rebuild:
   ```bash
   npm run build
   ```
4. Redeploy:
   ```bash
   npm run deploy
   ```

## Troubleshooting

### Indexing Errors

Check the Graph Node logs for errors. Common issues:
- Incorrect contract address or network
- Wrong start block (set to block before first transaction)
- ABI mismatch (ensure ABI is up to date)

### Missing Data

If data is missing:
- Verify events are being emitted on-chain
- Check that the start block is correct
- Ensure the contract address matches

### Query Performance

For large datasets:
- Use pagination with `first` and `skip`
- Add appropriate `orderBy` and `where` filters
- Consider using timestamps for time-based queries

## Resources

- [The Graph Documentation](https://thegraph.com/docs/)
- [AssemblyScript Documentation](https://www.assemblyscript.org/)
- [GraphQL Documentation](https://graphql.org/)

## License

MIT
