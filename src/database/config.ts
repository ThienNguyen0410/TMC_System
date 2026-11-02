import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (error) => {
  console.error('Unexpected database error', error)
})

pool
  .connect()
  .then((client) => {
    console.log('Database connection successfully!')
    client.release()
  })
  .catch((error) => {
    console.error('Database connection failed!', error)
  })

const closePool = (): void => {
  pool.end().finally(() => process.exit(0))
}

process.once('SIGINT', closePool)
process.once('SIGTERM', closePool)
