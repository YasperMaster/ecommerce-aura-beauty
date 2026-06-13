import express from "express";
import webHookController from "../controllers/webHookController.js";

const router = express.Router();

router.post("/", webHookController);

export default router;
