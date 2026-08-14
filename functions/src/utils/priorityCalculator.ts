/**
 * Algorithmic Priority Score Calculator for Artisan Matching
 * Section 5.1 PRD Heuristic Implementation
 */

export interface PriorityCalculatorInput {
  reputation_score: number;       // 0.0 to 5.0
  completed_jobs: number;         // Count of completed jobs
  avg_response_minutes: number;    // Average response time in minutes
  verified: boolean;              // Verification status
}

/**
 * Calculates the Priority Score (0.0 to 1.0) for an artisan matching a job request.
 */
export const calculatePriorityScore = (artisan: PriorityCalculatorInput): number => {
  // 1. Reputation Score (40% Weight) - normalized from 0-5 scale
  const repScore = Math.max(0, Math.min(5, artisan.reputation_score || 0));
  const repWeight = (repScore / 5.0) * 0.40;

  // 2. Completed Jobs (30% Weight) - capped at 50 jobs
  const jobsCompleted = Math.max(0, artisan.completed_jobs || 0);
  const jobsWeight = (Math.min(jobsCompleted, 50) / 50) * 0.30;

  // 3. Response Speed (20% Weight)
  const avgSpeed = artisan.avg_response_minutes ?? 60; // default 60 mins if unrecorded
  let speedWeight = 0;
  if (avgSpeed < 30) {
    speedWeight = 0.20;
  } else if (avgSpeed < 120) {
    speedWeight = 0.10;
  } else if (avgSpeed < 1440) {
    speedWeight = 0.04;
  } else {
    speedWeight = 0.0;
  }

  // 4. Verification Bonus (10% Weight)
  const verifyWeight = artisan.verified ? 0.10 : 0;

  // Total Priority Score (max 1.0)
  const totalScore = repWeight + jobsWeight + speedWeight + verifyWeight;

  return Math.round(totalScore * 10000) / 10000; // Round to 4 decimal places
};
