const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Doctor = require("../models/doctorModel");
const User = require("../models/userModel"); // Used for both patients and admins

// Middleware to protect routes (for doctors, patients, and admins)
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookies
  if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
    console.log("Token found in cookies:", token);
  } 
  // Fallback: Check in Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token, reject
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    let user;

    // Identify user type and fetch from DB
    if (decoded.role === "doctor") {
      user = await Doctor.findById(decoded.id).select("-password");
    } else if (decoded.role === "patient" || decoded.role === "admin") {
      user = await User.findById(decoded.id).select("-password");
    } else {
      return res.status(401).json({ message: "Not authorized, invalid role" });
    }

    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    req.user = user; // Attach user to the request
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
});

// Admin-only middleware
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
});

module.exports = { protect, admin };
