import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        const dbURI = process.env.MONGO_DB_URI.replace("<db_username>", process.env.MONGO_DB_USER).replace("<db_password>", process.env.MONGO_DB_PASSWORD).replace("<db_name>", process.env.MONGO_DB_NAME)
        await mongoose.connect(dbURI)
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log("Error to connect MongoDB: ", error)
    }
}

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect()
        console.log("Database disconnected")
    } catch (error) {
        console.log("Error disconnecting database: ", error)
    }
}