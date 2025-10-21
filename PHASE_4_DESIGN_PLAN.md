# Phase 4: Rolling Queue System - Design & Implementation Plan

**Status:** Design Phase ✅
**Date:** October 21, 2025
**Objective:** Build rolling queue system using existing data types for coherent process

---

## 📋 Design Philosophy: Using Existing Data Types

### Key Principle
**Leverage existing types for data consistency and coherent process flow.**

We will use:
- `PairProgrammingSession` - Core session data (already has student_id, mentor_id, status, timestamps)
- `AcademicAssociateAssignment` - AA-student mappings (defines which students belong to which AA)
- `StudentAAMapping` - Denormalized for quick lookup

### Why This Works
✅ **No duplicate data** - Sessions already track student and mentor  
✅ **Single source of truth** - Session status drives queue state  
✅ **Coherent process** - Queue flows naturally from session lifecycle  
✅ **Type safety** - Reuse existing interfaces, no new type definitions needed  

---

## 🏗️ Queue System Architecture

### Queue Entry Model
Instead of creating new collection, use **Firestore sub-collections**:

```
academic_associates/{aaId}/queues/{queueId}
  - student_id: string
  - session_id: string
  - position: number          (1, 2, 3, ... auto-incremented)
  - status: 'waiting' | 'in_progress' | 'completed'
  - added_at: Timestamp
  - started_at?: Timestamp
  - completed_at?: Timestamp
  - notes?: string
```

### Alternative: Flat Collection (Simpler)
```
rolling_queues/{queueId}
  - academic_associate_id: string
  - student_id: string
  - session_id: string
  - position: number
  - campus: string
  - status: 'waiting' | 'in_progress' | 'completed'
  - added_at: Timestamp
  - updated_at: Timestamp
```

**Decision:** Use flat collection for simplicity and faster queries.

---

## 🔄 Queue Operations & Flow

### 1. Queue Entry Creation
**Trigger:** When session status becomes `'assigned'` with an AA mentor
```
When: PairProgrammingSession.status = 'assigned' AND academic_associate_id set
Do: Add entry to rolling_queues collection
```

**Flow:**
1. Student submits session request
2. System finds student's AA (from AcademicAssociateAssignment)
3. System finds available time slot for AA's mentor
4. Create PairProgrammingSession with mentor_id, status='assigned'
5. **Create RollingQueueEntry** - Position = (max position for this AA) + 1
6. Emit notification to AA mentor: "New session in queue"

### 2. Queue Advancement
**Trigger:** When current session completes
```
When: PairProgrammingSession.status = 'completed' AND session has queue entry
Do: Mark queue entry as 'completed', move next to 'in_progress'
```

**Flow:**
1. Mentor marks session as 'completed' with notes/feedback
2. System finds corresponding queue entry
3. Mark queue entry status = 'completed', completed_at = now
4. Query NEXT entry for same AA where position = current_position + 1
5. Update next entry: status = 'in_progress', started_at = now
6. Update next session: status = 'in_progress'
7. Emit notifications

### 3. Queue Reordering (Admin Only)
**Endpoint:** PUT /api/queue/{entryId}/reorder
```
Allows admin to move entry up/down in queue
```

**Flow:**
1. Get all entries for AA sorted by position
2. Find source entry, get new target position
3. If moving up: increment position of entries between target and source
4. If moving down: decrement position of entries between source and target
5. Update source entry with new position
6. Batch update all affected entries

### 4. Queue Removal
**Trigger:** Session cancelled or manually removed by admin
```
When: Admin clicks "Remove from queue" OR session cancelled
Do: Remove queue entry, shift positions down
```

---

## 📊 Existing Data Type Mappings

### PairProgrammingSession → Queue
| Session Field | Queue Use |
|---------------|-----------|
| `id` | Link to queue entry |
| `student_id` | Key for AA lookup |
| `mentor_id` | Verification AA is correct |
| `status` | Drives queue state transitions |
| `assigned_at` | When added to queue |
| `started_at` | When became in_progress |
| `completed_at` | When completed |
| `created_at` | Original request time |
| `updated_at` | Track changes |

### AcademicAssociateAssignment → Routing
| Assignment Field | Queue Use |
|-----------------|-----------|
| `student_ids[]` | Which students route to this AA |
| `academic_associate_id` | Queue owner |
| `campus` | Filter queues by campus |
| `house` | Optional grouping within AA |
| `phase` | Optional grouping within AA |

---

## 🗄️ Database Structure

### New Collection: `rolling_queues`
```typescript
interface RollingQueueEntry {
  id: string;
  academic_associate_id: string;
  student_id: string;
  session_id: string;
  
  // Position in queue (1-based, auto-maintained)
  position: number;
  
  // Queue state
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  
  // Metadata
  campus: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Timestamps
  added_at: Timestamp;
  started_at?: Timestamp;
  completed_at?: Timestamp;
  cancelled_at?: Timestamp;
  
  // Tracking
  notes?: string;
  updated_at: Timestamp;
}
```

### Firestore Indexes Needed
```
rolling_queues:
  - Composite: (academic_associate_id, position) ASC
  - Composite: (academic_associate_id, status, position) ASC
  - Single: campus (for filtering)
```

---

## 🔌 Service Layer: RollingQueueService

### Core Methods

```typescript
class RollingQueueService {
  // Create queue entry for a session
  createQueueEntry(sessionId, studentId, aaId, campus, priority)
    → Promise<queueEntryId>
  
  // Get entire queue for an AA
  getQueueForAA(aaId)
    → Promise<RollingQueueEntry[]>
  
  // Get next entry in queue
  getNextInQueue(aaId)
    → Promise<RollingQueueEntry | null>
  
  // Add to queue (manual)
  addToQueue(sessionId, studentId, aaId, position?)
    → Promise<void>
  
  // Remove from queue
  removeFromQueue(queueEntryId)
    → Promise<void>
  
  // Advance queue (mark complete, move next to in_progress)
  advanceQueue(completedSessionId)
    → Promise<void>
  
  // Reorder queue (admin)
  reorderQueue(queueEntryId, newPosition)
    → Promise<void>
  
  // Get queue stats
  getQueueStats(aaId)
    → Promise<{totalWaiting, totalInProgress, avgWaitTime}>
  
  // Get queue status for dashboard
  getQueueStatus(campus?)
    → Promise<QueueStatus[]>
}
```

---

## 🎨 UI Components Needed

### 1. QueueViewer Component
- Shows queue for selected AA
- Displays: Position, Student, Status, Added Date, Priority
- Color-coded: Waiting (blue), In Progress (orange), Completed (green)
- Hover: Show session details

### 2. QueueManager Component (Admin)
- List all queues by AA
- Drag-to-reorder functionality
- Right-click context menu: "Move Up", "Move Down", "Remove", "View Session"
- Batch operations: "Clear Completed"

### 3. Queue Status Widget (Dashboard)
- Card showing: AA name, Queue Length, Current Session, Est. Wait Time
- Color-coded alert if queue > threshold
- Click to expand queue details

### 4. Session Details Modal Update
- Add queue info: "Position in queue: 2/5"
- If in_progress: Show start time and estimated completion
- Admin button: "Move to Front", "Skip", "Remove"

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              New Session Request                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Find Student's AA via    │
        │ AcademicAssociate        │
        │ Assignment               │
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ Create Pair Programming  │
        │ Session (status=pending) │
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ Auto-assign to AA mentor │
        │ (status=assigned)        │
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ CREATE QUEUE ENTRY       │
        │ Position = last + 1      │
        │ Status = 'waiting'       │
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ Notify AA: New session   │
        │ in queue                 │
        └──────────────────────────┘
                       
         ┌─────────────────────────────────┐
         │      Session Lifecycle          │
         └─────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
    ┌────────────┐            ┌────────────────┐
    │  WAITING   │            │   IN_PROGRESS  │
    │ (Queued)   │ ─────────▶ │  (Mentor with  │
    └────────────┘            │   student)     │
                              └────────┬───────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                        ▼              ▼              ▼
                    ┌────────┐   ┌─────────┐   ┌──────────┐
                    │COMPLETED│   │CANCELLED│   │  ERROR   │
                    │(Success)│   │(Removed)│   │(Manual)  │
                    └────────┘   └─────────┘   └──────────┘
                        │
                        ▼
        ┌──────────────────────────────┐
        │ ADVANCE QUEUE:               │
        │ • Mark entry 'completed'     │
        │ • Get next entry in queue    │
        │ • Set status = 'in_progress' │
        │ • Update session status      │
        │ • Notify AA mentor           │
        └──────────────────────────────┘
```

---

## 📝 Implementation Order

### Phase 4, Step 1: Design ✅ (THIS DOCUMENT)
- [x] Define queue entry model
- [x] Map existing types to queue operations
- [x] Plan data flow and lifecycle

### Phase 4, Step 2: Service Layer
- [ ] Create RollingQueueService class
- [ ] Implement all 8 core methods
- [ ] Add error handling and logging

### Phase 4, Step 3: Integration
- [ ] Hook queue creation into session assignment
- [ ] Hook queue advancement into session completion
- [ ] Connect admin endpoints for reordering

### Phase 4, Step 4: UI Components
- [ ] Build QueueViewer component
- [ ] Build QueueManager component
- [ ] Add queue status widget to dashboard
- [ ] Update SessionDetailsModal

### Phase 4, Step 5: Testing & Commit
- [ ] Test queue creation workflow
- [ ] Test queue advancement
- [ ] Test reordering
- [ ] Verify Firestore integration
- [ ] Commit complete Phase 4

---

## ✅ Coherence with Existing System

### Why This Design Works

1. **Reuses existing types**
   - No new Session type needed
   - Queue entries link to existing sessions
   - AA assignments already define routing

2. **Maintains data consistency**
   - Single source of truth (PairProgrammingSession)
   - Queue entries are view/metadata only
   - Session status drives queue state

3. **Follows existing patterns**
   - Uses AcademicAssociateService for AA data
   - Uses PairProgrammingService for sessions
   - New RollingQueueService follows same pattern

4. **Scalable**
   - Queue entries are lightweight (just metadata)
   - Firestore indexes enable fast queries
   - No denormalization of sessions

5. **Backwards compatible**
   - Existing session creation still works
   - Queue is additive feature
   - Can disable queue without breaking sessions

---

## 🎯 Success Criteria

- ✅ Queue entries created automatically when sessions assigned
- ✅ Queue advances when sessions complete
- ✅ Admin can manually reorder queue
- ✅ Queue status visible in UI
- ✅ Existing session types unchanged
- ✅ Zero TypeScript errors
- ✅ All operations logged and traceable

---

## 📌 Next Steps

Ready to proceed with **Phase 4, Step 2: Create RollingQueueService**

When ready, I will:
1. Create `src/services/rollingQueueService.ts`
2. Implement all 8 core methods
3. Add error handling and logging
4. Use existing types (no new type definitions needed)
5. Test build and commit
