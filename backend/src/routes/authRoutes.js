import express from "express"

const router = express.Router()

router.post("/register", (req, res) => {
    console.log("POST request to /register")

    res.json({ message: "POST request to /register" })
})

export default router