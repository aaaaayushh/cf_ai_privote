import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "X-API-Key"],
}));

// Authentication middleware
app.use("/api/*", async (c, next) => {
  const apiKey = c.req.header("X-API-Key");
  const serverApiKey = (c.env as any).API_KEY;
  
  // If API_KEY is configured, require authentication
  if (serverApiKey && (!apiKey || apiKey !== serverApiKey)) {
    return c.json({ error: "Unauthorized: Invalid or missing API key" }, 401);
  }
  
  await next();
});

interface Meeting {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  action_items: string;
  meeting_date: string;
  meeting_time: string;
  created_at: string;
  updated_at: string;
}

interface TranscriptRequest {
  transcript: string;
  title?: string;
  meeting_date?: string;
  meeting_time?: string;
}

interface AIResponse {
  response: string;
}

async function generateSummary(ai: any, transcript: string): Promise<string> {
  const prompt = `You are a professional meeting assistant. Summarize the following meeting transcript in a concise, structured manner. Focus on the main topics discussed and overall context.

Transcript:
${transcript}

Provide a clear and concise summary of the meeting.`;

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "You are a helpful meeting assistant that creates clear, concise summaries." },
      { role: "user", content: prompt }
    ],
    max_tokens: 512,
    temperature: 0.3,
  }) as AIResponse;

  return response.response || "Summary generation failed.";
}

async function extractActionItems(ai: any, transcript: string): Promise<string> {
  const prompt = `Analyze the following meeting transcript and extract all action items, tasks, and commitments mentioned.

Transcript:
${transcript}

List each action item on a new line, prefixed with a bullet point. If no action items are found, respond with "No action items identified."`;

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "You are a helpful meeting assistant that extracts action items accurately." },
      { role: "user", content: prompt }
    ],
    max_tokens: 512,
    temperature: 0.2,
  }) as AIResponse;

  return response.response || "No action items identified.";
}

function generateId(): string {
  return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}


app.post("/api/transcripts", async (c) => {
  try {
    const body = await c.req.json<TranscriptRequest>();

    if (!body.transcript || body.transcript.trim().length === 0) {
      return c.json({ error: "Transcript is required and cannot be empty" }, 400);
    }

    const transcript = body.transcript.trim();
    const title = body.title?.trim() || `Meeting ${new Date().toLocaleDateString()}`;
    const meetingDate = body.meeting_date || new Date().toISOString().split('T')[0];
    const meetingTime = body.meeting_time || new Date().toISOString().split('T')[1].split('.')[0];

    console.log(`Processing transcript: ${title}`);

    const [summary, actionItems] = await Promise.all([
      generateSummary(c.env.AI, transcript),
      extractActionItems(c.env.AI, transcript),
    ]);

    const id = generateId();
    const timestamp = getCurrentTimestamp();

    await c.env.privote_db
      .prepare(
        `INSERT INTO meetings 
        (id, title, transcript, summary, action_items, meeting_date, meeting_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        title,
        transcript,
        summary,
        actionItems,
        meetingDate,
        meetingTime,
        timestamp,
        timestamp
      )
      .run();

    const meeting: Meeting = {
      id,
      title,
      transcript,
      summary,
      action_items: actionItems,
      meeting_date: meetingDate,
      meeting_time: meetingTime,
      created_at: timestamp,
      updated_at: timestamp,
    };

    return c.json({
      success: true,
      message: "Transcript processed successfully",
      meeting
    }, 201);

  } catch (error) {
    console.error("Error processing transcript:", error);
    return c.json({
      error: "Failed to process transcript",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/meetings", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const result = await c.env.privote_db
      .prepare(
        `SELECT id, title, meeting_date, meeting_time, created_at, updated_at 
         FROM meetings 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();

    const countResult = await c.env.privote_db
      .prepare("SELECT COUNT(*) as count FROM meetings")
      .first<{ count: number }>();

    return c.json({
      success: true,
      meetings: result.results,
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (countResult?.count || 0)
      }
    });

  } catch (error) {
    console.error("Error fetching meetings:", error);
    return c.json({
      error: "Failed to fetch meetings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/meetings/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Meeting ID is required" }, 400);
    }

    const meeting = await c.env.privote_db
      .prepare("SELECT * FROM meetings WHERE id = ?")
      .bind(id)
      .first<Meeting>();

    if (!meeting) {
      return c.json({ error: "Meeting not found" }, 404);
    }

    return c.json({
      success: true,
      meeting
    });

  } catch (error) {
    console.error("Error fetching meeting:", error);
    return c.json({
      error: "Failed to fetch meeting",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.delete("/api/meetings/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Meeting ID is required" }, 400);
    }

    const existing = await c.env.privote_db
      .prepare("SELECT id FROM meetings WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: "Meeting not found" }, 404);
    }

    await c.env.privote_db
      .prepare("DELETE FROM meetings WHERE id = ?")
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: "Meeting deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting meeting:", error);
    return c.json({
      error: "Failed to delete meeting",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({
    error: "Internal Server Error",
    details: err.message
  }, 500);
});

export default app;
