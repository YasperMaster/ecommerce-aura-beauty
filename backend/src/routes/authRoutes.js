import express from "express"
import { registerUser } from "../controllers/authControllers.js"

const router = express.Router()

router.post("/register", registerUser)

router.post("/login", (req, res) => {

})

router.post("/logout", (req, res) => {

})

router.get("/profile", (req, res) => {

})


export default router