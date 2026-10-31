import dotenv from  'dotenv'
import {Pool} from 'pg'

dotenv.config()

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
})

pool.connect()
    .then((client) => {
        console.log("Database connection successfully!")
        client.release()
    })

    .catch((err) => {
        console.error("Database connection failed!", err)
    })