import { execSync } from 'node:child_process';

const port = Number(process.env.PORT || 5001);

function getListeningPids(targetPort) {
  try {
    const output = execSync(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (!output) {
      return [];
    }

    return [...new Set(output.split('\n').map((value) => value.trim()).filter(Boolean))];
  } catch (error) {
    if (error.status === 1) {
      return [];
    }

    throw error;
  }
}

function killPids(pids, force = false) {
  if (!pids.length) {
    return;
  }

  const signal = force ? '-9' : '-15';
  execSync(`kill ${signal} ${pids.join(' ')}`, {
    stdio: ['ignore', 'ignore', 'ignore']
  });
}

try {
  const initialPids = getListeningPids(port);
  if (!initialPids.length) {
    process.exit(0);
  }

  killPids(initialPids, false);

  const remainingPids = getListeningPids(port);
  if (remainingPids.length) {
    killPids(remainingPids, true);
  }

  console.log(`[port-cleanup] Freed port ${port}.`);
} catch (error) {
  console.warn(`[port-cleanup] Could not free port ${port}: ${error.message}`);
}
