# Discord Webhook Setup Guide

This guide explains how to set up Discord webhooks for the attendance reporting feature.

## 📋 Overview

The Campus Learning Dashboard sends automated attendance reports to Discord at **10:00 AM daily** and allows admins to manually send reports for specific campuses.

## 🎯 What You Need

- A Discord server with administrator permissions
- Separate channels for each campus (optional but recommended)

## 🔧 Step-by-Step Setup

### 1. Create Discord Channels (Recommended)

Create separate channels for each campus:
- `#attendance-dharamshala`
- `#attendance-dantewada`
- `#attendance-jashpur`
- `#attendance-raigarh`
- `#attendance-pune`
- `#attendance-sarjapur`
- `#attendance-kishanganj`
- `#attendance-eternal`

Or use a single `#attendance-reports` channel for all campuses.

### 2. Create Webhooks for Each Channel

For each channel:

1. **Right-click** on the channel name
2. Select **"Edit Channel"**
3. Go to **"Integrations"** tab
4. Click **"Create Webhook"** or **"View Webhooks"**
5. Click **"New Webhook"**
6. **Configure the webhook:**
   - Name: `Campus Learning - [Campus Name]`
   - Avatar: (Optional) Upload a logo
   - Channel: Verify correct channel
7. **Copy Webhook URL** - It will look like:
   ```
   https://discord.com/api/webhooks/[WEBHOOK_ID]/[WEBHOOK_TOKEN]
   ```
   Example: `https://discord.com/api/webhooks/123456789012345678/aBcDeFgHiJkLmNoPqRsTuVwXyZ`
8. **Save** the webhook

### 3. Update .env File

Open your `.env` file and replace the placeholder URLs:

```env
# General webhook for login notifications
REACT_APP_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_GENERAL_WEBHOOK_URL

# Campus-specific attendance webhooks
REACT_APP_DISCORD_WEBHOOK_DHARAMSHALA=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_DANTEWADA=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_JASHPUR=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_RAIGARH=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_PUNE=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_SARJAPUR=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_KISHANGANJ=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
REACT_APP_DISCORD_WEBHOOK_ETERNAL=https://discord.com/api/webhooks/[YOUR_WEBHOOK_ID]/[YOUR_TOKEN]
```

⚠️ **Important:** 
- Replace **ALL** placeholder URLs that contain `YOUR_` or `WEBHOOK_URL`
- Each webhook URL must start with `https://discord.com/api/webhooks/`
- Keep the URLs secret - don't commit them to public repositories

### 4. Restart the Application

After updating the `.env` file:

```bash
# Stop the development server (Ctrl+C)
# Start it again
npm start
```

The environment variables are loaded when the app starts.

## 🧪 Testing the Setup

### Manual Test (Recommended)

1. Log in as an **Admin**
2. Go to **Admin Dashboard** → **Attendance Management**
3. Click any **"Send [Campus] Report"** button
4. Check your Discord channel for the attendance report

### Expected Discord Message Format

```
🌅 Morning Attendance - Dharamshala
Attendance report for 2025-12-20

✅ Present
15 students

❌ Absent
5 students

🏖️ On Leave
2 students

📈 Attendance Rate
75.0%

👥 Absent Students
John Doe, Jane Smith, Mike Johnson, Sarah Williams, Tom Brown
```

## 🤖 Automatic Reports

Once configured, the system will automatically send attendance reports:

- **Time:** 10:00 AM daily
- **Frequency:** Every day
- **Content:** Attendance statistics for each campus
- **Sent to:** Campus-specific Discord channels

## 🔒 Security Best Practices

1. **Never commit .env file** to git
   - Verify `.env` is in `.gitignore`
   
2. **Regenerate webhooks if exposed**
   - If you accidentally commit webhooks, delete and create new ones

3. **Limit webhook permissions**
   - Use read-only channels if possible
   - Consider separate "bot" role with minimal permissions

4. **Monitor webhook usage**
   - Check Discord's audit log for unexpected messages
   - Set up alerts for unusual activity

## 🐛 Troubleshooting

### Error: "Invalid Discord webhook URL"

**Cause:** Placeholder URL not replaced or invalid format

**Solution:**
- Ensure URL starts with `https://discord.com/api/webhooks/`
- Replace ALL instances of `YOUR_` in .env
- Copy the exact URL from Discord (don't type it manually)

### Error: "405 Method Not Allowed"

**Cause:** Trying to POST to an invalid webhook endpoint

**Solution:**
- Verify the webhook URL is correct
- Check if webhook was deleted in Discord
- Create a new webhook if needed

### Error: "Content Security Policy"

**Cause:** Browser blocking Discord API requests

**Solution:**
- This should be fixed in `public/index.html`
- Clear browser cache and restart dev server
- Check browser console for CSP errors

### Webhook Not Receiving Messages

**Possible causes:**
1. Wrong webhook URL in .env
2. Webhook deleted in Discord
3. Channel permissions changed
4. App not restarted after .env changes

**Solutions:**
1. Verify webhook still exists in Discord
2. Copy webhook URL again from Discord
3. Restart the application completely
4. Test with the manual send button first

## 📞 Support

If you continue having issues:

1. Check browser console for error messages
2. Verify .env file has no extra spaces or quotes
3. Test webhook URL with curl:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content":"Test message"}'
   ```
4. Check Discord server settings and permissions

## 📚 Additional Resources

- [Discord Webhooks Documentation](https://discord.com/developers/docs/resources/webhook)
- [Discord Webhook Guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
