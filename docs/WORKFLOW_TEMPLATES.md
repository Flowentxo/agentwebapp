# 🚀 Practical Workflow Templates - Agent Studio

Ready-to-build workflows for real business use cases.

---

## 1️⃣ Customer Support Automation
**Use Case:** Auto-respond to customer inquiries with AI-powered support

### Workflow Structure:
```
[Manual Trigger]
    → [Customer Support Agent]
    → [Send Email]
```

### Step-by-Step:
1. **Add Manual Trigger:**
   - Drag "Manual" from Triggers
   - Configure: `triggerName: "Customer Inquiry Received"`

2. **Add Customer Support Agent:**
   - Drag "Customer Support" from Skills
   - Configure:
     ```
     agentId: "cassie"
     prompt: "Analyze this customer inquiry and provide a helpful, empathetic response: {{input}}"
     ```

3. **Add Send Email:**
   - Drag "Send Email" from Actions
   - Configure:
     ```
     to: "{{customer_email}}"
     subject: "Re: Your Support Request"
     body: "{{llm_response}}"
     ```

4. **Connect:** Trigger → Support Agent → Email

5. **Save:** Name: "Customer Support Automation"

---

## 2️⃣ Content Generation Pipeline
**Use Case:** Generate blog posts with AI and save to database

### Workflow Structure:
```
[Scheduled Trigger]
    → [Content Generation Agent]
    → [Data Transform]
    → [Update Database]
```

### Step-by-Step:
1. **Add Scheduled Trigger:**
   - Drag "Scheduled" from Triggers
   - Configure: `schedule: "0 9 * * 1"` (Every Monday at 9 AM)

2. **Add Content Generation Agent:**
   - Drag "Content Generation" from Skills
   - Configure:
     ```
     agentId: "nova"
     prompt: "Write a 500-word blog post about {{topic}}"
     ```

3. **Add Data Transform:**
   - Drag "Data Transform" from Logic & Flow
   - Configure:
     ```javascript
     // Transform LLM output to database format
     return {
       title: input.split('\n')[0],
       content: input,
       author: "AI Assistant",
       status: "draft",
       created_at: new Date().toISOString()
     };
     ```

4. **Add Update Database:**
   - Drag "Update Database" from Actions
   - Configure:
     ```
     table: "blog_posts"
     operation: "insert"
     data: "{{transformed_data}}"
     ```

5. **Connect:** Trigger → Content Gen → Transform → Database

6. **Save:** Name: "Weekly Blog Generator"

---

## 3️⃣ Data Analysis & Reporting
**Use Case:** Analyze sales data and send daily reports

### Workflow Structure:
```
[Scheduled Trigger]
    → [Data Analysis Agent]
    → [Send Slack Message]
```

### Step-by-Step:
1. **Add Scheduled Trigger:**
   - Drag "Scheduled" from Triggers
   - Configure: `schedule: "0 8 * * *"` (Every day at 8 AM)

2. **Add Data Analysis Agent:**
   - Drag "Data Analysis" from Skills
   - Configure:
     ```
     agentId: "dexter"
     prompt: "Analyze yesterday's sales data and provide insights: {{sales_data}}"
     ```

3. **Add Send Slack Message:**
   - Drag "Send Slack Message" from Actions
   - Configure:
     ```
     channel: "#sales-reports"
     message: "📊 Daily Sales Report\n\n{{analysis}}"
     ```

4. **Connect:** Trigger → Analysis → Slack

5. **Save:** Name: "Daily Sales Report"

---

## 4️⃣ Code Review Assistant
**Use Case:** Automated code review for pull requests

### Workflow Structure:
```
[Webhook Trigger]
    → [Code Review Agent]
    → [Condition]
    → [Send Slack Message] / [Send Email]
```

### Step-by-Step:
1. **Add Webhook Trigger:**
   - Drag "Webhook" from Triggers
   - Configure: `webhookUrl: "/webhooks/pr-created"`

2. **Add Code Review Agent:**
   - Drag "Code Review" from Skills
   - Configure:
     ```
     agentId: "kai"
     prompt: "Review this pull request and provide feedback: {{pr_diff}}"
     ```

3. **Add Condition:**
   - Drag "Condition" from Logic & Flow
   - Configure:
     ```javascript
     // Check if review found critical issues
     return input.includes('CRITICAL') || input.includes('SECURITY');
     ```

4. **Add Send Slack (True Path):**
   - Drag "Send Slack Message"
   - Configure:
     ```
     channel: "#code-review-urgent"
     message: "🚨 Critical issues found:\n{{review}}"
     ```

5. **Add Send Email (False Path):**
   - Drag "Send Email"
   - Configure:
     ```
     to: "{{developer_email}}"
     subject: "Code Review Complete"
     body: "{{review}}"
     ```

6. **Connect:**
   - Trigger → Code Review → Condition
   - Condition (true) → Slack
   - Condition (false) → Email

7. **Save:** Name: "PR Code Review Automation"

---

## 5️⃣ Lead Qualification Pipeline
**Use Case:** Qualify incoming leads and assign to sales team

### Workflow Structure:
```
[Webhook Trigger]
    → [Research Agent]
    → [Data Transform]
    → [Condition]
    → [Create Task] / [Send Email]
```

### Step-by-Step:
1. **Add Webhook Trigger:**
   - Drag "Webhook" from Triggers
   - Configure: `webhookUrl: "/webhooks/new-lead"`

2. **Add Research Agent:**
   - Drag "Research" from Skills
   - Configure:
     ```
     agentId: "ari"
     prompt: "Research this company and assess lead quality: {{company_name}}"
     ```

3. **Add Data Transform:**
   - Drag "Data Transform" from Logic & Flow
   - Configure:
     ```javascript
     // Extract qualification score
     const score = parseInt(input.match(/Score: (\d+)/)?.[1] || '0');
     return { ...input, qualificationScore: score };
     ```

4. **Add Condition:**
   - Drag "Condition" from Logic & Flow
   - Configure:
     ```javascript
     return input.qualificationScore >= 70; // High-quality lead
     ```

5. **Add Create Task (True):**
   - Drag "Create Task" from Actions
   - Configure:
     ```
     title: "Follow up with qualified lead: {{company_name}}"
     assignee: "sales_team"
     priority: "high"
     ```

6. **Add Send Email (False):**
   - Drag "Send Email" from Actions
   - Configure:
     ```
     to: "marketing@company.com"
     subject: "Lead needs nurturing"
     body: "Low qualification score: {{qualificationScore}}"
     ```

7. **Connect:**
   - Trigger → Research → Transform → Condition
   - Condition (true) → Create Task
   - Condition (false) → Send Email

8. **Save:** Name: "Lead Qualification Pipeline"

---

## 6️⃣ Email Campaign Manager
**Use Case:** Generate personalized emails for different customer segments

### Workflow Structure:
```
[Manual Trigger]
    → [Loop]
    → [Content Generation]
    → [Data Transform]
    → [Send Email]
    → [Delay]
```

### Step-by-Step:
1. **Add Manual Trigger:**
   - Drag "Manual" from Triggers
   - Configure: `triggerName: "Start Email Campaign"`

2. **Add Loop:**
   - Drag "Loop" from Logic & Flow
   - Configure:
     ```
     items: "{{customer_list}}"
     itemName: "customer"
     ```

3. **Add Content Generation:**
   - Drag "Content Generation" from Skills
   - Configure:
     ```
     agentId: "emmie"
     prompt: "Write a personalized email for {{customer.name}} about {{campaign_topic}}"
     ```

4. **Add Data Transform:**
   - Drag "Data Transform"
   - Configure:
     ```javascript
     return {
       to: input.customer.email,
       subject: `Special offer for ${input.customer.name}`,
       body: input.generated_email
     };
     ```

5. **Add Send Email:**
   - Drag "Send Email" from Actions
   - Configure:
     ```
     to: "{{email_data.to}}"
     subject: "{{email_data.subject}}"
     body: "{{email_data.body}}"
     ```

6. **Add Delay:**
   - Drag "Delay" from Logic & Flow
   - Configure: `duration: 5000` (5 seconds between emails)

7. **Connect:** Trigger → Loop → Content Gen → Transform → Email → Delay

8. **Save:** Name: "Personalized Email Campaign"

---

## 🎯 Quick Start Guide

### Which Workflow Should You Build First?

**For Customer Support Teams:**
→ Start with **#1 Customer Support Automation**

**For Marketing Teams:**
→ Start with **#2 Content Generation** or **#6 Email Campaign**

**For Sales Teams:**
→ Start with **#5 Lead Qualification Pipeline**

**For Engineering Teams:**
→ Start with **#4 Code Review Assistant**

**For Analytics Teams:**
→ Start with **#3 Data Analysis & Reporting**

---

## 📝 Testing Your Workflow

### After Building:
1. **Save** the workflow (give it a descriptive name)
2. **Click "Test Run"** button
3. **Enter test input** in the preview panel
4. **Watch execution** in real-time
5. **Check logs** for any errors
6. **Iterate** and improve

### Example Test Input:
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "inquiry": "How do I reset my password?"
}
```

---

## 🔧 Common Configuration Patterns

### Variable References:
- Use `{{variable_name}}` to reference previous node outputs
- Example: `{{llm_response}}`, `{{customer_email}}`

### Condition Logic:
```javascript
// Simple comparison
return input.score > 70;

// String check
return input.toLowerCase().includes('urgent');

// Complex logic
return input.revenue > 10000 && input.employees < 50;
```

### Data Transform:
```javascript
// Extract fields
return {
  name: input.split('\n')[0],
  email: input.match(/[\w.-]+@[\w.-]+/)?.[0]
};

// Format data
return {
  formatted_date: new Date().toISOString(),
  total: items.reduce((sum, item) => sum + item.price, 0)
};
```

---

## 🚀 Advanced Patterns

### Multi-Agent Collaboration:
```
[Trigger]
    → [Research Agent]
    → [Content Generation Agent]
    → [Code Review Agent]
    → [Output]
```

### Conditional Branching:
```
[Trigger]
    → [Analysis]
    → [Condition]
        ├─ True → [High Priority Path]
        └─ False → [Standard Path]
```

### Loop with Processing:
```
[Trigger]
    → [Loop]
        └─ [Process Item]
           → [Send Notification]
           → [Delay]
```

---

## 💡 Tips for Success

1. **Start Simple:** Begin with 3-4 nodes, test, then expand
2. **Use Descriptive Names:** Name nodes clearly (e.g., "Analyze Customer Sentiment")
3. **Test Incrementally:** Test after adding each node
4. **Check Logs:** Use Preview Panel to debug
5. **Save Often:** Save after major changes
6. **Use Variables:** Reference previous outputs with `{{variable}}`

---

## 📚 Next Steps

1. **Choose a template** that fits your use case
2. **Build it step-by-step** in the Agent Studio
3. **Test with real data** using the Preview Panel
4. **Deploy to production** once validated
5. **Monitor performance** via execution logs

---

**Ready to build?** Open http://localhost:3001/agents/studio and start with Template #1!
