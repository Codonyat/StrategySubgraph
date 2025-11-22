# Deployment Guide for Strategy Subgraph

This guide walks you through deploying the Strategy subgraph step-by-step.

## Prerequisites Checklist

- [ ] Node.js v16+ installed
- [ ] Graph CLI installed globally: `npm install -g @graphprotocol/graph-cli`
- [ ] Contract deployed on Monad
- [ ] Contract address from deployment
- [ ] Deployment block number
- [ ] Access to The Graph Studio (or local Graph node)

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
cd C:\Users\nilga\Repos\StrategySubgraph
npm install
```

### 2. Update Contract Configuration

Edit `subgraph.yaml` and replace these placeholders:

```yaml
source:
  address: "0x0000000000000000000000000000000000000000" # Replace with your contract address
  startBlock: 0 # Replace with deployment block number
```

**How to find the deployment block:**
- Check your deployment transaction on Monad block explorer
- Look for the block number in the transaction details
- Use this as the `startBlock` value

**Why startBlock matters:**
- The subgraph will only index events from this block onwards
- Setting it to the deployment block saves indexing time
- Setting it too early is fine but slower
- Setting it too late will miss events

### 3. Verify Network Configuration

The subgraph is configured for Monad. If you need to change the network, update the `network` field in `subgraph.yaml`:

```yaml
network: monad # For Monad mainnet
# OR
network: monad-testnet # For Monad testnet (if supported)
```

### 4. Generate TypeScript Code

Run codegen to generate TypeScript types from your schema and ABI:

```bash
npm run codegen
```

This creates the `generated/` directory with:
- GraphQL schema types
- Contract ABI types
- Event types for mappings

**Expected output:**
```
✔ Apply migrations
✔ Load subgraph from subgraph.yaml
  Load contract ABI from abis/Strategy.json
✔ Load contract ABIs
  Generate types for contract ABI: Strategy (abis/Strategy.json)
  Write types to generated/Strategy/Strategy.ts
✔ Generate types for data source templates
✔ Load data source template ABIs
✔ Generate types for data source template ABIs
✔ Load GraphQL schema from schema.graphql
  Write types to generated/schema.ts
✔ Generate types for GraphQL schema

Types generated successfully
```

### 5. Build the Subgraph

Compile the subgraph to WebAssembly:

```bash
npm run build
```

This compiles your TypeScript mappings to WASM.

**Expected output:**
```
✔ Apply migrations
✔ Load subgraph from subgraph.yaml
  Compile data source: Strategy => build/Strategy/Strategy.wasm
✔ Compile subgraph
  Copy schema file build/schema.graphql
  Write subgraph file build/subgraph.yaml
  Write subgraph manifest build/subgraph.yaml
✔ Write compiled subgraph to build/

Build completed: build/subgraph.yaml
```

**If build fails:**
- Check for TypeScript errors in `src/mapping.ts`
- Ensure all dependencies are installed
- Verify the ABI file exists at `abis/Strategy.json`

### 6. Deploy to The Graph Studio

#### 6a. Create a Subgraph

1. Go to [The Graph Studio](https://thegraph.com/studio/)
2. Sign in with your wallet
3. Click "Create a Subgraph"
4. Enter name: `strategy-subgraph` (or your preferred name)
5. Select network: Monad
6. Click "Create Subgraph"

#### 6b. Authenticate

Copy your deploy key from The Graph Studio and run:

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
```

#### 6c. Deploy

```bash
npm run deploy
```

Or if the script doesn't work, use the full command:

```bash
graph deploy --studio strategy-subgraph
```

**You'll be asked for a version label:**
- For first deployment: `v0.0.1`
- For updates: increment the version (e.g., `v0.0.2`, `v0.1.0`)

**Expected output:**
```
✔ Apply migrations
✔ Load subgraph from subgraph.yaml
  Compile data source: Strategy => build/Strategy/Strategy.wasm
✔ Compile subgraph
  Copy schema file build/schema.graphql
  Write subgraph file build/subgraph.yaml
  Write subgraph manifest build/subgraph.yaml
✔ Write compiled subgraph to build/
  Add file to IPFS build/schema.graphql
                .. QmHash1...
  Add file to IPFS build/Strategy/Strategy.wasm
                .. QmHash2...
✔ Upload subgraph to IPFS

Build completed: QmHash3...

Deployed to https://thegraph.com/studio/subgraph/strategy-subgraph

Subgraph endpoints:
Queries (HTTP):     https://api.studio.thegraph.com/query/<YOUR_ID>/strategy-subgraph/v0.0.1
```

### 7. Wait for Syncing

After deployment:
1. Go to The Graph Studio dashboard
2. Check the syncing status
3. Wait for the subgraph to sync (may take 5-30 minutes depending on chain history)
4. Once synced, you'll see "Synced" status

### 8. Test Your Subgraph

Use The Graph Studio's playground to test queries:

```graphql
{
  protocolStats(id: "protocol-stats") {
    lotteryCount
    auctionCount
    totalMinted
    totalRedeemed
  }
  transactions(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    type
    user
    timestamp
  }
}
```

If you see data, your subgraph is working!

### 9. Update Frontend Environment Variables

Add the subgraph URL to your frontend's `.env` file:

```bash
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<YOUR_ID>/strategy-subgraph/version/latest
```

Use `/version/latest` to always use the latest version, or use a specific version like `/v0.0.1`.

## Alternative: Local Deployment

### Prerequisites for Local Deployment

- Docker and Docker Compose
- Local Graph Node running
- Local IPFS node
- PostgreSQL database

### Local Deployment Steps

1. Start Graph Node:
   ```bash
   cd graph-node
   docker-compose up
   ```

2. Create subgraph:
   ```bash
   npm run create-local
   ```

3. Deploy:
   ```bash
   npm run deploy-local
   ```

4. Query at:
   ```
   http://localhost:8000/subgraphs/name/strategy-subgraph
   ```

## Updating the Subgraph

When you make changes to the subgraph:

1. **Update the code** (schema, mappings, or manifest)

2. **Increment the version** in your deployment

3. **Rebuild and redeploy:**
   ```bash
   npm run codegen
   npm run build
   npm run deploy
   ```

4. **Use a new version label** (e.g., `v0.0.2`)

5. **Test the new version** before updating your frontend

## Troubleshooting

### "Failed to compile" error

**Problem:** TypeScript compilation fails

**Solution:**
- Check `src/mapping.ts` for syntax errors
- Ensure all imports are correct
- Run `npm run codegen` again

### "Subgraph failed" in The Graph Studio

**Problem:** Subgraph shows "Failed" status

**Solution:**
1. Check the error logs in The Graph Studio
2. Common causes:
   - Wrong contract address
   - Wrong network
   - Start block is too early (before contract deployment)
   - ABI doesn't match the contract

### "No data returned" when querying

**Problem:** Queries return empty results

**Solution:**
1. Wait for subgraph to finish syncing
2. Check if events are actually being emitted on-chain
3. Verify the start block is before the first transaction
4. Test with a simple query like `{ protocolStats(id: "protocol-stats") { id } }`

### "Entity not found" errors in logs

**Problem:** Mapping tries to load an entity that doesn't exist

**Solution:**
- Check the logic in `src/mapping.ts`
- Ensure you're creating entities before loading them
- Use `getOrCreate` helper functions

### Syncing is very slow

**Problem:** Subgraph takes forever to sync

**Solution:**
1. Set `startBlock` to the actual deployment block (not 0)
2. This can save hours of indexing time
3. Check The Graph Studio for network issues

### ABI mismatch errors

**Problem:** "Event signature doesn't match" or similar

**Solution:**
1. Ensure `abis/Strategy.json` matches your deployed contract
2. Re-export the ABI from your contract compilation
3. Run `npm run codegen` and `npm run build` again

## Monitoring

After deployment, monitor your subgraph:

1. **The Graph Studio Dashboard:**
   - Syncing progress
   - Query performance
   - Error logs
   - Indexing status

2. **Query Metrics:**
   - Query response times
   - Error rates
   - Most common queries

3. **Indexing Status:**
   ```graphql
   {
     _meta {
       block {
         number
         hash
       }
       deployment
       hasIndexingErrors
     }
   }
   ```

## Best Practices

1. **Version your deployments:** Use semantic versioning (v0.0.1, v0.1.0, v1.0.0)
2. **Test locally first:** Deploy to a local Graph node before The Graph Studio
3. **Monitor errors:** Check logs regularly for indexing issues
4. **Optimize queries:** Use proper filtering and pagination
5. **Document changes:** Keep a changelog of schema/mapping updates
6. **Use environment variables:** Don't hardcode subgraph URLs in your frontend

## Cost Considerations

### The Graph Studio (Decentralized Network)

- **Development:** Free on testnet
- **Mainnet:** Pay for queries with GRT tokens
- **Pricing:** Based on query volume
- **Free tier:** Available for testing

### Self-hosted Graph Node

- **Infrastructure costs:** Server, storage, maintenance
- **Free queries:** No per-query costs
- **Complexity:** Requires DevOps knowledge

## Next Steps

After successful deployment:

1. [ ] Test all queries from `sample-queries.graphql`
2. [ ] Integrate with your frontend
3. [ ] Set up monitoring and alerts
4. [ ] Document any custom queries for your team
5. [ ] Consider setting up a staging subgraph for testing

## Support

- **The Graph Discord:** https://discord.gg/thegraph
- **Documentation:** https://thegraph.com/docs/
- **Forum:** https://forum.thegraph.com/

## Checklist: Pre-deployment

- [ ] Dependencies installed
- [ ] Contract address updated in `subgraph.yaml`
- [ ] Start block updated in `subgraph.yaml`
- [ ] Network configured correctly
- [ ] `npm run codegen` runs without errors
- [ ] `npm run build` runs without errors
- [ ] Graph Studio account created
- [ ] Deploy key obtained

## Checklist: Post-deployment

- [ ] Subgraph synced successfully
- [ ] Test queries return expected data
- [ ] Frontend `.env` updated with subgraph URL
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team notified of new subgraph URL
