export const runtime = 'nodejs';
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const upstream = await fetch(`${origin}/pwa/icon-192`, { cache: 'no-store' });
  if (!upstream.ok) return new Response(null, { status: upstream.status });
  return new Response(await upstream.arrayBuffer(), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
