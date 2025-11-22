#!/usr/bin/env node

/**
 * Configuration Helper for Strategy Subgraph
 *
 * This script helps you configure the subgraph.yaml file with the correct
 * contract address and start block.
 *
 * Usage:
 *   node config-helper.js
 *
 * Or make it executable and run:
 *   chmod +x config-helper.js
 *   ./config-helper.js
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Strategy Subgraph Configuration Helper');
  console.log('='.repeat(60));
  console.log();

  // Read current subgraph.yaml
  const subgraphPath = path.join(__dirname, 'subgraph.yaml');
  let subgraphContent = fs.readFileSync(subgraphPath, 'utf8');

  console.log('Current configuration:');
  console.log();

  // Extract current values
  const addressMatch = subgraphContent.match(/address: ["']([^"']+)["']/);
  const startBlockMatch = subgraphContent.match(/startBlock: (\d+)/);
  const networkMatch = subgraphContent.match(/network: ([^\s]+)/);

  const currentAddress = addressMatch ? addressMatch[1] : 'Not set';
  const currentStartBlock = startBlockMatch ? startBlockMatch[1] : 'Not set';
  const currentNetwork = networkMatch ? networkMatch[1] : 'Not set';

  console.log(`  Contract Address: ${currentAddress}`);
  console.log(`  Start Block: ${currentStartBlock}`);
  console.log(`  Network: ${currentNetwork}`);
  console.log();

  // Check if .env file exists in StrategyWeb
  const envPath = path.join(__dirname, '..', 'StrategyWeb', '.env');
  let suggestedAddress = null;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envAddressMatch = envContent.match(/VITE_CONTRACT_ADDRESS=["']?([^"'\s]+)["']?/);
    if (envAddressMatch) {
      suggestedAddress = envAddressMatch[1];
      console.log(`Found contract address in StrategyWeb/.env: ${suggestedAddress}`);
      console.log();
    }
  }

  // Ask for new values
  console.log('Enter new configuration values (press Enter to keep current):');
  console.log();

  const addressPrompt = suggestedAddress
    ? `Contract Address (current: ${currentAddress}, suggested: ${suggestedAddress}): `
    : `Contract Address (current: ${currentAddress}): `;

  const newAddress = await question(addressPrompt);
  const newStartBlock = await question(`Start Block (current: ${currentStartBlock}): `);
  const newNetwork = await question(`Network (current: ${currentNetwork}): `);

  // Use suggested or current values if not provided
  const finalAddress = newAddress.trim() || suggestedAddress || currentAddress;
  const finalStartBlock = newStartBlock.trim() || currentStartBlock;
  const finalNetwork = newNetwork.trim() || currentNetwork;

  console.log();
  console.log('New configuration:');
  console.log(`  Contract Address: ${finalAddress}`);
  console.log(`  Start Block: ${finalStartBlock}`);
  console.log(`  Network: ${finalNetwork}`);
  console.log();

  const confirm = await question('Update subgraph.yaml with these values? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('Configuration cancelled.');
    rl.close();
    return;
  }

  // Update subgraph.yaml
  subgraphContent = subgraphContent.replace(
    /address: ["']([^"']+)["']/,
    `address: "${finalAddress}"`
  );
  subgraphContent = subgraphContent.replace(
    /startBlock: \d+/,
    `startBlock: ${finalStartBlock}`
  );
  subgraphContent = subgraphContent.replace(
    /network: ([^\s]+)/,
    `network: ${finalNetwork}`
  );

  // Backup original file
  const backupPath = path.join(__dirname, 'subgraph.yaml.backup');
  fs.copyFileSync(subgraphPath, backupPath);
  console.log(`Backup created: ${backupPath}`);

  // Write updated file
  fs.writeFileSync(subgraphPath, subgraphContent, 'utf8');
  console.log(`Updated: ${subgraphPath}`);

  console.log();
  console.log('Configuration complete!');
  console.log();
  console.log('Next steps:');
  console.log('  1. Run: npm run codegen');
  console.log('  2. Run: npm run build');
  console.log('  3. Run: npm run deploy');
  console.log();

  // Validate address
  if (!/^0x[a-fA-F0-9]{40}$/.test(finalAddress)) {
    console.log('⚠️  WARNING: The contract address format looks invalid.');
    console.log('   Make sure it\'s a valid Ethereum address (0x followed by 40 hex characters).');
    console.log();
  }

  // Validate start block
  if (finalStartBlock === '0') {
    console.log('⚠️  WARNING: Start block is set to 0.');
    console.log('   This will index from the genesis block, which may take a long time.');
    console.log('   Consider setting it to the block where your contract was deployed.');
    console.log();
  }

  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
