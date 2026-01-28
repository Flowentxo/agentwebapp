# 🚀 Agent Studio - Quick Start Guide

**Welcome to Agent Studio!** Build AI agents visually - no code required.

---

## 📖 What You'll Learn (5 Minutes)

1. How to create your first agent workflow
2. How to test workflows instantly (unique feature!)
3. How to configure AI settings
4. How to save and run workflows

---

## 🎯 Your First Workflow (3 Easy Steps)

### **Step 1: Open Agent Studio**
```
URL: http://localhost:3000/agents/studio
```

You'll see:
- **Left:** Module Library (18 pre-built modules)
- **Center:** Canvas (drag modules here)
- **Right:** Configuration Panel (appears when you click a module)

### **Step 2: Use a Template (Easiest Way)**
```
1. Click "Templates" button (top right)
2. Choose "Customer Support Automation"
3. Click "Use Template"
4. ✅ Done! A complete workflow appears on canvas
```

**What you got:**
- Email Trigger (starts workflow when email arrives)
- Customer Support Agent (AI analyzes and responds)
- Send Email (sends the AI response)

### **Step 3: Test It!**
```
1. Click "Test Run" button (top right)
2. Preview Panel opens on the right
3. Click "Run Simulation" button
4. Watch the magic! ✨
```

**What you'll see:**
```
⚠️ Simulation-Modus aktiv

🚀 Workflow gestartet mit 3 Modulen

⚙️ [1/3] Starte Ausführung von "Email Trigger"...
✅ "Email Trigger" erfolgreich ausgeführt • 456ms

⚙️ [2/3] Starte Ausführung von "Customer Support"...
✅ "Customer Support" erfolgreich ausgeführt • 612ms
📊 Details anzeigen ▼ (click to expand!)

⚙️ [3/3] Starte Ausführung von "Send Email"...
✅ "Send Email" erfolgreich ausgeführt • 389ms

✅ Workflow erfolgreich abgeschlossen
```

**🎉 Congratulations!** You just ran your first AI agent workflow!

---

## 🧪 Understanding Simulation Mode

### **What is Simulation?**
Agent Studio has a **unique feature** no other platform has:
- Test workflows **instantly** without saving
- See **realistic outputs** for each module
- **No backend required** - works offline!

### **Simulation vs Real Execution**

| Feature | Simulation Mode | Real Execution |
|---------|----------------|----------------|
| **Speed** | Instant (< 5s) | Depends on APIs |
| **Data** | Mock/Realistic | Real API calls |
| **Save Required** | ❌ No | ✅ Yes |
| **Cost** | Free | API costs apply |
| **Use Case** | Testing ideas | Production |

### **When to use Simulation:**
- ✅ Exploring ideas
- ✅ Learning the platform
- ✅ Sharing demos
- ✅ Quick iterations

### **When to use Real Execution:**
- ✅ Production workflows
- ✅ Actual API integrations
- ✅ Real email/Slack messages
- ✅ Database operations

---

## 🎨 Building Your Own Workflow

### **Method 1: Start from Scratch**

**Step 1: Add Modules**
```
1. Open "Skills" category (left sidebar)
2. Drag "Data Analysis" to canvas
3. Open "Actions" category
4. Drag "Send Email" to canvas
```

**Step 2: Connect Modules**
```
1. Hover over "Data Analysis" node
2. You'll see connection handles (small circles)
3. Click and drag from the right handle
4. Drop on the left handle of "Send Email"
5. ✅ Connection created!
```

**Step 3: Configure Modules**
```
1. Click on "Data Analysis" node
2. Right panel opens with settings:
   - AI Model: GPT-4, GPT-3.5, Claude
   - Temperature: 0.7 (creativity level)
   - Max Tokens: 2000 (response length)
   - System Prompt: Custom instructions
3. Make your changes
4. Click X to close panel
5. ✅ Settings auto-saved!
```

**Step 4: Test**
```
1. Click "Test Run" (top right)
2. Click "Run Simulation"
3. Watch your workflow execute!
4. Click "Details anzeigen" to see outputs
```

**Step 5: Save (Optional)**
```
1. Click "Save" button (top right)
2. Fill in:
   - Name: "My First Workflow"
   - Description: What it does
   - Tags: data, analysis, email
   - Status: Draft or Published
   - Visibility: Private or Public
3. Click "Save Workflow"
4. ✅ Saved! Now you can use real execution
```

---

## 📚 Module Library Overview

### **Skills (5 Modules)**
AI-powered capabilities:
- **Data Analysis:** Analyze trends, find insights
- **Customer Support:** Answer questions, resolve tickets
- **Content Generation:** Write articles, social posts
- **Code Review:** Analyze code quality, suggest improvements
- **Research:** Find information, summarize sources

### **Actions (4 Modules)**
Do things:
- **Send Email:** Compose and send emails
- **Send Slack:** Post to Slack channels
- **Create Task:** Add to task manager
- **Update Database:** Save/update data

### **Integrations (3 Modules)**
Connect services:
- **Email:** Gmail, Outlook integration
- **Slack:** Workspace integration
- **Calendar:** Schedule events

### **Triggers (3 Modules)**
Start workflows:
- **Scheduled:** Run at specific times (cron)
- **Webhook:** Trigger via HTTP request
- **Manual:** Run on button click

### **Logic & Flow (3 Modules)**
Control flow:
- **Condition:** If/else branching
- **Loop:** Iterate over items
- **Delay:** Wait before continuing

---

## 🔧 Advanced Configuration

### **AI Settings Explained**

**Model Selection:**
```
GPT-4: Best quality, slower, more expensive
GPT-3.5: Good quality, faster, cheaper
Claude: Alternative, great for analysis
```

**Temperature (0.0 - 1.0):**
```
0.0 = Deterministic, focused, consistent
0.5 = Balanced (recommended)
1.0 = Creative, diverse, unpredictable
```

**Max Tokens:**
```
500 = Short responses (summaries)
2000 = Medium responses (default)
4000 = Long responses (articles)
```

**System Prompt:**
```
Custom instructions for the AI:

Example: "You are a professional email writer.
Keep responses under 100 words. Use friendly tone."
```

### **Node Settings**

**Label:** Display name on canvas
**Description:** What this node does
**Enabled:** Toggle on/off (for testing)
**Priority:** Execution order

---

## 💡 Pro Tips

### **1. Use Templates First**
Don't start from scratch! Templates show you:
- How to structure workflows
- How to connect modules
- Best practices
- Common patterns

### **2. Test Early, Test Often**
Simulation is **instant and free**:
- Test after adding each module
- Verify connections work
- Check outputs make sense
- Iterate quickly!

### **3. Explore Module Outputs**
Click "📊 Details anzeigen" to see:
- What data each module generates
- JSON structure
- Example values
- Learn what's possible!

### **4. Name Nodes Clearly**
Bad: "Customer Support 1"
Good: "Analyze Ticket Sentiment"

This helps when:
- Reading logs
- Debugging issues
- Sharing workflows

### **5. Use Conditions for Smart Workflows**
```
Email Trigger
    → Analyze Sentiment
        → If Positive: Send Thank You
        → If Negative: Escalate to Human
```

---

## 🐛 Troubleshooting

### **"Nothing happens when I click Test Run"**
**Solution:**
1. Add at least one module to canvas
2. Make sure Preview Panel is open (check right side)
3. Look for green/blue status messages
4. Check browser console (F12) for errors

### **"I can't drag modules"**
**Solution:**
1. Close Welcome Overlay first ("Start Building")
2. Make sure you're dragging FROM module library (left)
3. Drop ON canvas (center area)
4. Try refreshing page (Ctrl+R)

### **"My connections disappeared"**
**Solution:**
1. Connections auto-save when created
2. Check if nodes are overlapping (separate them)
3. Try zooming in/out (mouse wheel)
4. Use MiniMap (bottom right) to navigate

### **"Simulation shows no outputs"**
**Solution:**
1. Wait for simulation to complete (check status)
2. Look for "📊 Details anzeigen" and click it
3. Some nodes have no output (triggers, delays)
4. Check execution logs for errors

---

## 📊 Example Workflows to Try

### **1. Content Marketing Automation**
```
Scheduled Trigger (daily 9am)
    → Research (find trending topics)
    → Content Generation (write article)
    → Send Slack (notify team)
```

### **2. Data Analysis Pipeline**
```
Webhook Trigger (new data arrives)
    → Data Analysis (find insights)
    → Content Generation (create report)
    → Send Email (to stakeholders)
```

### **3. Smart Customer Support**
```
Email Trigger (support inbox)
    → Customer Support (analyze & respond)
    → Condition (check sentiment)
        → If Happy: Send Email (thank you)
        → If Angry: Create Task (escalate)
```

### **4. Code Quality Check**
```
Webhook Trigger (GitHub push)
    → Code Review (analyze changes)
    → Condition (check quality score)
        → If Good: Send Slack (✅ approved)
        → If Bad: Send Slack (❌ review needed)
```

---

## 🎯 Next Steps

### **After Your First Workflow:**
1. **Try all 3 templates** - See different patterns
2. **Modify a template** - Change AI settings, add modules
3. **Build something useful** - Solve a real problem
4. **Share feedback** - What do you love? What's missing?

### **Getting Help:**
- **Documentation:** Browse other `.md` files in project
- **Examples:** Check template gallery
- **Support:** Email support or open GitHub issue
- **Community:** Join Discord/Slack (links coming soon)

---

## 🎉 You're Ready!

You now know:
- ✅ How to use templates
- ✅ How to build custom workflows
- ✅ How to test with simulation
- ✅ How to configure AI settings
- ✅ How to save workflows

**Go build something amazing! 🚀**

---

## 📖 Further Reading

- `AGENT_STUDIO_COMPLETE.md` - Full feature documentation
- `MOCK_EXECUTION_ENGINE.md` - How simulation works
- `AGENT_STUDIO_PRODUCTION_READY.md` - Technical details
- Module Reference (coming soon)
- API Integration Guide (coming soon)

---

**Questions?** Reach out anytime!
**Found a bug?** Please report it!
**Built something cool?** Share it with us!

Happy building! 🎨
