# 🧪 Agent Studio - Comprehensive Test Plan

**Version:** 1.0
**Date:** 2025-11-16
**Tester:** [Your Name]
**Environment:** Development (localhost:3001)

---

## 📋 Test Preparation

### Pre-requisites
- [ ] Backend running on port 4000
- [ ] Frontend running on port 3001
- [ ] PostgreSQL database connected
- [ ] Redis running
- [ ] Browser: Chrome/Firefox (latest version)
- [ ] Browser DevTools open (Console + Network tabs)

### Test Data Setup
```bash
# Verify services
curl http://localhost:4000/api/unified-agents/health
# Expected: {"status":"healthy"}

# Check database
psql -h localhost -d your_db -c "SELECT COUNT(*) FROM workflows;"
# Expected: 3 (default templates)
```

---

## 🎯 Test Suite 1: CRITICAL PATH - Drag & Drop

**Priority:** P0 (BLOCKER)
**Impact:** Without this, the entire Studio is unusable

### TC-001: Module Palette Visibility
**Steps:**
1. Navigate to `http://localhost:3001/agents/studio`
2. Observe left sidebar

**Expected:**
- ✅ Module Palette visible with 5 categories
- ✅ "Skills" and "Actions" categories expanded by default
- ✅ Search box visible and functional
- ✅ Total 18 modules visible across all categories

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-002: Drag Start - Visual Feedback
**Steps:**
1. Open "Skills" category
2. Click and hold "Data Analysis" module
3. Start dragging (move mouse while holding)

**Expected:**
- ✅ Cursor changes to "grabbing" cursor
- ✅ Module card follows mouse movement
- ✅ Some visual indication that dragging is active

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Browser Console Check:**
- [ ] No errors in console
- [ ] dataTransfer is set (check with console.log)

---

### TC-003: Canvas Drop Zone Recognition
**Steps:**
1. Drag "Data Analysis" module from palette
2. Hover over the center canvas area (large gray area)
3. Observe visual feedback

**Expected:**
- ✅ Canvas shows drop-allowed cursor (not "no-drop")
- ✅ No visual "rejection" of the dragged item

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Debug in Console:**
```javascript
// Open Console and run:
document.querySelector('.react-flow').addEventListener('dragover', (e) => {
  console.log('DRAGOVER EVENT FIRED', e);
  e.preventDefault();
});
```

---

### TC-004: Drop & Node Creation
**Steps:**
1. Drag "Data Analysis" module onto canvas center
2. Release mouse button (drop)

**Expected:**
- ✅ A new node appears on canvas where dropped
- ✅ Node shows "Data Analysis" label
- ✅ Node has blue/cyan color (#06B6D4)
- ✅ Node has Brain icon
- ✅ Node has input handle (left side) and output handle (right side)
- ✅ Canvas counter updates: "1 module · 0 connections"

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**If FAIL, check Console for:**
- Errors related to `reactFlowInstance`
- Errors related to `JSON.parse`
- Errors related to node creation

---

### TC-005: Multiple Nodes
**Steps:**
1. Drag "Customer Support" module onto canvas
2. Drag "Send Email" action module onto canvas
3. Verify both nodes are visible

**Expected:**
- ✅ Two distinct nodes on canvas
- ✅ Each node has different color
- ✅ Canvas counter: "2 modules · 0 connections"
- ✅ Nodes can be selected (click to select)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-006: Node Connection (Edge Creation)
**Steps:**
1. Place "Data Analysis" node on canvas
2. Place "Send Email" node to the right
3. Click and drag from "Data Analysis" output handle (right side)
4. Connect to "Send Email" input handle (left side)

**Expected:**
- ✅ Edge (line) appears connecting the two nodes
- ✅ Edge is animated
- ✅ Edge color matches accent color
- ✅ Canvas counter: "2 modules · 1 connection"

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 🎯 Test Suite 2: MODULE CONFIGURATION

**Priority:** P1 (HIGH)

### TC-007: Configuration Panel Open
**Steps:**
1. Place "Data Analysis" node on canvas
2. Click on the node to select it

**Expected:**
- ✅ Right sidebar slides in (Configuration Panel)
- ✅ Panel shows module name "Data Analysis"
- ✅ Panel shows configuration options
- ✅ "Close" button (X) visible in top-right

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-008: Configuration Panel - Edit Settings
**Steps:**
1. Select "Data Analysis" node
2. In Configuration Panel, locate editable fields
3. Change "Model" from "gpt-4" to "gpt-3.5-turbo"
4. Change "Temperature" slider

**Expected:**
- ✅ Dropdown menus work
- ✅ Sliders are interactive
- ✅ Changes are reflected immediately
- ✅ Node updates visually (if applicable)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-009: Configuration Panel - Close
**Steps:**
1. Open Configuration Panel by selecting a node
2. Click the X button in top-right of panel

**Expected:**
- ✅ Panel slides out (closes)
- ✅ Node remains selected on canvas
- ✅ Canvas is still interactive

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 🎯 Test Suite 3: WORKFLOW PERSISTENCE

**Priority:** P1 (HIGH)

### TC-010: Save Button - First Save
**Steps:**
1. Create a simple workflow (2-3 nodes connected)
2. Click "Save" button in top toolbar
3. Fill out Save Dialog:
   - Name: "Test Workflow 1"
   - Description: "My first test workflow"
   - Add tag: "test"
   - Status: Draft
   - Visibility: Private
4. Click "Save Workflow" button

**Expected:**
- ✅ Save Dialog opens
- ✅ All form fields are editable
- ✅ "Save Workflow" button is enabled when name is entered
- ✅ Dialog closes after successful save
- ✅ Success message or indicator appears
- ✅ Workflow is now saved (has an ID)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Network Tab Check:**
- [ ] POST request to `/api/workflows` sent
- [ ] Response status: 201 Created
- [ ] Response body contains `workflow.id`

---

### TC-011: Save Button - Update Existing
**Steps:**
1. Load a saved workflow
2. Add a new node
3. Click "Save" button
4. Verify dialog shows existing data
5. Click "Save Workflow"

**Expected:**
- ✅ Dialog pre-fills with existing name, description, tags
- ✅ Save succeeds
- ✅ Workflow version increments (if versioning implemented)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Network Tab Check:**
- [ ] PUT request to `/api/workflows/:id` sent
- [ ] Response status: 200 OK

---

### TC-012: Template Gallery - Open
**Steps:**
1. Click "Templates" button in top toolbar

**Expected:**
- ✅ Template Gallery modal opens
- ✅ Shows at least 3 pre-built templates
- ✅ Each template shows:
   - Name
   - Description
   - Category badge
   - Module count
   - Connection count
   - Tags
- ✅ Search box is functional

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Network Tab Check:**
- [ ] GET request to `/api/workflows/templates` sent
- [ ] Response contains template data

---

### TC-013: Template Gallery - Use Template
**Steps:**
1. Open Template Gallery
2. Find "Customer Support Automation" template
3. Click "Use Template" button

**Expected:**
- ✅ Template is cloned
- ✅ Gallery closes
- ✅ Canvas loads with template nodes and connections
- ✅ All nodes are properly positioned
- ✅ All connections are visible

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Network Tab Check:**
- [ ] POST request to `/api/workflows/:id/clone` sent
- [ ] Response contains new workflow with copied nodes/edges

---

## 🎯 Test Suite 4: TEST EXECUTION

**Priority:** P1 (HIGH)

### TC-014: Preview Panel - Open
**Steps:**
1. Create a simple workflow (save it first)
2. Click "Test Run" button in top toolbar

**Expected:**
- ✅ Preview Panel slides in from right
- ✅ Shows "Live Preview" header
- ✅ Shows Test Case selector
- ✅ Shows "Run Test" button
- ✅ Test Case #1 is pre-selected

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-015: Preview Panel - Configure Test Input
**Steps:**
1. Open Preview Panel
2. Enter test input data:
   ```json
   {
     "customer_name": "John Doe",
     "inquiry": "How do I reset my password?"
   }
   ```
3. Set expected output (optional)

**Expected:**
- ✅ Input textarea accepts JSON
- ✅ No JSON syntax errors shown
- ✅ Can save test case configuration

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-016: Preview Panel - Execute Workflow
**Steps:**
1. Configure test input
2. Click "Run Test" button
3. Observe execution

**Expected:**
- ✅ "Run Test" button changes to "Stop" button
- ✅ Execution starts (status changes to "RUNNING")
- ✅ Logs appear in real-time
- ✅ Each node execution is logged
- ✅ Final status shows "SUCCESS" or "ERROR"
- ✅ Logs show timestamps

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Network Tab Check:**
- [ ] POST request to `/api/workflows/:id/execute` sent
- [ ] GET requests to `/api/workflows/:id/executions` polling for status
- [ ] Polling stops when status is "success" or "error"

---

### TC-017: Preview Panel - Execution Logs Detail
**Steps:**
1. Run a test workflow
2. Click on any log entry to expand it

**Expected:**
- ✅ Log entry expands to show details
- ✅ Shows input data
- ✅ Shows output data
- ✅ Shows execution time
- ✅ If error: shows error message

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 🎯 Test Suite 5: CANVAS INTERACTIONS

**Priority:** P2 (MEDIUM)

### TC-018: Node Selection
**Steps:**
1. Place 3 nodes on canvas
2. Click on each node individually

**Expected:**
- ✅ Clicked node shows blue selection border
- ✅ Previously selected node deselects
- ✅ Configuration Panel updates to show selected node

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-019: Node Dragging (Repositioning)
**Steps:**
1. Place a node on canvas
2. Click and drag the node to a new position

**Expected:**
- ✅ Node follows mouse movement
- ✅ Connected edges update in real-time
- ✅ Node snaps to new position on release

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-020: Node Deletion
**Steps:**
1. Place a node on canvas
2. Select the node
3. Press DELETE or BACKSPACE key

**Expected:**
- ✅ Node is removed from canvas
- ✅ Connected edges are also removed
- ✅ Canvas counter updates

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-021: Edge Deletion
**Steps:**
1. Create a connection between two nodes
2. Click on the edge (line) to select it
3. Press DELETE key

**Expected:**
- ✅ Edge is removed
- ✅ Nodes remain on canvas
- ✅ Canvas counter updates

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-022: Zoom Controls
**Steps:**
1. Place several nodes on canvas
2. Click zoom in (+) button
3. Click zoom out (-) button
4. Use mouse scroll wheel to zoom

**Expected:**
- ✅ Canvas zooms in smoothly
- ✅ Canvas zooms out smoothly
- ✅ Scroll wheel zoom works
- ✅ Nodes scale proportionally

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-023: Pan Canvas
**Steps:**
1. Place nodes across different areas of canvas
2. Click and drag on empty canvas area (not on a node)

**Expected:**
- ✅ Canvas pans (moves) in drag direction
- ✅ Nodes move with canvas
- ✅ Minimap updates

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-024: Minimap Interaction
**Steps:**
1. Create a large workflow (10+ nodes)
2. Zoom out to see entire workflow
3. Click on Minimap (bottom-right) viewport indicator
4. Drag the viewport in minimap

**Expected:**
- ✅ Main canvas view follows minimap viewport
- ✅ Minimap shows all nodes as colored dots
- ✅ Viewport indicator is interactive

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 🎯 Test Suite 6: SEARCH & FILTERING

**Priority:** P2 (MEDIUM)

### TC-025: Module Search
**Steps:**
1. In Module Palette, type "email" in search box

**Expected:**
- ✅ Only modules containing "email" in name or description are shown
- ✅ "Send Email" action is visible
- ✅ "Email Integration" is visible
- ✅ Other categories collapse or hide irrelevant modules

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-026: Template Search
**Steps:**
1. Open Template Gallery
2. Type "support" in search box

**Expected:**
- ✅ Only templates with "support" in name/description/tags are shown
- ✅ "Customer Support Automation" template is visible
- ✅ Other templates are hidden

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-027: Template Category Filter
**Steps:**
1. Open Template Gallery
2. Click on "Customer Support" category pill

**Expected:**
- ✅ Only templates in that category are shown
- ✅ Category pill is highlighted/selected
- ✅ Other templates are filtered out

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 🎯 Test Suite 7: ERROR HANDLING

**Priority:** P2 (MEDIUM)

### TC-028: Test Run Without Saved Workflow
**Steps:**
1. Create a workflow (do NOT save it)
2. Click "Test Run" button

**Expected:**
- ✅ Preview Panel shows warning message
- ✅ "Run Test" button is disabled
- ✅ Message says "Save workflow first to enable testing"

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-029: Save Workflow With Empty Name
**Steps:**
1. Create a workflow
2. Click "Save" button
3. Leave name field empty
4. Try to click "Save Workflow"

**Expected:**
- ✅ "Save Workflow" button is disabled
- ✅ Name field shows validation error (optional)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-030: Invalid Node Connection
**Steps:**
1. Try to connect a node's output to its own input (self-loop)

**Expected:**
- ✅ Connection is rejected
- OR
- ✅ Warning is shown (not recommended)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-031: Backend Down - Graceful Degradation
**Steps:**
1. Stop the backend server
2. Try to save a workflow
3. Try to open Template Gallery

**Expected:**
- ✅ Error message is shown (not silent failure)
- ✅ User-friendly error text (not raw error)
- ✅ App doesn't crash

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 🎯 Test Suite 8: UI/UX POLISH

**Priority:** P3 (LOW)

### TC-032: Empty State Messages
**Steps:**
1. Open fresh Agent Studio (no workflows)
2. Observe canvas center

**Expected:**
- ✅ Welcome message is shown
- ✅ Instructions for getting started
- ✅ "Start Building" button (even if non-functional)

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-033: Loading States
**Steps:**
1. Open Template Gallery
2. Observe while templates load

**Expected:**
- ✅ Loading spinner or skeleton is shown
- ✅ "Loading templates..." message
- ✅ Smooth transition when data loads

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-034: Hover States
**Steps:**
1. Hover over each interactive element:
   - Module cards
   - Nodes on canvas
   - Buttons in toolbar
   - Edges

**Expected:**
- ✅ All elements show visual hover feedback
- ✅ Cursor changes appropriately

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

### TC-035: Keyboard Shortcuts
**Steps:**
1. Place nodes on canvas
2. Try keyboard shortcuts:
   - DELETE: Delete selected node
   - CTRL+C / CMD+C: Copy node
   - CTRL+V / CMD+V: Paste node
   - CTRL+Z / CMD+Z: Undo
   - CTRL+SHIFT+Z / CMD+SHIFT+Z: Redo

**Expected:**
- ✅ DELETE works
- ⚠️ Copy/Paste may not be implemented yet
- ⚠️ Undo/Redo may not be implemented yet

**Actual Result:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## 📊 TEST SUMMARY REPORT

### Critical Bugs (P0 - BLOCKER)
| Test ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| TC-004 | Drag & Drop Node Creation | [ ] PASS / [ ] FAIL | |
| TC-006 | Node Connection | [ ] PASS / [ ] FAIL | |

### High Priority Bugs (P1)
| Test ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| TC-007 | Configuration Panel | [ ] PASS / [ ] FAIL | |
| TC-010 | Save Workflow | [ ] PASS / [ ] FAIL | |
| TC-012 | Template Gallery | [ ] PASS / [ ] FAIL | |
| TC-016 | Test Execution | [ ] PASS / [ ] FAIL | |

### Medium Priority Bugs (P2)
| Test ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| TC-019 | Node Dragging | [ ] PASS / [ ] FAIL | |
| TC-025 | Module Search | [ ] PASS / [ ] FAIL | |
| TC-028 | Error Handling | [ ] PASS / [ ] FAIL | |

### Low Priority Issues (P3)
| Test ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| TC-032 | Empty States | [ ] PASS / [ ] FAIL | |
| TC-034 | Hover States | [ ] PASS / [ ] FAIL | |

---

## 🔍 DEBUGGING GUIDE

### If Drag & Drop Fails (TC-004 FAIL)

**Step 1: Check Browser Console**
```javascript
// Paste this in console to debug:
const canvas = document.querySelector('.react-flow__pane');
if (canvas) {
  console.log('✅ Canvas element found');
  canvas.addEventListener('drop', (e) => {
    console.log('🎯 DROP EVENT FIRED!', e);
  });
  canvas.addEventListener('dragover', (e) => {
    console.log('👆 DRAGOVER EVENT', e);
  });
} else {
  console.error('❌ Canvas element NOT found');
}
```

**Step 2: Check React Flow Instance**
```javascript
// In VisualCanvas.tsx, add this log:
useEffect(() => {
  console.log('ReactFlow Instance:', reactFlowInstance);
  if (!reactFlowInstance) {
    console.warn('⚠️ ReactFlow instance not initialized!');
  }
}, [reactFlowInstance]);
```

**Step 3: Add ReactFlowProvider**
If instance is null, wrap VisualAgentStudio in ReactFlowProvider:
```tsx
// In app/(app)/agents/studio/page.tsx
import { ReactFlowProvider } from 'reactflow';

export default function AgentStudioPage() {
  return (
    <ReactFlowProvider>
      <VisualAgentStudio />
    </ReactFlowProvider>
  );
}
```

---

### If Save Fails (TC-010 FAIL)

**Check Network Tab:**
- Is POST request sent?
- What's the response status?
- What's the response body?

**Common Issues:**
1. **401 Unauthorized** → Check `x-user-id` header is sent
2. **400 Bad Request** → Check request payload format
3. **500 Server Error** → Check backend logs
4. **Network Error** → Backend is down

---

### If Test Run Fails (TC-016 FAIL)

**Verify workflow is saved first:**
```javascript
// In browser console:
console.log('Current workflow ID:', currentWorkflow?.id);
// Should NOT be null/undefined
```

**Check API requests:**
1. POST `/api/workflows/:id/execute` → Should return 202 Accepted
2. GET `/api/workflows/:id/executions` → Should poll every 1 second
3. Check response contains `logs` array

---

## ✅ SUCCESS CRITERIA

**Minimum Viable Product (MVP):**
- [ ] All P0 tests PASS (Drag & Drop, Node Connections)
- [ ] At least 80% of P1 tests PASS
- [ ] No critical bugs remaining
- [ ] User can build a simple 3-node workflow end-to-end

**Production Ready:**
- [ ] All P0 and P1 tests PASS
- [ ] At least 70% of P2 tests PASS
- [ ] All error states handled gracefully
- [ ] Performance is smooth (no lag during drag/drop)

---

## 📝 TESTING NOTES

**Environment:**
- Browser: _________________
- OS: _________________
- Screen Resolution: _________________

**Tester Comments:**
_________________________________
_________________________________
_________________________________

**Overall Assessment:**
[ ] READY FOR PRODUCTION
[ ] NEEDS MINOR FIXES
[ ] NEEDS MAJOR REWORK
[ ] BLOCKED - CRITICAL BUGS

---

**Test Completed By:** _________________
**Date:** _________________
**Signature:** _________________
