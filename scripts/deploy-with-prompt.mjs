import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';

const DEFAULT_RPC = 'https://mainnet.base.org';
const ADDRESS_REGEX = /ShooterPaywall deployed at:\s*(0x[a-fA-F0-9]{40})/;
const TX_REGEX = /Deployment tx hash:\s*(0x[a-fA-F0-9]{64})/;

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.stdoutMuted = true;
    rl._writeToOutput = function writeToOutput(text) {
      if (!rl.stdoutMuted) rl.output.write(text);
    };

    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function updatePaywallAddress(contractAddress) {
  const targetPath = path.join(process.cwd(), 'lib', 'contract.ts');
  const previous = fs.readFileSync(targetPath, 'utf8');
  const updated = previous.replace(
    /export const PAYWALL_ADDRESS = '0x[a-fA-F0-9]{40}';/,
    `export const PAYWALL_ADDRESS = '${contractAddress}';`,
  );

  if (previous === updated) {
    throw new Error('Failed to update PAYWALL_ADDRESS in lib/contract.ts');
  }

  fs.writeFileSync(targetPath, updated, 'utf8');
}

async function runDeploy() {
  const rpcInput = await ask(`BASE_RPC_URL [${DEFAULT_RPC}]: `);
  const baseRpcUrl = rpcInput || DEFAULT_RPC;
  const deployerPrivateKey = await askHidden('DEPLOYER_PRIVATE_KEY (hidden input): ');
  const baseScanApiKey = await ask('BASESCAN_API_KEY (optional, press Enter to skip): ');

  if (!deployerPrivateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY is required.');
  }

  const env = {
    ...process.env,
    BASE_RPC_URL: baseRpcUrl,
    DEPLOYER_PRIVATE_KEY: deployerPrivateKey,
    BASESCAN_API_KEY: baseScanApiKey,
  };

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['hardhat', 'run', 'scripts/deploy.ts', '--network', 'base'];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdoutBuffer += text;
    process.stdout.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(`Deploy failed with exit code ${exitCode}.`);
  }

  const output = `${stdoutBuffer}\n${stderrBuffer}`;
  const addressMatch = output.match(ADDRESS_REGEX);
  const txMatch = output.match(TX_REGEX);
  const contractAddress = addressMatch?.[1];

  if (!contractAddress) {
    throw new Error('Could not find deployed contract address in deploy output.');
  }

  updatePaywallAddress(contractAddress);

  const txHash = txMatch?.[1] ?? null;

  console.log('\nDeploy complete:');
  if (txHash) {
    console.log(`- tx hash: ${txHash}`);
    console.log(`- tx link: https://basescan.org/tx/${txHash}`);
  } else {
    console.log('- tx hash: not found in output');
  }
  console.log(`- contract address: ${contractAddress}`);
  console.log(`- contract link: https://basescan.org/address/${contractAddress}`);
  console.log('- Updated lib/contract.ts (PAYWALL_ADDRESS)');
}

runDeploy().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
