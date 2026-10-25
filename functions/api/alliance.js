const UPSTREAM_URL = "https://lastasylum.gg/api/alliance/67172519";

export async function onRequestGet() {
  try {
    const upstream = await fetch(UPSTREAM_URL, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (!upstream.ok) {
      return Response.json({ error: "upstream_unavailable" }, { status: 502 });
    }

    const data = await upstream.json();
    if (!Array.isArray(data.roster) || !data.id || !data.asOf) {
      return Response.json({ error: "unexpected_upstream_payload" }, { status: 502 });
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return Response.json({ error: "upstream_fetch_failed" }, { status: 502 });
  }
}
