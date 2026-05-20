import express from "express"
import { connectDB, disconnectDB } from "./config/conifgdb.js"
import dotenv from "dotenv"

dotenv.config()

const app = express()

const PORT = 3001

connectDB().then(() => {
    app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`)
    })
})
.catch(() => {
    disconnectDB()
})