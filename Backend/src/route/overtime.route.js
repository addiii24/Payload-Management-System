/**
 * @file overtime.route.js
 * @description Express router for Overtime CRUD.
 *
 *  Base path (mounted in App.js): /api/overtime
 *  All routes protected by JWT verifyToken middleware.
 */

import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { upsertOT, getOTRecords, updateOT, deleteOT } from "../controller/overtime.controller.js";

const router = express.Router();
router.use(verifyToken);

router.route("/").post(upsertOT).get(getOTRecords);
router.route("/:id").put(updateOT).delete(deleteOT);

export default router;
