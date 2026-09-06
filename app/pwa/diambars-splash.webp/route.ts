export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const upstream = await fetch(`${origin}/pwa/diambars-splash`, { cache: 'no-store' });
  if (!upstream.ok) return new Response(null, { status: upstream.status });
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
