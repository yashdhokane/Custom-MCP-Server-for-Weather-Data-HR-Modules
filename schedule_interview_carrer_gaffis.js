import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Interview Schedule MCP",
  version: "1.0.0",
});

const API_URL = "https://careers.gaffis.com/public/api/schedules";

/**
 * Fetch schedules
 */
async function getSchedules() {
  const res = await fetch(API_URL);
  return await res.json();
}   

/**
 * Answer user questions
 */
function answerQuestion(schedules, question) {
  const q = question.toLowerCase();
  let filtered = schedules;

  const today = new Date().toISOString().split("T")[0];

  // 👉 Today interviews
  if (q.includes("today")) {
    filtered = filtered.filter(s =>
      s.schedule_date.startsWith(today)
    );
  }

  // 👉 Name search
  if (q.includes("akhilesh") || q.includes("name")) {
    filtered = filtered.filter(s =>
      s.app_full_name.toLowerCase().includes(
        q.replace("name", "").trim()
      )
    );
  }

  // 👉 Job title
  if (q.includes("marketing") || q.includes("php") || q.includes("developer")) {
    filtered = filtered.filter(s =>
      s.job_title.toLowerCase().includes(q)
    );
  }

  // 👉 Interview type
  if (q.includes("offline")) {
    filtered = filtered.filter(s => s.interview_type === "offline");
  }

  if (q.includes("online")) {
    filtered = filtered.filter(s => s.interview_type === "online");
  }

  // 👉 Count
  if (q.includes("how many") || q.includes("count")) {
    return `📊 Total interviews found: ${filtered.length}`;
  }

  if (filtered.length === 0) {
    return "❌ No interview schedules found.";
  }

  return filtered
    .map(s => `
👤 Candidate: ${s.app_full_name}
📧 Email: ${s.app_email}
📞 Phone: ${s.app_phone}
💼 Job: ${s.job_title}
🗓 Date: ${s.schedule_date.split("T")[0]}
⏰ Time: ${s.schedule_date.split("T")[1].slice(0, 5)}
📍 Type: ${s.interview_type}
👨‍💼 Employee ID: ${s.employee_id}
📌 Status: ${s.status}
`)
    .join("\n------------------------\n");
}

/**
 * MCP Tool
 */
server.tool(
  "askSchedules",
  {
    question: z.string(),
  },
  async ({ question }) => {
    const schedules = await getSchedules();

    return {
      content: [
        {
          type: "text",
          text: answerQuestion(schedules, question),
        },
      ],
    };
  }
);

/**
 * Start MCP
 */
async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

start();
