const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const doctorSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    specialty: {
      type: String,
      required: [true, "Please add a specialty"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters long"],
      match: [/^(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).{6,}$/, "Password must contain at least one uppercase letter, one number, and one special character"]
    },
    role: {
      type: String,
      enum: ["doctor"],
      default: "doctor",
    },
    // Added fields for password reset functionality
    resetPasswordToken: { 
      type: String 
    },
    resetPasswordExpires: { 
      type: Date 
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Create JWT token method
doctorSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;