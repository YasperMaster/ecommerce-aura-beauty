import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { registerSchema } from "../schemas/authSchema.js"
import UserModel from "../models/UserModel.js"

export const registerUser = async (req, res) => {
    try {

        const JWT_SECRET = process.env.JWT_SECRET

        const { username, email, password } = registerSchema.parse(req.body)

        const existingUser = await UserModel.findOne({ email })

        if (existingUser) {
            return res.status(400).json({ message: "Correo electrónico ya registrado."})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const isFirstUser = (await UserModel.countDocuments()) === 0 

        const newUser = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            isAdmin: isFirstUser,
        })

        const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { 
            expiresIn: "1h",
        })

        console.log("NEW USER", newUser)
        console.log("token", token)

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 60 * 60 *1000,
        })
            .status(201)
            .json({ message: "User registered successfully" })
    } catch (error) {
        res.json(error)
    }
}