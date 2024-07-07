import { Swag } from './index.js'

export const swag = new Swag({
  password: 'postgres',
  user: 'postgres',
  host: 'localhost'
})

/**
 * @pineapple_import
 * @param {Date} param
 * Checks if the date is pretty close to the current date
 */
export function currentTime (param) {
  return Math.abs(new Date() - param) < 100
}
