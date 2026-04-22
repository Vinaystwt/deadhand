import { getRuntimeConfigTruth } from "../domain/configTruth.js";
import { getIntegrationRuntimeStatus } from "../domain/integrations.js";
import { DemoWalletService } from "../services/demoWallet/demoWalletService.js";

async function main() {
  const config = getRuntimeConfigTruth();
  const integrations = getIntegrationRuntimeStatus();
  const demoWallet = new DemoWalletService();
  const walletStatus = await demoWallet.getStatus();

  console.log(
    JSON.stringify(
      {
        config,
        integrations,
        demoWallet: walletStatus
      },
      null,
      2
    )
  );

  if (!config.safeDemoModeReady) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
