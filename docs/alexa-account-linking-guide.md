# Alexa Account Linking with Google OAuth Guide

This guide explains how to set up Account Linking between your Alexa skill and Google OAuth, allowing Alexa and Web UI users to share the same memos.

## Overview

- **Problem**: Alexa uses Amazon IDs while Web UI uses Google IDs, preventing memo sharing
- **Solution**: Implement Alexa Account Linking with Google OAuth
- **Result**: Both platforms use the same Google ID as familyId

## Prerequisites

1. Alexa Developer Console access
2. Google Cloud Console access
3. Published Alexa skill

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **Create Credentials** > **OAuth client ID**
4. Choose **Web application**
5. Configure:
   - **Name**: `Alexa Voice Memo - Account Linking`
   - **Authorized redirect URIs**: 
     - Add the three Alexa redirect URIs (you'll get these from Alexa Developer Console in Step 2)
     - Format: `https://pitangui.amazon.com/api/skill/link/[YOUR-VENDOR-ID]`
     - Format: `https://layla.amazon.com/api/skill/link/[YOUR-VENDOR-ID]`
     - Format: `https://alexa.amazon.co.jp/api/skill/link/[YOUR-VENDOR-ID]`

6. Save the credentials:
   - **Client ID**: `[YOUR_GOOGLE_CLIENT_ID]`
   - **Client Secret**: `[YOUR_GOOGLE_CLIENT_SECRET]`

## Step 2: Alexa Developer Console Setup

1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Select your skill
3. Navigate to **Build** > **Account Linking**
4. Enable Account Linking with these settings:

### Authorization URI
```
https://accounts.google.com/o/oauth2/v2/auth
```

### Access Token URI
```
https://oauth2.googleapis.com/token
```

### Client ID
```
[YOUR_GOOGLE_CLIENT_ID]
```

### Client Secret
```
[YOUR_GOOGLE_CLIENT_SECRET]
```

### Scope
```
openid email profile
```

### Domain List
```
google.com
```

### Default Access Token Expiration Time
```
3600
```

5. Copy the **Redirect URLs** shown in the console
6. Go back to Google Cloud Console and add these redirect URLs to your OAuth client

## Step 3: Deploy Updated Lambda Function

The Lambda function has been updated to support account linking:

```bash
# Build and deploy
npm run build
cdk deploy alexa-voice-memo-dev
```

Key changes:
- Checks for `accessToken` in the session
- Verifies Google token and extracts Google user ID
- Uses Google ID as familyId (same as Web UI)
- Shows account linking card if not linked

## Step 4: Test Account Linking

1. Open the Alexa app on your mobile device
2. Go to **Skills & Games** > **Your Skills**
3. Find your skill and tap on it
4. Tap **Settings** > **Link Account**
5. Sign in with your Google account
6. Grant permissions
7. Account linking complete!

## Step 5: Test Cross-Platform Memos

1. Create a memo in the Web UI
2. Ask Alexa: "アレクサ、ボイスメモでメモを読んで"
3. Alexa should read the memos created in Web UI

## How It Works

1. **Web UI**: Uses Google Sign-In → Google ID as familyId
2. **Alexa**: Uses Account Linking → Gets Google OAuth token → Extracts Google ID → Same familyId
3. **DynamoDB**: Both platforms query using the same familyId

## Troubleshooting

### "アカウントをリンクしてください" message
- User needs to link their account in the Alexa app
- Check Settings > Account Linking in the skill

### "アカウントの認証に失敗しました" message
- Token may be expired
- User should unlink and relink account

### Memos not syncing
- Verify both platforms are using the same Google account
- Check CloudWatch logs for the actual familyId being used

## Security Considerations

- Google tokens are verified on every request
- Tokens expire after 1 hour (Google default)
- No tokens are stored in DynamoDB
- familyId is the Google user ID (sub claim)

## User Experience

### First Time Setup
1. User enables skill: "アレクサ、ボイスメモを開いて"
2. Alexa responds: "このスキルを使用するには、Alexaアプリでアカウントをリンクしてください"
3. Alexa app shows notification to link account
4. User links Google account
5. Ready to use!

### Daily Usage
- Once linked, works seamlessly
- No need to mention accounts or linking
- Memos sync automatically between Alexa and Web UI

## Next Steps

1. Consider implementing token refresh for better UX
2. Add voice feedback about which family member created each memo
3. Implement family member management voice commands