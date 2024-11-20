import pgPromise from 'pg-promise'
import { Swag } from './index.js'
process.env.TZ = 'UTC'
export const pgConfig = {
  config: {
    password: 'postgres',
    user: 'postgres',
    host: 'localhost'
  },
  dialect: 'postgres'
}

export const mySqlConfig = {
  config: {
    user: 'root',
    host: 'localhost',
    database: 'mysql'
  },
  dialect: 'mysql'
}

export const sqliteConfig = {
  config: {
    file: 'yeet.db'
  },
  dialect: 'sqlite'
}

const pgp = pgPromise()
const db = pgp(pgConfig.config)

export const pgConfigAttached = {
  query: db.query,
  dialect: 'postgres'
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

/**
 * Checks if the date is pretty close to another date
 * @param {Date} param
 * @param {Date} to
 * @pineapple_import
 */
export function isCloseTo (param, to) {
  return Math.abs(param - to) < 100
}
