import { NextResponse } from 'next/server';

export async function GET() {
    const SERPER_API_KEY = process.env.SERPER_API_KEY;

    if (!SERPER_API_KEY) {
        return NextResponse.json({ error: "Serper API key not configured" }, { status: 500 });
    }

    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: "latest business and tech trends 2026",
                num: 10
            })
        });

        const data = await response.json();
        // Extract titles or snippets as trends
        const trends = data.organic?.map((item: any) => item.title) || ["AI Productivity", "Sustainability in Tech", "Future of Work"];

        return NextResponse.json(trends);
    } catch (error) {
        console.error("Serper API error:", error);
        return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
    }
}
