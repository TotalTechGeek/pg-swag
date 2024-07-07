import { Swag } from './index.js'

const swag = new Swag({
  password: 'postgres',
  user: 'postgres',
  host: 'localhost'
})

/**
 * @test void resolves
 */
export async function Example () {
  await swag.schedule('test', 'Test', 'R1/PT1S', {})

  return new Promise(resolve => {
    swag.on('test', job => {
      resolve()
    })
  })
}
