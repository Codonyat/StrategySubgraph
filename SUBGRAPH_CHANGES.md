# Subgraph Migration Guide

This document outlines the changes made to the subgraph for the megaeth-testnet deployment and ERC20 MEGA collateral migration.

## Network Configuration

| Setting | Old Value | New Value |
|---------|-----------|-----------|
| Network | `monad-testnet` | `megaeth-testnet` |
| Chain ID | - | `6343` |
| Contract Address | `0xc9c15ac49e74b7d093cb8ef5df2dc0987aae8499` | `0xa5C82dE4a62A4afD339A2dbAA1b6872143246E8E` |
| Start Block | `52161078` | `4958400` |

---

## Breaking Schema Changes

### AuctionPrize Entity

| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `stratAmount` | `tokenAmount` | Amount of GIGA tokens won |
| `monPaid` | `nativePaid` | Amount of MEGA paid for auction |

### Transaction Entity

| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `monAmount` | `collateralAmount` | MEGA collateral amount |
| `stratAmount` | `tokenAmount` | GIGA token amount |

---

## GraphQL Query Updates

### Fetching Auction Prizes

```graphql
# OLD - Will no longer work
query {
  auctionPrizes {
    id
    day
    winner
    stratAmount    # REMOVED
    monPaid        # REMOVED
    claimed
  }
}

# NEW - Use these field names
query {
  auctionPrizes {
    id
    day
    winner
    tokenAmount    # Renamed from stratAmount
    nativePaid     # Renamed from monPaid
    claimed
  }
}
```

### Fetching Transactions

```graphql
# OLD - Will no longer work
query {
  transactions {
    id
    type
    user
    monAmount      # REMOVED
    stratAmount    # REMOVED
    fee
    timestamp
  }
}

# NEW - Use these field names
query {
  transactions {
    id
    type
    user
    collateralAmount  # Renamed from monAmount
    tokenAmount       # Renamed from stratAmount
    fee
    timestamp
  }
}
```

---

## Token Decimal Changes

| Token | Symbol | Decimals |
|-------|--------|----------|
| Old Strategy Token | MONSTR | 18 |
| New Strategy Token | GIGA | 21 |
| Old Collateral | Native MON | 18 |
| New Collateral | MEGA (ERC20) | 18 |

### Display Formatting

```javascript
// OLD - 18 decimals
const formatted = ethers.formatUnits(amount, 18);

// NEW - GIGA uses 21 decimals
const gigaFormatted = ethers.formatUnits(gigaAmount, 21);

// MEGA still uses 18 decimals
const megaFormatted = ethers.formatUnits(megaAmount, 18);
```

### Collateral Ratio

- **Old**: 1:1 (1 MON = 1 MONSTR)
- **New**: 1000:1 in display units (1000 MEGA = 1 GIGA), but 1:1 in base units

---

## Frontend Checklist

- [ ] Update all GraphQL queries to use new field names
- [ ] Update `stratAmount` references to `tokenAmount`
- [ ] Update `monAmount` references to `collateralAmount`
- [ ] Update `monPaid` references to `nativePaid`
- [ ] Update decimal formatting for GIGA (21 decimals)
- [ ] Update subgraph endpoint URL for megaeth-testnet
- [ ] Test all auction-related displays
- [ ] Test all transaction-related displays
- [ ] Update any caching logic that references old field names

---

## Subgraph Endpoint

After deployment, update your frontend to use the new subgraph endpoint:

```javascript
// Update your subgraph URL
const SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_xxx/subgraphs/giga-testnet-subgraph-1/0.0.1/gn";
```

---

## Questions?

Refer to the main `MIGRATION.md` in the Etherium repository for full contract migration details.
