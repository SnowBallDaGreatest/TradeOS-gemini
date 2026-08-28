import { NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const PILLARS = [
  { n: 1, title: "Tariffs & Trade Defence", core: false },
  { n: 2, title: "Public Procurement", core: false },
  { n: 3, title: "Foreign Direct Investment", core: false },
  { n: 4, title: "IP Rights", core: false },
  { n: 5, title: "Telecom Infrastructure", core: false },
  { n: 6, title: "Cross-Border Data", core: true },
  { n: 7, title: "Domestic Data Policies", core: true },
  { n: 8, title: "Intermediary Liability", core: false },
  { n: 9, title: "Online Content Access", core: false },
  { n: 10, title: "Non-Tariff Measures", core: false },
  { n: 11, title: "Technical Standards", core: false },
  { n: 12, title: "Online Sales & Transactions", core: false },
];

const PILLAR_TAXONOMY = PILLARS.map((p) => `${p.n} ${p.title}`).join("\n");

const MAX_CONTRACT_CHARS = 18000;

const SYSTEM_PROMPT = `You are the risk-scoring engine inside TradeOS, a digital-trade compliance platform. You will be given the extracted text of a contract, along with the company's home and target jurisdictions. Assess the contract against EXACTLY these 12 pillars of digital trade regulation, in this order:
${PILLAR_TAXONOMY}

You MUST return all 12 pillars every time, even if the contract says nothing relevant to a pillar — in that case mark it "low" risk with a finding like "Contract does not address this pillar; no clause creates exposure."

Reply with ONLY raw JSON, no markdown fences, no preamble, in this exact shape:
{"pillars": [{"n": <pillar number 1-12>, "risk": "high"|"medium"|"low", "excerpt": "<verbatim clause from the contract that's most relevant, max 25 words; empty string if the pillar isn't addressed>", "finding": "<max 15 words, specific to this contract>", "fix": "<max 12 words, concrete redline or next action>"}]}

The "pillars" array must contain exactly 12 objects. Base findings on real regulatory patterns (e.g. GDPR adequacy, India DPDP Act, ASEAN data frameworks, FDI sectoral caps, telecom licensing) relevant to the stated home and target jurisdictions. Be specific to clauses actually present in the contract, not generic. Vary risk levels realistically — do not mark everything high, and do not mark everything low just because it's easier.`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY. Set it in your environment." },
      { status: 500 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("contract");
  const home = formData.get("home");
  const targets = formData.get("targets");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No contract file uploaded." }, { status: 400 });
  }
  if (!home || !targets) {
    return NextResponse.json(
      { error: "home and targets are both required alongside the file." },
      { status: 400 }
    );
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF contracts are supported." }, { status: 400 });
  }

  let extractedText;
  let pageCount = 0;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text.trim();
    pageCount = parsed.numpages || 0;
  } catch {
    return NextResponse.json(
      { error: "Could not read that PDF. It may be scanned/image-based or corrupted." },
      { status: 422 }
    );
  }

  if (!extractedText) {
    return NextResponse.json(
      { error: "No extractable text found. If this is a scanned contract, OCR it first." },
      { status: 422 }
    );
  }

  const truncated = extractedText.length > MAX_CONTRACT_CHARS;
  const contractText = truncated ? extractedText.slice(0, MAX_CONTRACT_CHARS) : extractedText;

  const userMessage = `Home jurisdiction: ${home}
Target jurisdictions: ${targets}
Contract page count: ${pageCount}
${truncated ? "NOTE: contract text was truncated for length; only the first portion is shown below.\n" : ""}
Contract text:
"""
${contractText}
"""`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.1-pro";
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: 502 });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const clean = text.replace(/^```json\s*|^```\s*|```$/g, "").trim();

    let parsedBody;
    try {
      parsedBody = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Model returned an unparseable response. Try again." },
        { status: 502 }
      );
    }

    const parsed = parsedBody?.pillars;
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: "Model response was not a pillar array." }, { status: 502 });
    }

    const byN = {};
    parsed.forEach((p) => (byN[p.n] = p));
    const pillars = PILLARS.map((p) => ({
      n: p.n,
      title: p.title,
      core: p.core,
      risk: ["high", "medium", "low"].includes(byN[p.n]?.risk) ? byN[p.n].risk : "medium",
      excerpt: byN[p.n]?.excerpt || "",
      finding: byN[p.n]?.finding || "No finding returned for this pillar.",
      fix: byN[p.n]?.fix || "Review manually.",
    }));

    return NextResponse.json({
      pillars,
      meta: { pageCount, truncated, charsAnalyzed: contractText.length },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to reach the reasoning engine. Try again." }, { status: 502 });
  }
}
