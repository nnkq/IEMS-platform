const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const sendMail = async (to, subject, html) => {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    html
  });
};

module.exports = sendMail;