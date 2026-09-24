import dotenv from 'dotenv'
import app from './app.js'
import connectDb from './db/postgres.js'

dotenv.config({
    path: './.env'
})

connectDb()
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(`🚀 WearYourStyle server running on port ${process.env.PORT || 3000}`);
        })
    })
    .catch((err) => {
        console.error("❌ Neon Postgres connection failed", err)
        process.exitCode = 1
    })
