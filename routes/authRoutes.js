const express = require("express")
const logout=require('../controllers/authController')



const router = express.Router()


router.route("/logout").post(logout);




module.exports = router