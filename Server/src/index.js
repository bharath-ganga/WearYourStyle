import dotenv from 'dotenv'
import app from './app.js'
import connectDb from './db/postgres.js'
import seedAdmin from './seedAdmin.js'

dotenv.config({
    path: './.env'
})

app.get('/', (req, res) => {
    res.send("WearYourStyle - Server is running")
})

connectDb()
    .then(() => {
        seedAdmin();
        app.listen(process.env.PORT || 3000, () => {
            console.log(`🚀 WearYourStyle server running on port ${process.env.PORT || 3000}`);
        })
    })
    .catch((err) => {
        console.error("❌ Neon Postgres connection failed", err)
    })
