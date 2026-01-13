import { Resend } from 'resend';

// Initialize Resend - you'll need to add RESEND_API_KEY to your .env.local
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmail = async ({ 
  to, 
  subject, 
  text, 
  html 
}: { 
  to: string; 
  subject: string; 
  text?: string; 
  html?: string; 
}) => {
  // In development without API key, just log to console
  if (!process.env.RESEND_API_KEY || !resend) {
    console.log('📧 Email would be sent:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', html || text);
    console.log('\n⚠️  Add RESEND_API_KEY to .env.local to send real emails');
    return { id: 'dev-email' };
  }

  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SaaS Starter <onboarding@resend.dev>',
      to,
      subject,
      text,
      html: html || text,
    });
    
    console.log('Email sent:', data.id);
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};