# Quick Start Guide

Get your Strategy subgraph up and running in 5 minutes!

## Prerequisites

```bash
# Install Graph CLI globally
npm install -g @graphprotocol/graph-cli
```

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Contract

You have two options:

### Option A: Use the Helper Script (Recommended)

```bash
node config-helper.js
```

This will:
- Read your contract address from `../StrategyWeb/.env` (if available)
- Prompt you for the start block
- Update `subgraph.yaml` automatically

### Option B: Manual Configuration

Edit `subgraph.yaml` and update:

```yaml
source:
  address: "YOUR_CONTRACT_ADDRESS_HERE"
  startBlock: YOUR_DEPLOYMENT_BLOCK_NUMBER
```

## Step 3: Build

```bash
# Generate types
npm run codegen

# Build the subgraph
npm run build
```

## Step 4: Deploy

### To The Graph Studio:

```bash
# Authenticate (get your deploy key from thegraph.com/studio)
graph auth --studio YOUR_DEPLOY_KEY

# Deploy
npm run deploy
```

When prompted for version, use: `v0.0.1`

### To Local Graph Node:

```bash
npm run create-local
npm run deploy-local
```

## Step 5: Test

Once synced, test with this query in The Graph Studio playground:

```graphql
{
  transactions(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    type
    user
    stratAmount
    timestamp
  }
}
```

## Step 6: Integrate with Frontend

Add to your `.env` file:

```bash
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/YOUR_ID/strategy-subgraph/version/latest
```

## Common Issues

### Build fails?
```bash
# Clean and rebuild
rm -rf generated/ build/
npm run codegen
npm run build
```

### No data showing?
- Wait for the subgraph to sync (check The Graph Studio)
- Verify `startBlock` is before your first transaction
- Check that events are being emitted on-chain

### Need more help?
- See [README.md](./README.md) for detailed documentation
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for troubleshooting
- Check [sample-queries.graphql](./sample-queries.graphql) for query examples

## What's Next?

1. ✅ Browse [sample-queries.graphql](./sample-queries.graphql) for query examples
2. ✅ Read [README.md](./README.md) for full documentation
3. ✅ Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details
4. ✅ Start building your frontend integration!

## Useful Commands

```bash
# Regenerate types after schema changes
npm run codegen

# Rebuild after mapping changes
npm run build

# Redeploy with new version
npm run deploy

# Check subgraph logs (in The Graph Studio)
# https://thegraph.com/studio/subgraph/strategy-subgraph/
```

---

**Need help?** Open an issue or check The Graph documentation at https://thegraph.com/docs/
