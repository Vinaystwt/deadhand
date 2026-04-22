import { createServices } from "../index.js";
import { demoPersonas } from "./demoFixtures.js";

async function main(): Promise<void> {
  const services = createServices();
  const seeded = [];
  for (const persona of demoPersonas) {
    const policy = await services.policy.create(persona.userId, {
      walletAddress: persona.walletAddress,
      ...persona.policy
    });
    seeded.push({
      persona: persona.name,
      walletAddress: persona.walletAddress,
      policy,
      sampleGoals: persona.goals
    });
  }

  console.log(JSON.stringify({ seeded }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
