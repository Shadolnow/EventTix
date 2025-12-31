# 🗑️ Admin Ticket Deletion Guide

## Where to Delete Tickets

As an admin/event creator, you have **multiple places** to delete tickets:

---

## Option 1: Attendees Tab (Recommended)

### Location:
```
Event Dashboard → Ticket Management → Attendees Tab
```

### Steps:
1. Go to `/event/{event-id}/tickets`
2. Click on **"Attendees"** tab
3. Find the ticket you want to delete
4. Click the **Trash icon** (🗑️) in the row
5. Confirm deletion

### Features:
- ✅ Delete individual tickets
- ✅ See attendee details
- ✅ View payment status
- ✅ Check validation status

---

## Option 2: Bulk Actions / Archive Tab

### Location:
```
Event Dashboard → Ticket Management → Archive Tab
```

### Steps:
1. Go to `/event/{event-id}/tickets`
2. Click on **"Archive"** tab (previously "Bulk Actions")
3. Select multiple tickets using checkboxes
4. Click **"Delete Selected"** button
5. Confirm bulk deletion

### Features:
- ✅ Delete multiple tickets at once
- ✅ Bulk operations
- ✅ Archive functionality
- ✅ Permanent delete option

---

## Option 3: Ticket Archive Page

### Location:
```
Dedicated Ticket Archive page
```

### URL Pattern:
```
/ticket-archive/{event-id}
```

### Features:
- ✅ View deleted/archived tickets
- ✅ Permanent deletion
- ✅ Cannot be undone ⚠️

---

## 🛡️ Security & Permissions

### Who Can Delete Tickets?
- ✅ Event Creator (owner)
- ✅ Admin users
- ❌ Regular users
- ❌ Door staff (restricted)

### RLS Policies:
Tickets can only be deleted by the event creator:
```sql
DELETE FROM tickets
WHERE event_id IN (
  SELECT id FROM events
  WHERE user_id = auth.uid()
)
```

---

## ⚠️ Important Notes

### Before Deleting:
1. **Check Payment Status** - Refund if necessary
2. **Notify Customer** - Send cancellation email
3. **Update Capacity** - Ticket count decreases
4. **Cannot Undo** - Deletion is permanent!

### What Gets Deleted:
- ✅ Ticket record from database
- ✅ QR code association
- ✅ Attendance history
- ✅ Payment references

### What Stays:
- Event record (unchanged)
- Other tickets (unaffected)
- Revenue statistics (may need manual adjustment)

---

## 🔄 Best Practices

### Instead of Deleting:
Consider these alternatives:

1. **Cancel Ticket**
   - Mark as `cancelled` status
   - Keeps record for history
   - Tracks cancellations

2. **Archive Ticket**
   - Move to archive tab
   - Not deleted, just hidden
   - Can restore later

3. **Invalidate Ticket**
   - Uncheck "validated" status
   - QR won't work at door
   - Ticket still exists

---

## 📊 After Deletion

### Automatic Updates:
- ✅ Ticket count decreases
- ✅ Capacity freed up
- ✅ Attendee list refreshes
- ✅ Stats dashboard updates

### Manual Steps (If Needed):
- Send refund (if paid)
- Email customer (cancellation notice)
- Update waitlist (offer to next person)
- Adjust revenue tracking

---

## 💡 Quick Access

### Fastest Way to Delete a Ticket:

```
Dashboard → My Events → Click Event → Ticket Management → Attendees Tab
→ Find Ticket → Click Trash Icon → Confirm
```

**Total Time**: ~10 seconds ⚡

---

## 🔍 Finding Specific Tickets

### Search by:
- **Name**: Type in search bar
- **Email**: Filter by email
- **Phone**: Search phone number
- **Ticket Code**: Search unique code
- **Status**: Filter paid/pending/validated

### Filters Available:
- Payment Status (paid, pending, failed)
- Validation Status (validated, not validated)
- Tier (VIP, General, etc.)
- Date Range

---

## 🚨 Emergency Bulk Delete

If you need to delete ALL tickets for an event:

### Method 1: Bulk Select (Safer)
1. Go to Archive tab
2. Select all tickets checkbox
3. Click "Delete Selected"
4. Confirm

### Method 2: Database (Advanced)
⚠️ **Only if you know what you're doing!**

```sql
-- In Supabase SQL Editor
DELETE FROM tickets
WHERE event_id = 'your-event-id';
```

**Warning**: This is PERMANENT and cannot be undone!

---

## 📧 Customer Communication

### Auto-send on delete:
Currently **NOT** automatic. You should:

1. Note customer email before deleting
2. Send manual cancellation email
3. Process refund if applicable

### Future Enhancement:
We can add auto-email on ticket deletion if needed.

---

## ✅ Summary

**Where?** → Event Dashboard → Attendees Tab  
**How?** → Click trash icon → Confirm  
**Who?** → Event creators only  
**Undo?** → No, permanent deletion  
**Alternative?** → Archive or invalidate instead  

---

**Need help finding the delete button?** 
- It's in the **Attendees tab** 
- Look for the 🗑️ trash icon
- One click to delete!
