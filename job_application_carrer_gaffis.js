import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Job Applications MCP",
  version: "1.0.0",
});

const API_URL = "https://careers.gaffis.com/public/api/jobApplicationList";

/**
 * Fetch Applications
 */
async function getApplications() {
  const res = await fetch(API_URL);
  return await res.json();
}

/**
 * Filter & Answer
 */
function answerQuestion(apps, question) {
  const q = question.toLowerCase();
  let filtered = apps;

  const today = new Date().toISOString().split("T")[0];

  // 👉 Today applications
  if (q.includes("today")) {
    filtered = apps.filter(a =>
      a.created_at.startsWith(today)
    );
  }

  // 👉 Name search
  if (q.includes("name")) {
    const name = q.replace("name", "").trim();
    filtered = apps.filter(a =>
      a.full_name.toLowerCase().includes(name)
    );
  }

  // 👉 Job title search
  if (q.includes("php") || q.includes("developer") || q.includes("marketing")) {
    filtered = apps.filter(a =>
      a.job_title.toLowerCase().includes(q)
    );
  }

  // 👉 Count
  if (q.includes("how many") || q.includes("count")) {
    return `📊 Total applications found: ${filtered.length}`;
  }

  // 👉 Latest
  if (q.includes("latest")) {
    filtered = apps.slice(0, 5);
  }

  if (filtered.length === 0) {
    return "❌ No job applications found.";
  }

  return filtered
    .map(a => `
👤 Name: ${a.full_name}
📧 Email: ${a.email}
📞 Phone: ${a.phone}
🧑 Gender: ${a.gender ?? "N/A"}
💼 Job: ${a.job_title}
📅 Date: ${a.created_at.split("T")[0]}
📄 Resume: ${a.resume_url}
`)
    .join("\n------------------------\n");
}

/**
 * MCP Tool
 */
server.tool(
  "askJobApplications",
  {
    question: z.string(),
  },
  async ({ question }) => {
    const apps = await getApplications();

    return {
      content: [
        {
          type: "text",
          text: answerQuestion(apps, question),
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
