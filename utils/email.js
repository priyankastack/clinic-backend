const nodemailer = require("nodemailer");

const sendDoctorCredentialsEmail = async (toEmail, resetToken, doctorName) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: `"Your Clinic" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Your Doctor Account Credentials",
      html: `
        <h3>Welcome, Dr. ${doctorName}!</h3>
        <p>Your account has been created.</p>
        <p>Please click below to set your password and activate your account:</p>
        <a href="http://localhost:3000/doctors/resetPassword?token=${resetToken}">Set Your Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending email:", err.message);
    throw new Error("Email sending failed");
  }
};



module.exports =  sendDoctorCredentialsEmail ;
