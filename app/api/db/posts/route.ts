import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
    const sql = neon(process.env.DATABASE_URL!);
    try {
        const posts = await sql`SELECT * FROM linkedin_posts ORDER BY created_at DESC LIMIT 10`;
        return NextResponse.json(posts);
    } catch (error) {
        console.error("DB error:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const DATABASE_URL = process.env.DATABASE_URL?.trim();
    if (!DATABASE_URL) {
        console.error("DATABASE_URL is missing!");
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { topic, prompt, content, image_url } = body;

        console.log("DB: Attempting to save post:", { topic, prompt: prompt?.substring(0, 20) });

        const sql = neon(DATABASE_URL);
        const result = await sql`
            INSERT INTO linkedin_posts (topic, prompt, content, image_url)
            VALUES (${topic || ''}, ${prompt || ''}, ${content || ''}, ${image_url || null})
            RETURNING *
        `;

        console.log("DB: Successfully saved post with ID:", result[0]?.id);
        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("DB Save Error:", error.message || error);
        return NextResponse.json({
            error: "Failed to save post",
            details: error.message
        }, { status: 500 });
    }
}
