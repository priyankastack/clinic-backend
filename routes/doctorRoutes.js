const express = require("express")
const {
  resetPassword,
  loginDoctor,
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,

} = require("../controllers/doctorController")
const { protect, admin } = require("../middleware/authMiddleware")
const { loginAdmin } = require("../controllers/adminController")

const router = express.Router()

router.route("/").get(getDoctors).post(protect, admin, createDoctor)
router.route("/login").post(loginDoctor)
router.route("/resetPassword/:token").post(resetPassword)
router.route("/:id").get(getDoctorById).patch(protect, admin, updateDoctor).delete(protect, admin, deleteDoctor)

module.exports = router
