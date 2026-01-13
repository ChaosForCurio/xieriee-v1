-- SQL for creating the linkedin_posts table in Neon DB

CREATE TABLE IF NOT EXISTS linkedin_posts (
    id SERIAL PRIMARY KEY,
    topic TEXT,
    prompt TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
