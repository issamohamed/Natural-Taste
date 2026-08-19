// GET /api/weather?kind=<kind>&...
//
// Proxies WeatherAPI.com so WEATHERAPI_KEY stays on the server. The browser
// sends a request kind plus a city name or a location id — never a key.
//
//   kind=search      &q=<city name>   city lookup for the search page
//   kind=current     &key=<id>        current conditions
//   kind=forecast    &key=<id>        5-day daily forecast
//   kind=historical  &key=<id>        yesterday's conditions
//
// Responses are normalised into a small shape of our own rather than passed
// through raw, so the pages don't depend on any one provider's JSON. Swapping
// providers again should mean editing this file and nothing else.

const BASE = "https://api.weatherapi.com/v1";
const KINDS = ["search", "current", "forecast", "historical"];
const FORECAST_DAYS = 5;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function yesterdayISO() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// WeatherAPI accepts a city name, "lat,lon", or "id:<id>". The pages hand back
// an id from the search results, so anything with an id goes through that form.
function buildRequest(kind, params) {
  if (!KINDS.includes(kind)) {
    return { error: `kind must be one of: ${KINDS.join(", ")}` };
  }

  if (kind === "search") {
    const q = (params.get("q") ?? "").trim();
    if (!q) return { error: "q is required" };
    if (q.length > 100) return { error: "q is too long" };
    return { path: "search.json", query: { q } };
  }

  const id = (params.get("key") ?? "").trim();
  if (!id) return { error: "key is required" };
  if (!/^\d{1,12}$/.test(id)) return { error: "key is not a valid location id" };

  const q = `id:${id}`;
  switch (kind) {
    case "current":
      return { path: "current.json", query: { q } };
    case "forecast":
      return { path: "forecast.json", query: { q, days: String(FORECAST_DAYS) } };
    case "historical":
      return { path: "history.json", query: { q, dt: yesterdayISO() } };
    default:
      return { error: `kind must be one of: ${KINDS.join(", ")}` };
  }
}

function place(location) {
  return {
    city: location?.name ?? "Unknown",
    region: location?.region ?? "",
    country: location?.country ?? "",
  };
}

function normalise(kind, data) {
  switch (kind) {
    case "search":
      return (Array.isArray(data) ? data : []).map((c) => ({
        id: c.id,
        name: c.name,
        region: c.region,
        country: c.country,
        label: [c.name, c.region, c.country].filter(Boolean).join(", "),
      }));

    case "current":
      return {
        ...place(data?.location),
        temperatureC: data?.current?.temp_c ?? null,
        weatherText: data?.current?.condition?.text ?? "Unknown",
      };

    case "forecast":
      return {
        ...place(data?.location),
        days: (data?.forecast?.forecastday ?? []).map((d) => ({
          date: d.date,
          minC: d.day?.mintemp_c ?? null,
          maxC: d.day?.maxtemp_c ?? null,
          weatherText: d.day?.condition?.text ?? "Unknown",
        })),
      };

    case "historical": {
      const day = data?.forecast?.forecastday?.[0];
      return {
        ...place(data?.location),
        date: day?.date ?? null,
        temperatureC: day?.day?.avgtemp_c ?? null,
        weatherText: day?.day?.condition?.text ?? "Unknown",
      };
    }

    default:
      return data;
  }
}

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  if (!env.WEATHERAPI_KEY) {
    console.error("[weather] WEATHERAPI_KEY is not set");
    return json({ error: "Weather service is not configured" }, 500);
  }

  const built = buildRequest(kind, searchParams);
  if (built.error) return json({ error: built.error }, 400);

  const url = new URL(`${BASE}/${built.path}`);
  url.searchParams.set("key", env.WEATHERAPI_KEY);
  for (const [k, v] of Object.entries(built.query)) url.searchParams.set(k, v);

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error(`[weather:${kind}] fetch threw:`, err);
    return json({ error: "Could not reach the weather service" }, 502);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error(`[weather:${kind}] unreadable response:`, res.status, err);
    return json({ error: "The weather service returned an unreadable response" }, 502);
  }

  if (!res.ok) {
    // WeatherAPI reports failures as { error: { code, message } }.
    const code = data?.error?.code;
    console.error(`[weather:${kind}] non-200:`, res.status, JSON.stringify(data?.error ?? data));

    if (code === 1006) return json({ error: "No matching location found" }, 404);
    if (code === 2006 || code === 2008 || code === 2009 || res.status === 401 || res.status === 403) {
      return json({ error: "The weather service rejected the API key" }, 502);
    }
    if (code === 2007) return json({ error: "The weather service is over its request limit" }, 502);
    return json({ error: "The weather service returned an error" }, 502);
  }

  return json(normalise(kind, data));
}
