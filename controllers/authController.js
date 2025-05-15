const asyncHandler = require("express-async-handler");

// Logout handler for all roles (Admin, Doctor, User)
const logout = asyncHandler(async (req, res) => {
  // Clear the authToken cookie
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",  // Ensure it's only secure in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",  // Cross-origin requests in production
    expires: new Date(0),  // Expire the cookie immediately
  });

  // Optional: Blacklist the token (uncomment if using a blacklist)
  /*let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }

  // Blacklisting (optional)
  if (token) {
    const BlacklistedToken = require("../models/blacklistedTokenModel");
    await BlacklistedToken.create({
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Match token's 30-day expiration
    });
  }
*/
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports =  logout ;
