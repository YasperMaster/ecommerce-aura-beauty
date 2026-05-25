import express from "express"
import { connectDB, disconnectDB } from "./config/conifgdb.js"
import dotenv from "dotenv"
import authRoutes from "./routes/authRoutes.js"
import cors from "cors"
import cookieParser from "cookie-parser"

dotenv.config()

const app = express()

const PORT = 3001

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Set-Cookie"],
    credentials: true,
}))

app.use(cookieParser())

app.use(express.json())

app.use("/api/auth", authRoutes)

connectDB().then(() => {
    app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`)
    })
})
.catch(() => {
    disconnectDB()
})