# 🚀 Command Center - Quick Start Guide

Get the Command Center running in **5 minutes**!

---

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Redis running (optional, for caching)

---

## ⚡ Quick Start

### Step 1: Install Dependencies

```bash
cd Flowent-AI-Agent
npm install
```

### Step 2: Environment Setup

Create `.env.local` if not exists:

```bash
# Copy template
cp .env.example .env.local
```

Ensure these variables are set:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/flowent
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-... # Optional
```

### Step 3: Database Migration

```bash
# Apply Command Center schema
npm run db:push

# Verify tables
psql $DATABASE_URL -c "\dt"
```

You should see:
- ✅ `command_history`
- ✅ `user_command_preferences`
- ✅ `user_activity_log`
- ✅ `smart_suggestions`
- ✅ `dashboard_widgets`
- ✅ `usage_statistics`

### Step 4: Start Development Server

```bash
npm run dev
```

### Step 5: Access Command Center

Open browser:
```
http://localhost:3000/commands
```

**You're done!** 🎉

---

## 🎨 First Time User Experience

### What You'll See

1. **Hero Header**
   - "Command Your AI Army"
   - View toggle (Home | Commands)

2. **PersonalizedHome (Default)**
   - Greeting based on time of day
   - Quick Stats (3 cards)
   - Smart Suggestions (2-3 cards)
   - Quick Access agents

3. **Switch to Commands View**
   - Command input with suggestions
   - Quick Actions (6 shortcuts)
   - Collapsible Activity section
   - Frequently Used agents

---

## 🧪 Quick Test

### Test 1: Execute a Command

1. Go to `/commands`
2. Switch to "Commands" view
3. Click "Analyze Data" quick action
4. Verify:
   - ✅ Command executes
   - ✅ Collaboration card appears
   - ✅ Stats update

### Test 2: Check Suggestions

1. Go to `/commands`
2. Stay in "Home" view
3. Verify:
   - ✅ See greeting
   - ✅ See suggestions
   - ✅ Click suggestion → switches to Commands

### Test 3: Agent Access

1. Go to `/commands`
2. See "Frequently Used" section
3. Click an agent (e.g., Dexter)
4. Verify:
   - ✅ Navigates to `/agents/dexter/chat`
   - ✅ No errors

---

## 🐛 Troubleshooting

### Issue: Tables not created

**Solution:**
```bash
# Manually run migration
npm run db:migrate

# Or push schema
npm run db:push --force
```

### Issue: API returns 500

**Check:**
```bash
# Verify database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check logs
tail -f logs/error.log
```

### Issue: UI not loading

**Check:**
```bash
# Verify imports
npm run build

# Check console for errors
# Open DevTools → Console
```

### Issue: Recommendations not appearing

**Solution:**
```bash
# Check API endpoint
curl http://localhost:3000/api/command-center/recommendations \
  -H "x-user-id: demo-user"

# Should return JSON with recommendations
```

---

## 📖 Next Steps

### Learn More
- Read: `docs/COMMAND_CENTER_VISION.md`
- Explore: `docs/COMMAND_CENTER_COMPLETE_SUMMARY.md`
- Test: `docs/COMMAND_CENTER_TESTING_GUIDE.md`

### Customize
- Edit suggestions logic in `lib/command-center/recommendation-engine.ts`
- Add new quick actions in `components/commands/SimplifiedCommandCenter.tsx`
- Modify design tokens in `app/design-system.css`

### Deploy
- See: Production deployment guide (coming soon)
- Configure: Environment variables for production
- Monitor: Analytics and performance

---

## 🎓 Key Concepts

### 1. Personalization
The system learns from:
- Command execution history
- Time patterns
- Agent preferences
- Success rates

### 2. Context Awareness
Suggestions adapt to:
- Time of day
- Day of week
- Recent activity
- Session duration

### 3. Multi-Source Intelligence
Recommendations come from:
- Analytics (frequency, patterns)
- Context (time, location)
- Integrations (calendar, email)
- Knowledge Graph (relationships)

### 4. Progressive Disclosure
UI shows:
- Primary actions first
- Advanced features on demand
- Contextual information only

---

## 💡 Pro Tips

### Tip 1: Keyboard Shortcuts
- `⌘K` / `Ctrl+K` → Open command bar
- `Esc` → Close modals
- `Tab` → Navigate between elements

### Tip 2: Voice Commands
- Click microphone icon
- Speak your command
- System parses and executes

### Tip 3: Quick Access
- Most-used agents appear at bottom
- Click for instant chat
- Recent agents update automatically

### Tip 4: Collapsible Sections
- Click "Activity & Statistics" to expand
- Keeps UI clean by default
- Shows detailed metrics on demand

---

## 📞 Support

### Documentation
- Vision: `docs/COMMAND_CENTER_VISION.md`
- Summary: `docs/COMMAND_CENTER_COMPLETE_SUMMARY.md`
- Testing: `docs/COMMAND_CENTER_TESTING_GUIDE.md`

### Code
- Services: `lib/command-center/`
- Components: `components/commands/`
- API: `app/api/command-center/`

### Community
- GitHub Issues: (link)
- Discord: (link)
- Email: support@flowent.ai

---

## ✅ Checklist: Ready to Use

- [ ] Dependencies installed (`npm install`)
- [ ] Database connected
- [ ] Migrations applied
- [ ] Dev server running (`npm run dev`)
- [ ] Opened `/commands` in browser
- [ ] Tested basic functionality
- [ ] Read documentation

**All checked? You're ready to command your AI army! 🚀**

---

*Built with ❤️ - January 2025*
