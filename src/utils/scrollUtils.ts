export const applyElasticity = (current: number, min: number, max: number, factor: number = 0.2) => {
  if (current < min) {
    return min + (current - min) * factor;
  }
  if (current > max) {
    return max + (current - max) * factor;
  }
  return current;
};

export const calculateVelocity = (
  currentPoint: number,
  lastPoint: number,
  timeElapsed: number
): number => {
  return timeElapsed > 0 ? (lastPoint - currentPoint) / timeElapsed * 16 : 0;
};