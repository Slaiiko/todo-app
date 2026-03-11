# Test Instructions - Recurrence Persistence Fix

## Objective
Verify that task recurrence settings persist after editing and resaving a task.

## Prerequisite
- Application running: `npm run dev` (server on port 3000, frontend on port 5173)
- Build completed successfully: `npm run build` ✅

## Test Case 1: Basic Recurrence Persistence

### Steps:
1. **Create New Task**
   - Click "Nouvelle tâche" button
   - Fill in Title: "Test Recurrence Task"
   - Leave other fields default
   
2. **Set Recurrence**
   - Scroll down to "Récurrence" section
   - Select: **"Quotidienne"** (Daily)
   - Set End Date: Pick a date 3+ months from today (e.g., in June 2026)
   - Click **"Sauvegarder"** (Save)

3. **Verify Initial Save**
   - Task should appear in task list
   - Should show badge like "X fois" indicating multiple occurrences

4. **Edit and Verify**
   - Click on the task to open edit modal
   - Scroll to Récurrence section
   - **VERIFY:** 
     - "Quotidienne" should be selected
     - End date should show the date you selected
   - Close modal without changes

5. **Edit with Change**
   - Click on the task again
   - Change title to "Test Recurrence Task - EDITED"
   - **DO NOT CHANGE** the recurrence settings
   - Click **"Sauvegarder"** (Save)

6. **Final Verification**
   - Open task for editing again
   - **VERIFY:** Recurrence settings are still there
   - **VERIFY:** Title shows "Test Recurrence Task - EDITED"

---

## Test Case 2: Remove Recurrence

### Steps:
1. **Open Existing Recurring Task**
   - Find the task from Test Case 1
   - Click to edit

2. **Remove Recurrence**
   - In Récurrence section, select **"Pas de récurrence"** (No recurrence)
   - Click **"Sauvegarder"** (Save)

3. **Verify Removal**
   - Open task again for editing
   - **VERIFY:** "Pas de récurrence" is selected
   - **VERIFY:** End date field is hidden/disabled

---

## Test Case 3: Change Recurrence Pattern

### Steps:
1. **Create New Task**
   - Title: "Weekly Test Task"
   - No recurrence yet

2. **Add Weekly Recurrence**
   - Set to **"Hebdomadaire"** (Weekly)
   - End date: 2 months from today
   - Save

3. **Edit and Change Pattern**
   - Open task for editing
   - **CONFIRM:** "Hebdomadaire" is selected
   - Change to **"Mensuelle"** (Monthly)
   - Keep same end date
   - Save

4. **Verify Change**
   - Open task again
   - **VERIFY:** Now shows "Mensuelle"

---

## Test Case 4: Calendar Display

### Steps:

1. **After Test Case 1, Check Calendar**
   - Navigate to Calendar view
   - Month: Current or next month
   - **VERIFY:** The recurring task appears on multiple days
   - **VERIFY:** Does NOT appear on weekends (Saturday/Sunday)

2. **Check Time Preservation** (if task has appointments/times)
   - If task has start_time or end_time
   - **VERIFY:** Times display correctly on calendar

---

## Test Case 5: List View Badge

### Steps:

1. **Open List View**
   - From sidebar, click on "Mes tâches" or relevant view
   - Find the recurring task from Test Case 1

2. **Verify Badge**
   - **VERIFY:** Task shows count badge (e.g., "1 fois", "2 fois", "5 fois")
   - Badge should match the number of occurrences within 3-month window

3. **Edit Another Field, Save Again**
   - Open task
   - Change priority or description
   - **VERIFY:** Recurrence persists and badge still shows

---

## Success Criteria

✅ **Test Passes If:**
- Recurrence settings appear populated when opening task for editing
- Recurrence settings persist after each save cycle
- Can switch between recurrence types without data loss
- Calendar displays all occurrences correctly
- List view badges show correct counts
- No console errors in browser Developer Tools

❌ **Test Fails If:**
- Recurrence fields appear blank when reopening task
- Recurrence is lost after editing other fields
- Calendar doesn't show the recurring task
- Badges show incorrect counts

---

## Troubleshooting

**If recurrence fields are blank when editing:**
- Check browser Console (F12) for any JavaScript errors
- Verify Build completed: `npm run build`
- Clear browser cache: Ctrl+Shift+Delete
- Restart: Kill all node processes, run `npm run dev` again

**If Badge shows wrong count or doesn't appear:**
- Check if recurrence_type got set correctly (should not be null)
- Verify end date is in the future

**If Calendar doesn't show recurring tasks:**
- Verify task is NOT archived/deleted
- Check if recurrence_type is set correctly on the task
- Weekend exclusion should skip Saturday (6) and Sunday (0)

---

## Data Flow Verification (for debugging)

If you need to check the database directly:

1. **Stop the server:** Ctrl+C
2. **View task data:** 
   ```powershell
   # Using Node.js better-sqlite3 from the app
   node -e "
   const db = require('better-sqlite3')('tasks.db');
   const tasks = db.prepare('SELECT id, title, recurrence_type, recurrence_end_date FROM tasks ORDER BY id DESC LIMIT 5').all();
   console.log(JSON.stringify(tasks, null, 2));
   "
   ```

3. **Expected Output:** 
   ```json
   [
     {
       "id": 123,
       "title": "Test Recurrence Task",
       "recurrence_type": "daily",
       "recurrence_end_date": "2026-06-15T00:00:00.000Z"
     }
   ]
   ```
