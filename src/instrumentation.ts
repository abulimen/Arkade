// Runs once at server boot: restores room snapshots so a restart resumes games (ARCHITECTURE 13).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getManager } = await import('./server/rooms/manager');
    getManager();
  }
}
