import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { description } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  const prompt = `
以下の内容から、家計簿のカテゴリを1つだけ選んで回答してください。
回答はカテゴリ名のみとし、余計な説明は不要です。
カテゴリ候補：食費、日用品、交通費、交際費、娯楽、衣服、美容、健康、固定費、その他

内容：${description}
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "あなたは優秀な家計簿アシスタントです。" },
          { role: "user", content: prompt },
        ],
        temperature: 0,
      }),
    });

    const data = await response.json();
    const category = data.choices[0].message.content.trim();
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ category: "その他" }, { status: 500 });
  }
}