// POST /api/recommend  { "kind": ..., "weather": ..., "genre": ... }
//
// Proxies Groq so GROQ_API_KEY stays on the server. The prompts live here rather
// than in the pages, so the browser sends a request kind plus the weather or
// genre it applies to — never a key, never a raw prompt.

// Groq decommissioned the llama-3.x models these pages were written against.
// Every chat model it still serves is a reasoning model: it spends tokens
// thinking before it answers, and those tokens come out of the same completion
// budget. Low reasoning effort plus a generous budget leaves room for both, so
// answers are not truncated mid-sentence.
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Groq counts the *requested* budget against the tokens-per-minute limit, not
// just what the answer uses. The forecast page makes fifteen calls in a row
// (five days x genre/track/artist), so an oversized budget on each one burns
// through the quota and starts returning 429s. Each kind gets what its answer
// actually needs, plus room for the reasoning pass.
const TOKEN_BUDGETS = {
  genre: 1024,
  tracks: 1024,
  artists: 1024,
  forecast_genre: 512,
  forecast_track: 512,
  forecast_artist: 512,
};
const DEFAULT_BUDGET = 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const clean = (s) => String(s ?? "").trim().slice(0, 300);

const PROMPTS = {
  // Current conditions and yesterday's conditions: a detailed genre, then five
  // songs and five artists.
  genre: ({ weather }) =>
    `Generate a detailed genre of music you believe best fits with this weather. Don't make any assumptions or references to the location in which you are picking music for. Merely state the Music Genre you'd recommend by inserting the genre name. (do not use '*' and do not provide explanations for the genre selected). For musical diversity, generate very specific and detailed genres. ${clean(weather)}`,

  tracks: ({ genre }) =>
    `Generate 5 songs that best align with the genre: ${clean(genre)}. Merely state the songs you'd recommend in this format: A ranked top to bottom list of songs (don't write anything else aside the list) (do not use '*' and do not provide explanations for the songs selected). Once the song title is displayed in "" say "by (artist's name insert). Never ever make up a song that doesn't exist.`,

  artists: ({ genre }) =>
    `Generate a number list of 5 musical artists that best align with this genre: ${clean(genre)}. Merely state the artists you'd recommend in this format: A ranked top to bottom list of artists (don't write anything else aside the list) (do not use '*' and do not provide explanations for the artists selected. For diversity purposes do not list any artists listed in the tracks generated). Never ever list a musical artist who doesn't exist.`,

  // The 5-day forecast asks per day, so it wants one short answer each time.
  forecast_genre: ({ weather }) =>
    `Generate a detailed genre of music that best fits this weather. Make sure to only state the Music Genre in your response, nothing else. ${clean(weather)}`,

  forecast_track: ({ genre }) =>
    `Generate 1 song that best aligns with the genre: ${clean(genre)}. Merely state the song's title. There can be nothing else written but the song's title and then state "by" and insert the artist's name. Never ever make up a song that doesn't exist`,

  forecast_artist: ({ genre }) =>
    `Generate 1 musical artist that closely aligns with the genre: ${clean(genre)}. Merely state the artist's name. Never ever make up a musical artist who doesn't exist`,
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const build = PROMPTS[body?.kind];
  if (!build) {
    return json({ error: `kind must be one of: ${Object.keys(PROMPTS).join(", ")}` }, 400);
  }

  if (!env.GROQ_API_KEY) {
    console.error("[recommend] GROQ_API_KEY is not set");
    return json({ error: "Recommendation service is not configured" }, 500);
  }

  const maxCompletionTokens = TOKEN_BUDGETS[body.kind] ?? DEFAULT_BUDGET;

  const callGroq = () =>
    fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: build(body) }],
        max_completion_tokens: maxCompletionTokens,
        reasoning_effort: "low",
        temperature: 1,
        top_p: 1,
        stream: false,
      }),
    });

  let res;
  try {
    res = await callGroq();

    // The forecast page's fifteen back-to-back calls can trip the per-minute
    // token limit. Groq says how long to wait, so wait that long and try once
    // more rather than failing the day outright.
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 6000, 10000);
      console.warn(`[recommend:${body.kind}] rate limited, retrying in ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      res = await callGroq();
    }
  } catch (err) {
    console.error(`[recommend:${body.kind}] fetch threw:`, err);
    return json({ error: "Could not reach the recommendation service" }, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "<unreadable>");
    console.error(`[recommend:${body.kind}] non-200 from Groq:`, res.status, detail);
    if (res.status === 429) {
      return json({ error: "Too many requests right now. Please try again in a moment." }, 429);
    }
    return json({ error: "The recommendation service returned an error" }, 502);
  }

  let choice;
  try {
    const envelope = await res.json();
    choice = envelope?.choices?.[0];
  } catch (err) {
    console.error(`[recommend:${body.kind}] malformed response envelope:`, err);
    return json({ error: "The recommendation service returned an unreadable response" }, 502);
  }

  if (choice?.finish_reason === "length") {
    console.error(`[recommend:${body.kind}] truncated at ${maxCompletionTokens} tokens`);
    return json({ error: "The recommendation was cut off. Please try again." }, 502);
  }

  const text = choice?.message?.content?.trim();
  if (!text) {
    console.error(`[recommend:${body.kind}] empty content from Groq`);
    return json({ error: "No recommendation came back. Please try again." }, 502);
  }

  return json({ text });
}
