# 🎯 Build Your First Workflow - 5 Minutes

**Let's build a simple Customer Support Automation workflow**

---

## 🚀 Quick Start

### Open Agent Studio:
```
http://localhost:3001/agents/studio
```

You should see:
- **Left:** Module Palette (18 modules)
- **Center:** Empty Canvas (drop zone)
- **Right:** Will show configuration when you click a node

---

## Step 1: Add Manual Trigger (30 seconds)

### Action:
1. **Find** "Manual" in the left sidebar under **Triggers**
2. **Click and drag** it to the canvas
3. **Drop** it anywhere on the canvas

### Expected Result:
- ✅ A green node appears labeled "Manual Trigger"
- ✅ Node has a small handle (circle) on the right side

### Visual:
```
┌────────────────────┐
│  🎯 Manual Trigger │
│                    │──○ (handle)
└────────────────────┘
```

---

## Step 2: Add Customer Support Agent (30 seconds)

### Action:
1. **Find** "Customer Support" in the left sidebar under **Skills**
2. **Drag** it to the canvas
3. **Drop** it to the RIGHT of the Manual Trigger

### Expected Result:
- ✅ An orange node appears labeled "Customer Support"
- ✅ Node has handles on both left and right sides

### Visual:
```
┌────────────┐        ┌───────────────────┐
│   Trigger  │──○  ○──│ Customer Support  │──○
└────────────┘        └───────────────────┘
```

---

## Step 3: Connect the Nodes (30 seconds)

### Action:
1. **Hover** over the **right handle** of the Manual Trigger
2. **Click and drag** from the handle
3. **Release** on the **left handle** of the Customer Support node

### Expected Result:
- ✅ An **animated line** connects the two nodes
- ✅ The line is smooth and flowing

### Visual:
```
┌────────────┐          ┌───────────────────┐
│   Trigger  │──────────│ Customer Support  │──○
└────────────┘          └───────────────────┘
       Animated connection
```

---

## Step 4: Add Send Email Node (30 seconds)

### Action:
1. **Find** "Send Email" in the left sidebar under **Actions**
2. **Drag** it to the canvas
3. **Drop** it to the RIGHT of Customer Support node
4. **Connect** Customer Support → Send Email (same as Step 3)

### Expected Result:
- ✅ A blue email node appears
- ✅ Three nodes connected in a flow

### Visual:
```
┌─────────┐      ┌──────────┐      ┌────────────┐
│ Trigger │──────│ Support  │──────│ Send Email │
└─────────┘      └──────────┘      └────────────┘
```

---

## Step 5: Configure Customer Support Node (1 minute)

### Action:
1. **Click** on the Customer Support node
2. **Right panel opens** → Configuration Panel
3. **Fill in** the following:

**Agent Selection:**
- Select: "Cassie - Customer Support"

**Prompt:**
```
Analyze this customer inquiry and provide a helpful, empathetic response:

Customer Email: {{customer_email}}
Inquiry: {{customer_inquiry}}

Provide a professional and friendly response.
```

**Settings:**
- Temperature: `0.7`
- Max Tokens: `500`

4. **Click outside** to close the panel

### Expected Result:
- ✅ Configuration saved
- ✅ Panel closes

---

## Step 6: Configure Send Email Node (1 minute)

### Action:
1. **Click** on the Send Email node
2. **Configuration Panel opens**
3. **Fill in:**

**To:**
```
{{customer_email}}
```

**Subject:**
```
Re: Your Support Request
```

**Body:**
```
{{llm_response}}
```

**Method:** `POST`
**URL:** `/api/emails/send`

4. **Click outside** to close

### Expected Result:
- ✅ Email node configured
- ✅ Ready to save

---

## Step 7: Save Your Workflow (1 minute)

### Action:
1. **Click** the "Save" button (top right, disk icon)
2. **Fill in the Save Dialog:**

**Name:**
```
Customer Support Automation
```

**Description:**
```
Auto-respond to customer inquiries with AI-powered support
```

**Tags:**
```
support, automation, ai
```

**Status:** `Draft`
**Visibility:** `Private`

3. **Click** "Save Workflow"

### Expected Result:
- ✅ Success message appears
- ✅ Workflow saved to database
- ✅ Workflow ID assigned

---

## Step 8: Test Your Workflow (1 minute)

### Action:
1. **Click** "Test Run" button (top right, play icon)
2. **Preview Panel opens** (right sidebar)
3. **Enter test input:**

```json
{
  "customer_email": "john@example.com",
  "customer_inquiry": "How do I reset my password?"
}
```

4. **Click** "Run Test"

### Expected Result:
- ✅ Execution starts
- ✅ Logs appear in real-time
- ✅ You see:
  - ✅ Trigger node executed
  - ✅ Customer Support agent processing
  - ✅ AI response generated
  - ✅ Email sent (or simulated)

### Live Execution Logs:
```
[INFO] Trigger: Manual trigger started
[INFO] Customer Support: Processing inquiry...
[SUCCESS] Customer Support: Response generated
[INFO] Send Email: Sending to john@example.com
[SUCCESS] Workflow completed
```

---

## 🎉 Congratulations!

You just built your first AI-powered workflow!

### What You Built:
```
Customer Inquiry (Manual)
    ↓
AI analyzes and generates response (Cassie)
    ↓
Email sent to customer
```

### Business Value:
- ⚡ Instant customer support responses
- 🤖 AI-powered empathy and accuracy
- 📧 Automated email delivery
- ⏱️ Save 5-10 minutes per inquiry

---

## 🚀 What's Next?

### Try These Next:

**1. Add Conditional Logic:**
- Add a "Condition" node after Customer Support
- Check if the inquiry is urgent
- Route urgent → Slack notification
- Route normal → Email

**2. Add Data Transform:**
- Transform the AI response
- Extract sentiment score
- Log to analytics database

**3. Build Another Workflow:**
- Try the "Content Generation Pipeline"
- Or the "Lead Qualification Pipeline"
- See `WORKFLOW_TEMPLATES.md` for more ideas

---

## 🐛 Troubleshooting

### Drag & Drop Not Working?
- Press `Ctrl + Shift + R` (hard reload)
- Check console (F12) for errors

### Nodes Not Connecting?
- Make sure you drag from **right handle → left handle**
- Handles are small circles on the node edges

### Configuration Not Saving?
- Make sure to click outside the panel to save
- Or press Enter after typing

### Test Execution Fails?
- Make sure workflow is **saved first**
- Check that all required fields are filled
- Verify backend is running (port 4000)

---

## 📊 Visual Cheat Sheet

### Module Types & Colors:
```
🟢 Green  = Triggers (Start points)
🟠 Orange = Skills (AI Agents)
🔵 Blue   = Actions (Send email, API calls)
🟣 Purple = Logic (Conditions, Loops, Transform)
⚪ Gray   = Integrations (Gmail, Slack, Calendar)
```

### Connection Rules:
```
✅ Trigger → Skill → Action → Output
✅ Skill → Condition → Multiple Actions
✅ Loop → Skill → Transform → API
❌ Action → Trigger (Triggers are always first)
```

### Variable Syntax:
```
{{input}}              = Trigger input
{{llm_response}}       = Output from AI agent
{{customer_email}}     = Specific field
{{transformed_data}}   = Output from transform node
```

---

## 🎯 Success Checklist

After completing this guide, you should be able to:

- ✅ Drag modules from palette to canvas
- ✅ Drop modules to create nodes
- ✅ Connect nodes with animated lines
- ✅ Configure node settings
- ✅ Save workflows to database
- ✅ Test workflow execution
- ✅ View execution logs in real-time
- ✅ Understand variable references

---

## 💡 Pro Tips

1. **Name your nodes clearly:**
   - Bad: "Agent 1", "Agent 2"
   - Good: "Qualify Lead", "Send Welcome Email"

2. **Use descriptive prompts:**
   - Include context and expected output
   - Reference variables with `{{variable}}`

3. **Test incrementally:**
   - Build 2-3 nodes → Save → Test
   - Don't build the entire workflow before testing

4. **Check logs carefully:**
   - Logs show exactly what happened
   - Use logs to debug issues

5. **Save often:**
   - Save after every major change
   - Workflows auto-save to versions

---

## 📚 Learn More

- **WORKFLOW_TEMPLATES.md** - 6 pre-built templates
- **AGENT_STUDIO_TEST_PLAN.md** - Comprehensive testing
- **AGENT_STUDIO_STATUS.md** - Feature overview

---

**Ready to build more?**

Try building workflow #2 (Content Generation) or #5 (Lead Qualification) from the templates guide!

**Need help?**

Check the troubleshooting section or ask for assistance.

---

**Your Agent Studio is ready! Start building! 🚀**
