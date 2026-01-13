import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
    const { post } = await req.json();

    // For visual consistency, we'll try to generate a specific image.
    // Note: Freepik API for image gen might require specific headers or endpoint.
    // This is a placeholder for the Freepik integration.

    if (!FREEPIK_API_KEY) {
        console.warn("FREEPIK_API_KEY is missing.");
        return NextResponse.json({ error: "Image API key not configured" }, { status: 500 });
    }

    try {
        const response = await fetch("https://api.freepik.com/v1/ai/text-to-image", {
            method: "POST",
            headers: {
                "x-freepik-api-key": FREEPIK_API_KEY,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: `High-quality LinkedIn post visual: ${post.substring(0, 150)}`,
                styling: "digital_art",
                size: "1024x1024"
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Freepik API Error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error("No image URL returned from Freepik");
        }

        return NextResponse.json({ imageUrl });
    } catch (error: any) {
        console.error("Freepik API error:", error);
        return NextResponse.json({
            error: "Image generation failed",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
