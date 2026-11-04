import { site } from '../../countries/site.mjs';
import stations from '../lib/stations';
import { llmsText } from '../lib/llms-text.mjs';

export async function GET() {
  return new Response(llmsText(site, stations), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
