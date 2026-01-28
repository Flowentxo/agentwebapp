# ⚡ Agent Studio - Quick Reference Card

**Pin this while building workflows!**

---

## 🎨 Available Modules (18 Total)

### 🟢 Triggers (Start Points)
| Module | Icon | Use For |
|--------|------|---------|
| **Manual** | Play | User-initiated workflows |
| **Scheduled** | Clock | Cron jobs (hourly, daily, weekly) |
| **Webhook** | Webhook | External system triggers |

### 🟠 Skills (AI Agents)
| Module | Icon | Use For | Agent ID |
|--------|------|---------|----------|
| **Data Analysis** | BarChart | Analytics, insights | `dexter` |
| **Customer Support** | MessageCircle | Support responses | `cassie` |
| **Content Generation** | FileText | Blog posts, articles | `nova` |
| **Code Review** | Code | Review code | `kai` |
| **Research** | Search | Research topics | `ari` |

### 🔵 Actions (Do Things)
| Module | Icon | Use For |
|--------|------|---------|
| **Send Email** | Mail | Email delivery |
| **Send Slack** | MessageSquare | Slack notifications |
| **Create Task** | CheckSquare | Task management |
| **Update Database** | Database | Database operations |

### 🟣 Logic & Flow (Control)
| Module | Icon | Use For |
|--------|------|---------|
| **Condition** | GitBranch | If/else logic |
| **Loop** | Repeat | Iterate over items |
| **Delay** | Clock | Wait between actions |

### ⚪ Integrations
| Module | Icon | Use For |
|--------|------|---------|
| **Email** | Mail | Gmail integration |
| **Slack** | MessageSquare | Slack integration |
| **Calendar** | Calendar | Calendar integration |

---

## 🔗 Connection Rules

### Valid Flow Patterns:
```
✅ Trigger → Skill → Action
✅ Trigger → Loop → Skill → Action
✅ Skill → Condition → [Action A] / [Action B]
✅ Trigger → Skill → Transform → Database
```

### Invalid Patterns:
```
❌ Action → Trigger (Triggers must be first)
❌ Output → Anything (Output is final)
❌ Disconnected nodes (All nodes must connect)
```

---

## 📝 Variable Reference Syntax

### Basic Variables:
```javascript
{{input}}              // Trigger input
{{llm_response}}       // AI agent output
{{customer_email}}     // Specific input field
{{analysis_result}}    // Previous node output
```

### In Prompts:
```
Analyze this data: {{input}}
Customer name: {{customer_name}}
Previous result: {{llm_response}}
```

### In API Calls:
```json
{
  "to": "{{customer_email}}",
  "body": "{{llm_response}}",
  "priority": "{{priority_level}}"
}
```

---

## ⚙️ Common Configurations

### LLM Agent (Skills):
```javascript
agentId: "cassie"         // Which agent to use
prompt: "Your prompt here with {{variables}}"
temperature: 0.7          // Creativity (0-1)
maxTokens: 500           // Response length
```

### API Call (Actions):
```javascript
method: "POST"            // GET, POST, PUT, DELETE
url: "/api/endpoint"      // API endpoint
headers: { ... }          // Optional headers
body: { ... }             // Request body
```

### Condition (Logic):
```javascript
// Simple comparison
return input.score > 70;

// String check
return input.includes("urgent");

// Complex logic
return input.revenue > 10000 && input.employees < 50;
```

### Data Transform:
```javascript
// Extract fields
return {
  name: input.name,
  email: input.email,
  score: parseInt(input.score)
};

// Format data
return {
  formatted_date: new Date().toISOString(),
  total: items.reduce((sum, item) => sum + item.price, 0)
};
```

---

## 🎯 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save workflow | `Ctrl + S` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` |
| Delete node | Select + `Delete` |
| Zoom in | `Ctrl + +` |
| Zoom out | `Ctrl + -` |
| Fit view | `Ctrl + 0` |

---

## 🐛 Quick Troubleshooting

### Drag & Drop Not Working?
```
1. Hard reload: Ctrl + Shift + R
2. Check console: F12 → Console tab
3. Verify ReactFlow initialized
```

### Nodes Won't Connect?
```
1. Drag from RIGHT handle (source)
2. Drop on LEFT handle (target)
3. Make sure handles are visible
```

### Save Fails?
```
1. Check all required fields filled
2. Verify backend running (port 4000)
3. Check network tab for errors
```

### Test Execution Fails?
```
1. Save workflow first
2. Provide valid test input
3. Check backend logs
4. Verify API endpoints work
```

---

## 📊 Module Color Guide

```
🟢 Green  (#10B981) = Triggers
🟠 Orange (#F59E0B) = Skills (AI Agents)
🔵 Blue   (#3B82F6) = Actions
🟣 Purple (#8B5CF6) = Logic & Flow
🔴 Red    (#EF4444) = Output
⚪ Gray   (#6B7280) = Integrations
```

---

## 🧪 Test Input Examples

### Customer Support:
```json
{
  "customer_email": "john@example.com",
  "customer_inquiry": "How do I reset my password?"
}
```

### Content Generation:
```json
{
  "topic": "AI in Healthcare",
  "tone": "professional",
  "length": "500 words"
}
```

### Lead Qualification:
```json
{
  "company_name": "Acme Corp",
  "industry": "SaaS",
  "employees": 50,
  "revenue": 5000000
}
```

### Data Analysis:
```json
{
  "sales_data": {
    "revenue": 150000,
    "transactions": 450,
    "avg_order": 333
  }
}
```

---

## 🎨 Canvas Controls

### Mouse Controls:
- **Drag canvas:** Click and drag background
- **Zoom:** Scroll wheel
- **Select node:** Click node
- **Multi-select:** Ctrl + Click
- **Delete:** Select + Delete key

### Panel Controls:
- **Save:** Top right, disk icon
- **Test Run:** Top right, play icon
- **Templates:** Top right, sparkles icon

---

## 📚 Common Patterns

### Email Response Flow:
```
Manual Trigger → Support Agent → Send Email
```

### Conditional Routing:
```
Trigger → Agent → Condition
              ├─ True → High Priority Action
              └─ False → Standard Action
```

### Data Processing:
```
Trigger → Fetch Data → Transform → Database
```

### Multi-Agent:
```
Trigger → Research Agent → Content Agent → Review Agent → Output
```

### Loop Processing:
```
Trigger → Loop (customers)
           └─ Generate Content → Send Email → Delay
```

---

## 🚀 Performance Tips

1. **Keep workflows focused:**
   - 5-10 nodes per workflow is optimal
   - Break complex flows into multiple workflows

2. **Use delays in loops:**
   - Add 1-5 second delays to avoid rate limits
   - Prevents overwhelming external APIs

3. **Cache expensive operations:**
   - Use data transform to cache results
   - Avoid repeated API calls

4. **Test with small datasets:**
   - Test with 1-2 items first
   - Scale up after validation

---

## 🔒 Security Best Practices

1. **Never hardcode sensitive data:**
   - Use variables: `{{api_key}}`
   - Store secrets in environment variables

2. **Validate inputs:**
   - Use condition nodes to validate data
   - Check for required fields

3. **Use private visibility:**
   - Keep workflows private by default
   - Only share when necessary

---

## 📞 Need Help?

### Documentation:
- `BUILD_YOUR_FIRST_WORKFLOW.md` - Step-by-step guide
- `WORKFLOW_TEMPLATES.md` - 6 pre-built templates
- `AGENT_STUDIO_TEST_PLAN.md` - Testing guide

### Debug Mode:
```javascript
// Paste in browser console (F12)
const rfInstance = document.querySelector('.react-flow__renderer');
console.log('ReactFlow:', rfInstance ? '✅ Active' : '❌ Not found');
```

---

**Pin this reference card while building! 📌**

**Agent Studio:** http://localhost:3001/agents/studio
