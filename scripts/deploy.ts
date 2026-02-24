import { ethers, run } from 'hardhat';

const DEFAULT_RECEIVER = '0x62f2df490e0b72e0d3b3d1c6c65f5c49f56d66e2';
const DEFAULT_PRICE_WEI = ethers.parseEther('0.00001');

async function main() {
  if (!process.env.BASE_RPC_URL) {
    throw new Error(
      'Missing BASE_RPC_URL. Add BASE_RPC_URL to .env.local before running deploy.',
    );
  }

  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error(
      'Missing DEPLOYER_PRIVATE_KEY. Add DEPLOYER_PRIVATE_KEY to .env.local before running deploy.',
    );
  }

  const factory = await ethers.getContractFactory('ShooterPaywall');
  const contract = await factory.deploy(DEFAULT_RECEIVER, DEFAULT_PRICE_WEI);
  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx) {
    console.log(`Deployment tx hash: ${deploymentTx.hash}`);
  }
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`ShooterPaywall deployed at: ${address}`);
  console.log('Copy this address into lib/contract.ts -> PAYWALL_ADDRESS');

  if (process.env.BASESCAN_API_KEY) {
    console.log('Waiting before verification...');
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    await run('verify:verify', {
      address,
      constructorArguments: [DEFAULT_RECEIVER, DEFAULT_PRICE_WEI.toString()],
    });
    console.log('Contract verified on BaseScan');
  } else {
    console.log('BASESCAN_API_KEY is not set. Skipping verification.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
