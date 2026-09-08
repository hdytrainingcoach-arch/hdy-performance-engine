import { hdyIcon } from '@/lib/hdyIcon';
export const runtime = 'edge';
export async function GET() { return hdyIcon(512); }
