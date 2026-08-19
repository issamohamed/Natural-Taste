// GET /api/weather?kind=<kind>&...
//
// Proxies AccuWeather so ACCUWEATHER_API_KEY stays on the server. The browser
// sends a request kind plus a city name or location key — never a key.
//
//   kind=search      &q=<city name>     city lookup for the search page
//   kind=current     &key=<locationKey> current conditions
//   kind=forecast    &key=<locationKey> 5-day daily forecast
//   kind=historical  &key=<locationKey> the past 24 hours

const BASE = "https://dataservice.accuweather.com";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const KINDS = ["search", "current", "forecast", "historical"];

function buildUrl(kind, params, apiKey) {
  const key = encodeURIComponent(apiKey);

  if (!KINDS.includes(kind)) {
    return { error: `kind must be one of: ${KINDS.join(", ")}` };
  }

  if (kind === "search") {
    const q = (params.get("q") ?? "").trim();
    if (!q) return { error: "q is required" };
    if (q.length > 100) return { error: "q is too long" };
    return { url: `${BASE}/locations/v1/cities/search?apikey=${key}&q=${encodeURIComponent(q)}` };
  }

  const locationKey = (params.get("key") ?? "").trim();
  if (!locationKey) return { error: "key is required" };
  // AccuWeather location keys are plain digits; refuse anything else rather than
  // interpolating arbitrary input into the upstream path.
  if (!/^\d{1,12}$/.test(locationKey)) return { error: "key is not a valid location key" };

  switch (kind) {
    case "current":
      return { url: `${BASE}/currentconditions/v1/${locationKey}?apikey=${key}` };
    case "forecast":
      return { url: `${BASE}/forecasts/v1/daily/5day/${locationKey}?apikey=${key}&metric=true` };
    case "historical":
      return { url: `${BASE}/currentconditions/v1/${locationKey}/historical/24?apikey=${key}` };
    default:
      return { error: `kind must be one of: ${KINDS.join(", ")}` };
  }
}

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  if (!env.ACCUWEATHER_API_KEY) {
    console.error("[weather] ACCUWEATHER_API_KEY is not set");
    return json({ error: "Weather service is not configured" }, 500);
  }

  const built = buildUrl(kind, searchParams, env.ACCUWEATHER_API_KEY);
  if (built.error) return json({ error: built.error }, 400);

  let res;
  try {
    res = await fetch(built.url);
  } catch (err) {
    console.error(`[weather:${kind}] fetch threw:`, err);
    return json({ error: "Could not reach the weather service" }, 502);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    console.error(`[weather:${kind}] non-200 from AccuWeather:`, res.status, body);
    if (res.status === 401 || res.status === 403) {
      return json({ error: "The weather service rejected the API key" }, 502);
    }
    if (res.status === 503) {
      return json({ error: "The weather service is over its request limit" }, 502);
    }
    return json({ error: "The weather service returned an error" }, 502);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error(`[weather:${kind}] unreadable response:`, err);
    return json({ error: "The weather service returned an unreadable response" }, 502);
  }

  return json(data);
}
