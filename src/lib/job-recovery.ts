/**
 * Job recovery — persist fal.ai requestIds so in-progress jobs
 * can be resumed after a page refresh.
 */

const JOBS_KEY = "cutagent-active-jobs";

export interface ActiveJob {
  sceneId: string;
  requestId: string;
  endpointId: string;
  startedAt: number;
}

/**
 * Save an active generation job.
 */
export function saveActiveJob(job: ActiveJob): void {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    const jobs: ActiveJob[] = raw ? JSON.parse(raw) : [];
    // Remove existing job for this scene
    const filtered = jobs.filter((j) => j.sceneId !== job.sceneId);
    filtered.push(job);
    localStorage.setItem(JOBS_KEY, JSON.stringify(filtered));
  } catch { /* ignore */ }
}

/**
 * Remove a completed/failed job.
 */
export function removeActiveJob(sceneId: string): void {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return;
    const jobs: ActiveJob[] = JSON.parse(raw);
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.filter((j) => j.sceneId !== sceneId)));
  } catch { /* ignore */ }
}

/**
 * Get all active jobs (e.g., on page reload).
 * Filters out jobs older than 15 minutes (likely expired).
 */
export function getActiveJobs(): ActiveJob[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return [];
    const jobs: ActiveJob[] = JSON.parse(raw);
    const cutoff = Date.now() - 15 * 60 * 1000; // 15 min
    return jobs.filter((j) => j.startedAt > cutoff);
  } catch {
    return [];
  }
}

/**
 * Clear all active jobs.
 */
export function clearActiveJobs(): void {
  localStorage.removeItem(JOBS_KEY);
}
