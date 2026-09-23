import { defineNitroPlugin } from 'nitropack/runtime';
import { closeDatabase } from '~/utils/db';

export default defineNitroPlugin((nitroApp) => {
  let closing: Promise<void> | undefined;
  const shutdown = () => {
    closing ??= closeDatabase().catch((error) => {
      console.error('[runtime] failed to close database', error);
    });
    return closing;
  };

  nitroApp.hooks.hook('close', shutdown);

  // PGlite owns a worker/process-like runtime. If the host sends SIGTERM,
  // close it explicitly and terminate only after the database has released
  // its lock file; otherwise the supervisor may escalate to SIGKILL (137).
  const handleSignal = async (signal: NodeJS.Signals) => {
    await shutdown();
    process.exitCode = 0;
    if (signal === 'SIGINT' || signal === 'SIGTERM') process.exit(0);
  };
  process.once('SIGTERM', () => void handleSignal('SIGTERM'));
  process.once('SIGINT', () => void handleSignal('SIGINT'));
});
