# Attendance Discord Reports Feature

## Overview
This feature enables automatic and manual sending of attendance reports to Discord channels. Reports are sent at 10:00 AM daily and can also be triggered manually from the admin dashboard.

## Features Implemented

### 1. **Updated Attendance Logic**
- Students are now marked **PRESENT** if they have an **approved goal** (mentor approval required)
- Reflection submission is tracked but **NOT required** for attendance
- Students on approved leave are excluded from attendance calculations

### 2. **Campus-Wise Discord Webhooks**
- Separate Discord webhook URLs for each campus
- Configured in `.env` file:
  - `REACT_APP_DISCORD_WEBHOOK_BANGALORE`
  - `REACT_APP_DISCORD_WEBHOOK_MUMBAI`
  - `REACT_APP_DISCORD_WEBHOOK_DELHI`
  - `REACT_APP_DISCORD_WEBHOOK_PUNE`
  - `REACT_APP_DISCORD_WEBHOOK_URL` (general/fallback)

### 3. **Automatic Reporting (10:00 AM)**
- `AttendanceScheduler` service runs continuously
- Checks every minute for 10:00 AM trigger
- Automatically sends reports for:
  - All campuses (combined)
  - Each campus individually to their respective Discord channels

### 4. **Manual Reporting Buttons**
- Located in Admin Dashboard > Attendance Management
- Buttons available:
  - **All Campuses** - Sends combined report to general webhook
  - **Bangalore** - Sends to Bangalore channel
  - **Mumbai** - Sends to Mumbai channel
  - **Delhi** - Sends to Delhi channel
  - **Pune** - Sends to Pune channel
- Real-time feedback with loading states

## Discord Report Format

```
🌅 Morning Attendance - [Campus Name]
Attendance report for YYYY-MM-DD

✅ Present
X students

❌ Absent
Y students

🏖️ On Leave
Z students

📈 Attendance Rate
XX.X%

👥 Absent Students
Name1, Name2, Name3, ...
```

## Setup Instructions

### 1. Configure Discord Webhooks
1. Open Discord and navigate to your server
2. Go to Server Settings > Integrations > Webhooks
3. Create webhooks for each campus channel
4. Copy the webhook URLs

### 2. Update Environment Variables
Edit `.env` file:
```env
# Replace with your actual webhook URLs
REACT_APP_DISCORD_WEBHOOK_BANGALORE=https://discord.com/api/webhooks/YOUR_BANGALORE_URL
REACT_APP_DISCORD_WEBHOOK_MUMBAI=https://discord.com/api/webhooks/YOUR_MUMBAI_URL
REACT_APP_DISCORD_WEBHOOK_DELHI=https://discord.com/api/webhooks/YOUR_DELHI_URL
REACT_APP_DISCORD_WEBHOOK_PUNE=https://discord.com/api/webhooks/YOUR_PUNE_URL
```

### 3. Restart the Application
```bash
npm start
```

The scheduler will automatically start when the app loads.

## Files Modified/Created

### Created Files:
1. **`src/services/attendanceScheduler.ts`**
   - Manages automatic scheduling
   - Provides manual trigger functionality
   - Runs at 10:00 AM daily

### Modified Files:
1. **`src/services/attendanceTrackingService.ts`**
   - Updated attendance logic (approved goal = present)
   - Removed reflection requirement for attendance

2. **`src/services/discordService.ts`**
   - Added campus-wise webhook support
   - Added `sendAttendanceReport()` method
   - Added `sendCampusAttendanceReport()` method

3. **`src/components/Admin/AttendanceDashboard.tsx`**
   - Added Discord report section with manual send buttons
   - Added campus-specific buttons (Bangalore, Mumbai, Delhi, Pune)
   - Added loading states and user feedback

4. **`src/App.tsx`**
   - Initialize attendance scheduler on app start
   - Cleanup scheduler on app unmount

5. **`.env`**
   - Added campus-specific webhook URLs

## Usage

### Automatic Reports
- Reports are automatically sent at **10:00 AM** every day
- No manual intervention required
- Covers all campuses

### Manual Reports
1. Log in as **Admin**
2. Navigate to **Admin Dashboard**
3. Scroll to **Attendance Management** section
4. Click **"Send Report to Discord"** buttons:
   - Click **"All Campuses"** for combined report
   - Click specific campus button for campus-only report

## Attendance Calculation

### Present Status
✅ Student has an **approved goal** (reviewed by mentor)

### Absent Status
❌ Student does NOT have an approved goal

### On Leave Status
🏖️ Student has an approved leave request for the date

### Attendance Rate Calculation
```
Eligible Students = Total Active Students - Students On Leave
Attendance Rate = (Present Students / Eligible Students) × 100
```

## Important Notes

1. **Goal Approval Required**: Students must have their daily goal approved by a mentor to be marked present
2. **Reflections Optional**: Reflections are tracked but don't affect attendance status
3. **Leave Handling**: Students on approved leave are excluded from calculations
4. **Rate Limiting**: Discord has a 30 requests/minute limit - reports are sent with 2-second delays
5. **Fallback Webhooks**: If a campus-specific webhook is not configured, the general webhook is used

## Testing

### Test Manual Report
1. Go to Admin Dashboard > Attendance Management
2. Click any campus button
3. Check Discord channel for the report

### Test Automatic Report
1. Wait until 10:00 AM
2. Check Discord channels for automatic reports
3. Or modify the time in `attendanceScheduler.ts` for testing:
   ```typescript
   // Change this line for testing (e.g., send at current hour/minute)
   if (hours === 10 && minutes === 0) {
   ```

## Troubleshooting

### Reports Not Sending
- Check console for error messages
- Verify webhook URLs are correct in `.env`
- Ensure Discord server permissions allow webhooks
- Check network connectivity

### Wrong Attendance Data
- Verify goal approval status in database
- Check date/campus filters
- Review leave request approvals

### Scheduler Not Running
- Check browser console for initialization messages
- Restart the application
- Verify `App.tsx` initializes the scheduler

## Color Coding in Discord

- 🟢 **Green** (Good): Attendance ≥ 80%
- 🟠 **Amber** (Warning): Attendance 60-79%
- 🔴 **Red** (Critical): Attendance < 60%

## Future Enhancements

Potential improvements:
- Add end-of-day summary reports
- Weekly/monthly attendance summaries
- Low attendance alerts
- Custom scheduling times per campus
- Historical attendance trends

## Support

For issues or questions:
1. Check console logs for errors
2. Verify webhook configuration
3. Test with manual buttons first
4. Review attendance calculation logic
