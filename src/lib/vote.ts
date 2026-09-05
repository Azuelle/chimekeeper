/**
 * 计票与处决判定（F-05）
 */

/** 通过所需票数：存活人数的一半，向上取整 */
export function votesNeeded(aliveCount: number): number {
  return Math.ceil(aliveCount / 2);
}

export function votePassed(votesFor: number, aliveCount: number): boolean {
  return votesFor >= votesNeeded(aliveCount);
}
