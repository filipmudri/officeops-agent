import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function planner(task: string) {
  const prompt = `
Zadaj úlohu: "${task}".
Rozlož ju do krokov vhodných pre autonómneho agenta.
Vráť výsledok vo formáte JSON:
{
  "steps": [
    { "id": 1, "action": "read_excel", "args": ["uploaded_file"] },
    { "id": 2, "action": "analyze_data", "args": [] },
    { "id": 3, "action": "generate_charts", "args": [] },
    { "id": 4, "action": "write_summary", "args": [] },
    { "id": 5, "action": "generate_email", "args": [] }
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let text = response.choices[0].message.content;

    // Odstrániť backticky a 'json' prefix
    text = text.replace(/```json|```/gi, "").trim();

    try {
      return JSON.parse(text);
    } catch {
      return {
        steps: [
          {
            id: 1,
            action: "error",
            args: [],
            message: text,
          },
        ],
      };
    }
  } catch (e: any) {
    return {
      steps: [
        { id: 1, action: "error", args: [], message: e.message || "Unknown error" },
      ],
    };
  }
}