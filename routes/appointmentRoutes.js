const express = require("express")
const {
  getAppointments,
  getAppointmentById,
  getDoctorAppointments,
  createAppointment,
  cancelAppointment,
  getAvailableTimeSlots,
  updateAppointmentStatus,
  rescheduleAppointment,
  
} = require("../controllers/appointmentController")
const { protect } = require("../middleware/authMiddleware")

const router = express.Router()



router.route("/doctors").get(protect,getDoctorAppointments);
router.route("/").get(protect, getAppointments).post(protect, createAppointment);
/*router.route("/").post(protect, createAppointment);*/
router.route("/:id").get(protect, getAppointmentById).delete(protect, cancelAppointment);
router.route("/user").get(protect, getAppointmentById);
router.route("/available/:doctorId/:date").get(protect, getAvailableTimeSlots);
router.route("/status/:id").patch(protect, updateAppointmentStatus);
router.put('/reschedule/:id', protect, rescheduleAppointment);





module.exports = router