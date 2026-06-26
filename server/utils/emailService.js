const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

let transporter = null;

const initTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '2525'),
      auth: {
        user,
        pass
      }
    });
    console.log('SMTP Email Transporter configured successfully.');
  } else {
    console.log('Email Transporter Status: Running in Simulation mode.');
    transporter = null;
  }
};

initTransporter();

/**
 * Sends an email notification.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 * @param {Array} attachments - Optional nodemailer attachments
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const from = process.env.SMTP_FROM || 'billing@manvithatours.com';

  if (!transporter) {
    console.log('\n--- SIMULATED EMAIL DISPATCH ---');
    console.log(`FROM:    ${from}`);
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:    ${text || 'HTML content supplied'}`);
    console.log(`ATTACHMENTS count: ${attachments ? attachments.length : 0}`);
    console.log('--------------------------------\n');
    return { messageId: 'simulated-id-' + Date.now(), simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments
    });
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    // fallback simulation on error so the application logic does not crash
    console.log('Fallback: Simulated email sent because SMTP failed.');
    return { messageId: 'simulated-id-error-' + Date.now(), simulated: true };
  }
};

module.exports = { sendEmail };
