import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { sendEmail } from './email';
import { autumn } from 'autumn-js/better-auth';
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl:true
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true to require email verification
    sendResetPassword: async ({ user, url }, request) => {
      console.log('Password reset link:', url);
      
      await sendEmail({
        to: user.email,
        subject: 'Reset your password - Fire SaaS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6;">
              You requested to reset your password. Click the button below to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #999; font-size: 14px;">
              This link will expire in 1 hour.
            </p>
          </div>
        `
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: ['email', 'profile', 'openid'],
      prompt: 'select_account', // Always ask to select account
      redirectURI: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
      mapProfileToUser: (profile) => {
        return {
          name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified,
        };
      },
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  },
  emailVerification: {
    sendOnSignUp: false, // Set to true to send verification email on signup
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      console.log('Verification link:', url);
      
      await sendEmail({
        to: user.email,
        subject: 'Verify your email - Fire SaaS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p style="color: #666; line-height: 1.6;">
              Thanks for signing up! Please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `
      });
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
    },
  },
  plugins: [autumn()],
});