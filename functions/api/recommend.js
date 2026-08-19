// POST /api/recommend  { "kind": ..., "weather": ..., "genre": ... }
//
// Proxies Groq so GROQ_API_KEY stays on the server. The prompts live here rather
// than in the pages, so the browser sends a request kind plus the weather or
// genre it applies to — never a key, never a raw prompt.
//
// List kinds ask the model for JSON and hand back an `items` array. Returning a
// blob of text meant the pages had to guess where one song ended and the next
// began, and a newline-separated list dropped into <ol> renders as one run-on
// line, since HTML collapses the newlines.

// Groq decommissioned the llama-3.x models these pages were written against.
// Every chat model it still serves is a reasoning model: it spends tokens
// thinking before it answers, and those tokens come out of the same completion
// budget. Low reasoning effort plus a budget sized per kind leaves room for
// both. Groq also counts the requested budget against the per-minute token
// limit, and the forecast page makes fifteen calls in a row, so asking for only
// what each answer needs is what keeps that page off the rate limiter.
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const clean = (s) => String(s ?? "").trim().slice(0, 300);
const str = (v) => (typeof v === "string" ? v.trim() : "");

// Models sometimes answer with "Artist - Title" in the title field even when
// asked not to, which renders the artist twice on the row. Strip the artist
// prefix when it is clearly repeated, and drop wrapping quotes.
function cleanTitle(title, artist) {
  let t = title.replace(/^["'“‘]+|["'”’]+$/g, "").trim();
  if (artist) {
    const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefix = new RegExp(`^${escaped}\\s*[-–—:|]\\s*`, "i");
    const stripped = t.replace(prefix, "").trim();
    if (stripped) t = stripped;
  }
  return t;
}

const NO_INVENTING = "Never invent a song, album, or artist that does not exist; only name real, released music.";
const TITLE_ONLY = "The title field must hold only the song's own title — no artist name, no dash, no quotation marks.";

const KINDS = {
  genre: {
    budget: 1024,
    prompt: ({ weather }) =>
      `Generate a detailed genre of music you believe best fits with this weather. Don't make any assumptions or references to the location in which you are picking music for. Merely state the Music Genre you'd recommend by inserting the genre name. (do not use '*' and do not provide explanations for the genre selected). For musical diversity, generate very specific and detailed genres. ${clean(weather)}`,
    shape: (text) => ({ text }),
  },

  tracks: {
    budget: 1024,
    json: true,
    prompt: ({ genre }) =>
      `Generate 5 songs that best align with the genre: ${clean(genre)}, ranked best first. ${NO_INVENTING} ${TITLE_ONLY} Return strict JSON only, no markdown. Schema: {"tracks":[{"title":string,"artist":string}]}`,
    shape: (parsed) => ({
      items: (parsed?.tracks ?? [])
        .map((t) => {
          const artist = str(t?.artist);
          return { title: cleanTitle(str(t?.title), artist), artist };
        })
        .filter((t) => t.title),
    }),
  },

  artists: {
    budget: 1024,
    json: true,
    prompt: ({ genre }) =>
      `Generate 5 musical artists that best align with the genre: ${clean(genre)}, ranked best first. Do not repeat artists already suggested for this genre's tracks where you can avoid it. ${NO_INVENTING} Return strict JSON only, no markdown. Schema: {"artists":[{"name":string}]}`,
    shape: (parsed) => ({
      items: (parsed?.artists ?? [])
        .map((a) => ({ name: str(a?.name) }))
        .filter((a) => a.name),
    }),
  },

  // The 5-day forecast asks per day, so each call wants one short answer.
  forecast_genre: {
    budget: 512,
    prompt: ({ weather }) =>
      `Generate a detailed genre of music that best fits this weather. Make sure to only state the Music Genre in your response, nothing else. ${clean(weather)}`,
    shape: (text) => ({ text }),
  },

  forecast_track: {
    budget: 512,
    json: true,
    prompt: ({ genre }) =>
      `Generate 1 song that best aligns with the genre: ${clean(genre)}. ${NO_INVENTING} ${TITLE_ONLY} Return strict JSON only, no markdown. Schema: {"title":string,"artist":string}`,
    shape: (parsed) => {
      const artist = str(parsed?.artist);
      return { item: { title: cleanTitle(str(parsed?.title), artist), artist } };
    },
  },

  forecast_artist: {
    budget: 512,
    prompt: ({ genre }) =>
      `Generate 1 musical artist that closely aligns with the genre: ${clean(genre)}. Merely state the artist's name. ${NO_INVENTING}`,
    shape: (text) => ({ text }),
  },
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const spec = KINDS[body?.kind];
  if (!spec) {
    return json({ error: `kind must be one of: ${Object.keys(KINDS).join(", ")}` }, 400);
  }

  if (!env.GROQ_API_KEY) {
    console.error("[recommend] GROQ_API_KEY is not set");
    return json({ error: "Recommendation service is not configured" }, 500);
  }

  const payload = {
    model: GROQ_MODEL,
    messages: [{ role: "user", content: spec.prompt(body) }],
    max_completion_tokens: spec.budget,
    reasoning_effort: "low",
    temperature: 1,
    top_p: 1,
    stream: false,
  };
  if (spec.json) payload.response_format = { type: "json_object" };

  const callGroq = () =>
    fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

  let res;
  try {
    res = await callGroq();

    // The forecast page's fifteen back-to-back calls can trip the per-minute
    // token limit. Groq says how long to wait, so wait and try once more rather
    // than failing the day outright.
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
    console.error(`[recommend:${body.kind}] truncated at ${spec.budget} tokens`);
    return json({ error: "The recommendation was cut off. Please try again." }, 502);
  }

  const content = choice?.message?.content?.trim();
  if (!content) {
    console.error(`[recommend:${body.kind}] empty content from Groq`);
    return json({ error: "No recommendation came back. Please try again." }, 502);
  }

  if (!spec.json) return json(spec.shape(content));

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error(`[recommend:${body.kind}] content was not valid JSON:`, err, content.slice(0, 300));
    return json({ error: "The recommendation service returned an unreadable response" }, 502);
  }

  const shaped = spec.shape(parsed);
  if (shaped.items && shaped.items.length === 0) {
    console.error(`[recommend:${body.kind}] no usable items in:`, content.slice(0, 300));
    return json({ error: "No recommendation came back. Please try again." }, 502);
  }

  return json(shaped);
}
