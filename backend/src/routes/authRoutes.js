import express from "express"
import { registerUser, profile } from "../controllers/authControllers.js"

const router = express.Router()

router.post("/register", registerUser)

router.post("/login", (req, res) => {

})

router.post("/logout", (req, res) => {

})

router.get("/profile", profile)


export default router