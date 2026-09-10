import { site } from '../../countries/site.mjs';
import base from '../../countries/manifest-base.json';
export function GET() {
  return new Response(JSON.stringify({...base,name:site.siteName,description:`Discover and listen to radio stations from ${site.countryName}.`}),{headers:{'Content-Type':'application/manifest+json'}});
}
