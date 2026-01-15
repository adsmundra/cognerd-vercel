import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_PASS;

const transporter = gmailUser && gmailPass
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })
  : null;

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) => {
  if (!transporter) {
    console.log('📧 Email would be sent:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', html || text);
    console.log('\n⚠️  Add GMAIL_USER/GMAIL_PASS to .env.local to send real emails');
    return { id: 'dev-email' };
  }

  const fromAddress = (process.env.EMAIL_FROM || '').trim();
  const from = fromAddress && fromAddress.includes('@')
    ? fromAddress
    : gmailUser;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
      replyTo: gmailUser,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    console.error('Nodemailer payload:', { from, to, subject });
    throw error;
  }
};