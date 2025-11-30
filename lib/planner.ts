import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * planner(task)
 * - Posle genericky prompt do OpenAI, aby vratil striktne parsovatelny JSON so zoznamom krokov.
 * - Kazdy krok: { id, action, args }
 */
export async function planner(task: string) {
  const prompt = `
You are an assistant who decomposes a user's high-level request into a linear sequence of actionable steps
for an autonomous agent. The user request is:

"${task}"

Return only valid JSON with the following structure:

{
  "steps": [
    { "id": 1, "action": "some_action_name", "args": ["optional", "args"] },
    ...
  ]
}

Action names should be short snake_case tokens (e.g. "load_excel", "analyze_data", "generate_charts", "send_email").
If a step requires parameters, put them into args array. Only return the JSON object and nothing else.
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.2,
  });

  const text = resp.choices?.[0]?.message?.content ?? "";
  // strip triple backticks if present
  const cleaned = text.replace(/```json|```/gi, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.steps) throw new Error("Planner returned JSON without steps");
    return parsed;
  } catch (e: any) {
    // fallback: return a single error step with raw text
    return {
      steps: [
        { id: 1, action: "error", args: [], message: cleaned || e.message },
      ],
    };
  }
}