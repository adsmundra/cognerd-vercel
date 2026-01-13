# Google OAuth Setup Guide for Firegeo

This guide will help you set up Google OAuth authentication for your Firegeo application.

## Prerequisites

- Google Cloud Console account
- Firegeo project running locally or deployed

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or select a project**
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" for user type
   - Fill in required fields:
     - App name: "Firegeo"
     - User support email: your email
     - Developer contact information: your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed

## Step 2: Create OAuth 2.0 Credentials

1. **Go to Credentials**: "APIs & Services" > "Credentials"
2. **Click "Create Credentials"** > "OAuth 2.0 Client IDs"
3. **Application type**: Web application
4. **Name**: Firegeo OAuth Client
5. **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
6. **Save and copy**:
   - Client ID
   - Client Secret

## Step 3: Environment Variables

Add these to your `.env.local` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

## Step 4: Run Database Migration

Run the Better Auth migration to create social account tables:

```bash
# Windows
run-auth-migration.bat

# Linux/Mac
npx @better-auth/cli migrate
```

## Step 5: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to login page**: http://localhost:3000/login

3. **Click "Continue with Google"** and test the OAuth flow

## Features Included

✅ **Google OAuth Sign-in**: Users can sign in with their Google account
✅ **Google OAuth Sign-up**: New users can register with Google
✅ **Account Linking**: Existing users can link their Google account
✅ **Secure Session Management**: Better Auth handles session security
✅ **Automatic Profile Sync**: User profile info synced from Google
✅ **Responsive UI**: Google sign-in button works on all devices
✅ **Profile Management**: Complete user profile with Google data
✅ **User Settings**: Theme, notifications, and preferences
✅ **Profile Page**: Dedicated page for managing user information
✅ **Avatar Integration**: Google profile pictures automatically imported

## Security Features

- **CSRF Protection**: Built into Better Auth
- **Secure Cookies**: HttpOnly, SameSite, Secure flags
- **Token Refresh**: Automatic access token refresh
- **Account Verification**: Email verification through Google

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**:
   - Check that your redirect URI in Google Console matches exactly
   - Ensure no trailing slashes

2. **"invalid_client" error**:
   - Verify your Client ID and Client Secret are correct
   - Check environment variables are loaded

3. **"access_denied" error**:
   - User cancelled the OAuth flow
   - Check OAuth consent screen configuration

4. **Database errors**:
   - Run the migration: `npx @better-auth/cli migrate`
   - Check database connection

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```env
DEBUG=better-auth:*
```

## Production Deployment

1. **Update redirect URIs** in Google Console with your production domain
2. **Set production environment variables**
3. **Run migrations** on production database
4. **Test OAuth flow** on production

## Additional Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)