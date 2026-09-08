import { diambarsIcon } from '@/lib/diambarsIcon';
export const runtime = 'edge';
export async function GET() { return diambarsIcon(512); }
