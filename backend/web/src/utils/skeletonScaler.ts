import { BodyProportions } from '../types';

/**
 * Calculate scale factor to match reference skeleton to rider skeleton
 */
export function calculateScaleFactor(
  referenceProp: BodyProportions,
  riderProp: BodyProportions
): number {
  // Use height as the primary scaling metric
  if (referenceProp.height === 0 || riderProp.height === 0) {
    return 1;
  }
  return riderProp.height / referenceProp.height;
}

/**
 * Check if proportion mismatch is significant (more than 20% difference)
 */
export function isProportionMismatchSignificant(
  referenceProp: BodyProportions,
  riderProp: BodyProportions,
  threshold: number = 0.2
): boolean {
  const scaleFactor = calculateScaleFactor(referenceProp, riderProp);
  return Math.abs(scaleFactor - 1) > threshold;
}
