/**
 * @file holiday.route.js
 * @description Express router for the Company Holiday Calendar resource.
 *
 *  Base path (mounted in App.js): /api/holidays
 *
 *  Routes:
 *    POST   /api/holidays                        → createHoliday
 *    GET    /api/holidays                        → getHolidays  (?year=&type=)
 *    GET    /api/holidays/by-month               → getHolidaysByMonth (?year=&month=)
 *    GET    /api/holidays/:id                    → getHolidayById
 *    PUT    /api/holidays/:id                    → updateHoliday
 *    DELETE /api/holidays/:id                    → deleteHoliday
 *
 *  Route ordering note:
 *    /by-month must be declared BEFORE /:id to prevent Express
 *    treating "by-month" as a Mongo ObjectId parameter.
 */

import express from "express";
import {
  createHoliday,
  getHolidays,
  getHolidaysByMonth,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
} from "../controller/holiday.controller.js";

const router = express.Router();

// ── Specific sub-routes FIRST ─────────────────────────────────────────────────
router.get("/by-month", getHolidaysByMonth);

// ── Collection routes ─────────────────────────────────────────────────────────
router.route("/").post(createHoliday).get(getHolidays);

// ── Document routes ───────────────────────────────────────────────────────────
router.route("/:id").get(getHolidayById).put(updateHoliday).delete(deleteHoliday);

export default router;
