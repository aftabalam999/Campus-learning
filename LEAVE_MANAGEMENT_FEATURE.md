# Leave Management System

## Overview
A comprehensive leave management system that allows users to request two types of leaves:
1. **Kitchen Leave** - Single day leave without approval
2. **On Leave** - Range-based leave with admin/academic associate approval

## Features Implemented

### 1. Leave Types

#### Kitchen Leave
- **Duration**: Single day only
- **Approval**: Requires approval from admin or academic associate
- **Continuity**: Cannot be continuous - users must apply again for the next day
- **Auto-Expiry**: Automatically expires at 11:59 PM and status changes to 'active'
- **Reason**: Optional

#### On Leave
- **Duration**: Date range (single or multiple days)
- **Approval**: Requires approval from admin or academic associate
- **Reason**: Mandatory
- **Expiry**: User gets notification when leave expires, but status must be manually changed by admin/academic associate

### 2. User Status Management

#### New Status Types
- `kitchen_leave`: User on kitchen leave
- `on_leave`: User on approved leave

#### Status Change Flow
1. User requests leave
2. Confirmation dialog appears
3. Leave request is created with 'pending' status (for both types)
4. User waits for admin/academic associate approval
5. On approval: 
   - Kitchen leave: Status changes to 'kitchen_leave'
   - On leave: Status changes to 'on_leave'
6. On expiry: 
   - Kitchen leave: Auto-changes to 'active' at 11:59 PM
   - On leave: User and admin get notifications, admin must manually change status

### 3. User Interface

#### User Dashboard (`/leave`)
- Request new leave (Kitchen Leave or On Leave)
- View active leave with status
- View leave history
- See pending, approved, rejected, and expired leaves
- Confirmation dialog before submitting requests

#### Admin Dashboard (`/admin/leave-management`)
- View all leave requests with filters (all, pending, approved, rejected, expired)
- Approve or reject on leave requests
- Add rejection reason (optional)
- See pending leave count badge
- View detailed leave information

### 4. Notification System

#### Bell Icon Integration
- Admin and academic associate bell icon shows count of pending leave requests
- Counts are updated every 30 seconds

#### Notification Types
1. **leave_approved**: User receives notification when leave is approved
2. **leave_rejected**: User receives notification with rejection reason
3. **leave_expired**: User receives notification when leave expires
4. **leave_expired_admin**: Admin/academic associate receives notification when user's leave expires

### 5. Automatic Leave Management

#### Leave Scheduler
- Runs every hour and at midnight
- **Kitchen Leave Expiry**: Automatically expires kitchen leaves and changes status to 'active'
- **On Leave Expiry**: Marks on leaves as expired and sends notifications to user and admin/academic associate
- Logs all operations for debugging

### 6. Database Schema

#### Leave Collection
```typescript
{
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  leave_type: 'kitchen_leave' | 'on_leave';
  start_date: Date;
  end_date: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: Date;
  rejected_by?: string;
  rejected_by_name?: string;
  rejected_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### User Schema Updates
```typescript
{
  status?: 'active' | 'inactive' | 'dropout' | 'placed' | 'on_leave' | 'kitchen_leave';
  leave_from?: Date;
  leave_to?: Date;
}
```

### 7. API Services

#### LeaveManagementService
- `createLeaveRequest()`: Create new leave request
- `getLeaveById()`: Get specific leave by ID
- `getUserLeaves()`: Get all leaves for a user
- `getPendingLeaves()`: Get all pending on leaves (for admin)
- `getAllLeaves()`: Get all leaves (for admin)
- `approveLeave()`: Approve a leave request
- `rejectLeave()`: Reject a leave request with reason
- `expireKitchenLeaves()`: Auto-expire kitchen leaves
- `checkExpiredOnLeaves()`: Check and notify for expired on leaves
- `getPendingLeaveCount()`: Get count of pending leaves (for notification badge)
- `getUserActiveLeave()`: Get user's current active leave

#### LeaveScheduler
- `start()`: Start the leave scheduler
- `stop()`: Stop the leave scheduler
- `manualCheck()`: Manually trigger leave expiration check

### 8. Security Rules

#### Firestore Rules
```plaintext
match /leaves/{leaveId} {
  // Users can read their own leaves, admin/AA can read all
  allow read: if isAuthenticated() && (
    resource.data.user_id == request.auth.uid ||
    isAdminOrAA()
  );
  // Users can create their own leave requests
  allow create: if isAuthenticated() && 
    request.resource.data.user_id == request.auth.uid;
  // Admin/AA can update leave status
  allow update: if isAdminOrAA() ||
    (isAuthenticated() && resource.data.user_id == request.auth.uid);
}

match /notifications/{notificationId} {
  allow read: if isAuthenticated() && 
    resource.data.user_id == request.auth.uid;
  allow create: if isAuthenticated();
  allow update: if isAuthenticated() && 
    resource.data.user_id == request.auth.uid;
}
```

### 9. Firestore Indexes

Three composite indexes created for optimal query performance:
1. `leaves`: user_id (ASC) + created_at (DESC)
2. `leaves`: status (ASC) + leave_type (ASC) + created_at (DESC)
3. `leaves`: user_id (ASC) + status (ASC) + created_at (DESC)

## Components

### User Components
1. **LeaveRequestModal**: Modal for requesting leave
2. **UserLeaveDashboard**: Dashboard showing user's leaves
3. **UserLeaveWrapper**: Wrapper component with auth context

### Admin Components
1. **AdminLeaveManagement**: Dashboard for managing all leaves
2. **AdminLeaveWrapper**: Wrapper component with auth context and role check

## Routes

### User Routes
- `/leave`: User leave management dashboard

### Admin Routes
- `/admin/leave-management`: Admin leave management dashboard

## Integration Points

### App.tsx
- Leave scheduler initialized on app start
- Routes added for leave management
- Scheduler cleanup on app unmount

### Notification Service
- `getPendingAdminActions()`: Returns count of pending leaves

### WebhookNotificationBell
- Shows combined count of webhook notifications and pending leaves
- For admin and academic associate only

## Usage Flow

### For Users
1. Navigate to `/leave`
2. Click "Request Leave"
3. Select leave type (Kitchen Leave or On Leave)
4. Choose date(s)
5. Add reason (mandatory for On Leave)
6. Confirm request
7. View status in dashboard

### For Admin/Academic Associate
1. Navigate to `/admin/leave-management`
2. See pending requests count in bell icon
3. Filter leaves by status
4. Review leave details
5. Approve or reject with optional reason
6. Get notifications when leaves expire

## Testing Checklist

- [ ] User can request kitchen leave for single day
- [ ] Kitchen leave cannot span multiple days
- [ ] Kitchen leave auto-expires at midnight
- [ ] User can request on leave for date range
- [ ] On leave requires reason
- [ ] On leave requires approval
- [ ] Admin/Academic associate can approve/reject
- [ ] Rejection reason is optional but captured
- [ ] Notifications sent on approval/rejection
- [ ] Notifications sent on leave expiry
- [ ] Bell icon shows pending leave count
- [ ] User status changes correctly
- [ ] Leave history displays correctly
- [ ] Filters work in admin dashboard

## Future Enhancements

1. **Leave Balance**: Track leave balance for users
2. **Leave Types**: Add more leave types (sick leave, emergency leave, etc.)
3. **Calendar Integration**: Show leaves on calendar
4. **Reports**: Generate leave reports for admin
5. **Email Notifications**: Send email notifications
6. **Discord Integration**: Send Discord notifications for leave status changes
7. **Leave Policies**: Configure leave policies per campus
8. **Bulk Operations**: Approve/reject multiple leaves at once

## Files Modified/Created

### New Files
1. `src/types/index.ts` - Added Leave interface
2. `src/services/leaveManagementService.ts` - Leave management service
3. `src/services/leaveScheduler.ts` - Leave scheduler
4. `src/components/Leave/LeaveRequestModal.tsx` - Leave request modal
5. `src/components/Leave/UserLeaveDashboard.tsx` - User dashboard
6. `src/components/Leave/UserLeaveWrapper.tsx` - User wrapper
7. `src/components/Leave/AdminLeaveManagement.tsx` - Admin dashboard
8. `src/components/Leave/AdminLeaveWrapper.tsx` - Admin wrapper

### Modified Files
1. `src/App.tsx` - Added leave routes and scheduler
2. `src/services/notificationService.ts` - Added pending admin actions
3. `src/components/Admin/WebhookNotificationBell.tsx` - Added leave count
4. `firestore.rules` - Added leave and notification rules
5. `firestore.indexes.json` - Added leave indexes

## Deployment Notes

1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
3. Build and deploy app: `npm run build && firebase deploy --only hosting`

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
