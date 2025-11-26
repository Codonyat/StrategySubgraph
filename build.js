#!/usr/bin/env node

/**
 * Build Script for Strategy Subgraph
 *
 * This script:
 * 1. Loads environment variables from .env
 * 2. Populates subgraph.yaml with contract address, network, and start block
 * 3. Runs codegen and build commands
 *
 * Usage:
 *   node build.js [options]
 *
 * Options:
 *   --config-only    Only update subgraph.yaml, don't run codegen/build
 *   --deploy         Deploy after building (requires GOLDSKY_KEY in .env)
 *   --help           Show this help message
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function showHelp() {
  console.log(`
${colors.bright}Strategy Subgraph Build Script${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node build.js [options]

${colors.cyan}Options:${colors.reset}
  --config-only    Only update subgraph.yaml, don't run codegen/build
  --deploy         Deploy to Goldsky after building
  --help           Show this help message

${colors.cyan}Environment Variables (from .env):${colors.reset}
  ADDRESS          Contract address (required)
  NETWORK          Network: monad-testnet, monad, or megaeth-testnet (required)
  START_BLOCK      Start block number (optional, defaults to 0)
  GOLDSKY_KEY      Goldsky API key (required for --deploy)

${colors.cyan}Examples:${colors.reset}
  node build.js                  # Full build
  node build.js --config-only    # Only update config
  node build.js --deploy         # Build and deploy to Goldsky
`);
}

function loadEnv() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    error('.env file not found!');
    info('Create a .env file with the following variables:');
    console.log('  ADDRESS=0x...');
    console.log('  NETWORK=monad-testnet, monad, or megaeth-testnet');
    console.log('  START_BLOCK=0 (optional)');
    console.log('  GOLDSKY_KEY=your_key (required for deployment)');
    info('You can copy .env.example to .env and edit it.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      // Remove quotes if present
      env[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });

  return env;
}

function validateEnv(env, requireGoldsky = false) {
  const errors = [];

  // Check ADDRESS
  if (!env.ADDRESS) {
    errors.push('ADDRESS is required');
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(env.ADDRESS)) {
    errors.push(`ADDRESS "${env.ADDRESS}" is not a valid Ethereum address`);
  }

  // Check NETWORK
  if (!env.NETWORK) {
    errors.push('NETWORK is required');
  } else if (!['monad_testnet', 'monad', 'monad-testnet', 'megaeth-testnet'].includes(env.NETWORK)) {
    errors.push(`NETWORK must be "monad-testnet", "monad_testnet", "monad", or "megaeth-testnet", got "${env.NETWORK}"`);
  }

  // Check GOLDSKY_KEY if deploying
  if (requireGoldsky && !env.GOLDSKY_KEY) {
    errors.push('GOLDSKY_KEY is required for deployment');
  }

  // Validate START_BLOCK if provided
  if (env.START_BLOCK && !/^\d+$/.test(env.START_BLOCK)) {
    errors.push(`START_BLOCK must be a number, got "${env.START_BLOCK}"`);
  }

  if (errors.length > 0) {
    error('Environment validation failed:');
    errors.forEach(err => console.log(`  • ${err}`));
    process.exit(1);
  }
}

function updateSubgraphYaml(env) {
  const subgraphPath = path.join(__dirname, 'subgraph.yaml');

  if (!fs.existsSync(subgraphPath)) {
    error('subgraph.yaml not found!');
    process.exit(1);
  }

  // Read subgraph.yaml
  let content = fs.readFileSync(subgraphPath, 'utf8');

  // Create backup
  const backupPath = path.join(__dirname, 'subgraph.yaml.backup');
  fs.copyFileSync(subgraphPath, backupPath);
  info(`Backup created: ${path.basename(backupPath)}`);

  // Get values from env with defaults
  const address = env.ADDRESS;
  const network = env.NETWORK;
  const startBlock = env.START_BLOCK || '0';

  // Replace values in subgraph.yaml
  content = content.replace(
    /address: ["']?0x[a-fA-F0-9]{40}["']?/,
    `address: "${address}"`
  );

  content = content.replace(
    /network: [^\s#]+/,
    `network: ${network}`
  );

  content = content.replace(
    /startBlock: \d+/,
    `startBlock: ${startBlock}`
  );

  // Write updated content
  fs.writeFileSync(subgraphPath, content, 'utf8');
  success('Updated subgraph.yaml');

  // Show what was configured
  console.log();
  log('Configuration:', 'bright');
  console.log(`  Address:     ${address}`);
  console.log(`  Network:     ${network}`);
  console.log(`  Start Block: ${startBlock}`);
  console.log();
}

function runCommand(command, description) {
  try {
    info(`${description}...`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    success(`${description} completed`);
    return true;
  } catch (err) {
    error(`${description} failed`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const configOnly = args.includes('--config-only');
  const deploy = args.includes('--deploy');

  // Banner
  console.log();
  log('='.repeat(60), 'bright');
  log('Strategy Subgraph Build Script', 'bright');
  log('='.repeat(60), 'bright');
  console.log();

  // Load and validate environment
  info('Loading environment variables...');
  const env = loadEnv();
  success('Environment loaded');

  validateEnv(env, deploy);
  success('Environment validated');

  // Warn about network compatibility
  if (['monad_testnet', 'monad', 'monad-testnet', 'megaeth-testnet'].includes(env.NETWORK)) {
    console.log();
    warning('This network is not supported by The Graph Studio');
    info('You must deploy to Goldsky or a self-hosted Graph Node');
    info('Use: node build.js --deploy (requires GOLDSKY_KEY in .env)');
    if (env.NETWORK === 'monad_testnet') {
      info('Note: Goldsky uses "monad-testnet" (with hyphen), not "monad_testnet"');
    }
  }

  console.log();

  // Update subgraph.yaml
  updateSubgraphYaml(env);

  // Stop here if config-only
  if (configOnly) {
    success('Configuration complete!');
    info('Run without --config-only to build the subgraph');
    process.exit(0);
  }

  // Check if node_modules exists
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    warning('node_modules not found');
    if (!runCommand('npm install', 'Installing dependencies')) {
      error('Failed to install dependencies');
      process.exit(1);
    }
    console.log();
  }

  // Run codegen
  if (!runCommand('npm run codegen', 'Running codegen')) {
    error('Codegen failed. Check the errors above.');
    process.exit(1);
  }
  console.log();

  // Run build
  if (!runCommand('npm run build:graph', 'Building subgraph')) {
    error('Build failed. Check the errors above.');
    process.exit(1);
  }
  console.log();

  success('Build complete!');
  console.log();

  // Deploy to Goldsky if requested
  if (deploy) {
    info('Deploying to Goldsky...');
    console.log();

    const subgraphName = 'strategy-subgraph';
    const version = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const deployCommand = `goldsky subgraph deploy ${subgraphName}/${version} --path . --token ${env.GOLDSKY_KEY}`;

    if (!runCommand(deployCommand, 'Deploying to Goldsky')) {
      error('Deployment failed');
      info('Make sure:');
      console.log('  1. Goldsky CLI is installed: npm install -g @goldsky/cli');
      console.log('  2. Your GOLDSKY_KEY is valid');
      console.log('  3. You have permissions to deploy');
      process.exit(1);
    }

    console.log();
    success('Deployment complete!');
    info(`Subgraph deployed as: ${subgraphName}/${version}`);
  } else {
    info('Next steps:');
    console.log('  1. Deploy to The Graph Studio:');
    console.log('     graph auth --studio <YOUR_DEPLOY_KEY>');
    console.log('     npm run deploy');
    console.log();
    console.log('  2. Or deploy to Goldsky:');
    console.log('     node build.js --deploy');
  }

  console.log();
  log('='.repeat(60), 'bright');
  success('Done!');
  log('='.repeat(60), 'bright');
  console.log();
}

// Run main function
try {
  main();
} catch (err) {
  console.error();
  error(`Unexpected error: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
}
