export const calculateVelocity = (
  currentPoint: number,
  lastPoint: number,
  timeElapsed: number
): number => {
  return timeElapsed > 0 ? (lastPoint - currentPoint) / timeElapsed * 16 : 0;
};