import { Swag } from './index.js'

export const pgConfig = {
  password: 'postgres',
  user: 'postgres',
  host: 'localhost'
}

export const swag = new Swag(pgConfig)

/**
 * @pineapple_import
 * @param {Date} param
 * Checks if the date is pretty close to the current date
 */
export function currentTime (param) {
  return Math.abs(new Date() - param) < 100
}
