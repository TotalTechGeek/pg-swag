/**
 * @pineapple_import
 * @param {Date} param
 * Checks if the date is pretty close to the current date
 */
export function currentTime (param) {
  return Math.abs(new Date() - param) < 100
}
