import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    try {
        const { topic, prompt, context, config } = await req.json();

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Config Defaults
        const tone = config?.tone || "professional";
        const format = config?.format || "text";
        const emojiDensity = config?.emojiDensity || "2"; // 0=None, 1=Min, 2=Balanced, 3=Heavy

        // Map Emoji Density
        const emojiMap: Record<string, string> = {
            "0": "Do strictly NOT use any emojis.",
            "1": "Use very few emojis (max 1-2).",
            "2": "Use a balanced amount of emojis to break up text.",
            "3": "Use emojis heavily / frequently for visual impact."
        };

        const fullPrompt = `Task: Generate a high-impact LinkedIn post.
Topic: ${topic || "latest trends"}
User Prompt: ${prompt || "professional update"}

${context ? `LinkedIn Live Context: ${context} (Bridge this with the user prompt if relevant)` : ''}

Configuration:
- Tone: ${tone}
- Format: ${format}
- Emojis: ${emojiMap[emojiDensity]}

Guidelines:
- Start with a strong hook relevant to the ${tone} tone.
- ${format === 'bullet' ? 'Use distinct bullet points for the main content.' : 'Use short, punchy paragraphs.'}
- ${format === 'carousel' ? 'Format the output as clear "Slide 1:", "Slide 2:" sections.' : ''}
- Include 3-5 relevant hashtags.
- Keep it under 1300 characters.

Format: Plain text only.`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ post: text });
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);

        let errorMessage = "Failed to generate post.";
        if (error.status === 429 || error.message?.includes("429")) {
            errorMessage = "Rate limit exceeded. Please wait a minute and try again.";
        }

        return NextResponse.json({
            error: errorMessage,
            details: error.message || String(error)
        }, { status: 500 });
    }
}
