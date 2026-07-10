const nodemailer = require("nodemailer");

/**
 * Creates a reusable Nodemailer transporter using Gmail SMTP.
 * Requires EMAIL_USER and EMAIL_PASS in .env
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends a booking confirmation email to the patient after slot selection.
 * @param {Object} params
 * @param {string} params.toEmail
 * @param {string} params.patientName
 * @param {string} params.date - YYYY-MM-DD
 * @param {string} params.startTime - HH:MM
 * @param {string} params.endTime - HH:MM
 */
const sendBookingConfirmation = async ({ toEmail, patientName, date, startTime, endTime }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[EmailService] Email credentials not set — skipping confirmation email.");
    return;
  }

  const transporter = createTransporter();

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mailOptions = {
    from: `"Smriti IVF" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "✅ Video Consultation Booking Confirmed — Smriti IVF",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
        <div style="background: #2c7a7b; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">Smriti IVF — Video Consultation</h1>
        </div>
        <div style="background: #fff; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151;">Dear <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Your video consultation slot has been <strong style="color: #2c7a7b;">successfully booked</strong>. 
            Our team will confirm your appointment and send you the Google Meet link shortly.
          </p>
          <div style="background: #f0fdf4; border-left: 4px solid #2c7a7b; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #374151;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0 0; font-size: 15px; color: #374151;"><strong>🕐 Time:</strong> ${startTime} – ${endTime}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            If you need to reschedule or have any questions, please contact us at 
            <a href="mailto:${process.env.EMAIL_USER}" style="color: #2c7a7b;">${process.env.EMAIL_USER}</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 13px; color: #9ca3af; text-align: center;">© ${new Date().getFullYear()} Smriti IVF. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[EmailService] Booking confirmation sent to ${toEmail}`);
};

/**
 * Sends the Google Meet video link to the patient when admin adds it.
 * @param {Object} params
 * @param {string} params.toEmail
 * @param {string} params.patientName
 * @param {string} params.videoLink
 * @param {string} params.date - YYYY-MM-DD
 * @param {string} params.startTime - HH:MM
 * @param {string} params.endTime - HH:MM
 * @param {string} [params.meetingNotes]
 */
const sendVideoLinkEmail = async ({ toEmail, patientName, videoLink, date, startTime, endTime, meetingNotes }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[EmailService] Email credentials not set — skipping video link email.");
    return;
  }

  const transporter = createTransporter();

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mailOptions = {
    from: `"Smriti IVF" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🎥 Your Google Meet Link — Smriti IVF Video Consultation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
        <div style="background: #2c7a7b; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">Smriti IVF — Video Consultation</h1>
        </div>
        <div style="background: #fff; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151;">Dear <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Your video consultation is <strong style="color: #2c7a7b;">confirmed</strong>! 
            Please join the Google Meet at the scheduled time using the link below.
          </p>
          <div style="background: #f0fdf4; border-left: 4px solid #2c7a7b; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; color: #374151;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0 0; font-size: 15px; color: #374151;"><strong>🕐 Time:</strong> ${startTime} – ${endTime}</p>
            ${meetingNotes ? `<p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;"><strong>📝 Notes:</strong> ${meetingNotes}</p>` : ""}
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${videoLink}" 
               style="background: #2c7a7b; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              🎥 Join Google Meet
            </a>
          </div>
          <p style="font-size: 13px; color: #6b7280; text-align: center;">
            Or copy this link: <a href="${videoLink}" style="color: #2c7a7b;">${videoLink}</a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Please be ready 5 minutes before your scheduled time. 
            For any queries, contact us at 
            <a href="mailto:${process.env.EMAIL_USER}" style="color: #2c7a7b;">${process.env.EMAIL_USER}</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 13px; color: #9ca3af; text-align: center;">© ${new Date().getFullYear()} Smriti IVF. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[EmailService] Video link email sent to ${toEmail}`);
};

module.exports = { sendBookingConfirmation, sendVideoLinkEmail };

