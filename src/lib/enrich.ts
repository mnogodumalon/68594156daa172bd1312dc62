import type { EnrichedFachbuecher, EnrichedFachmagazin, EnrichedLeadairWebSoftware, EnrichedVeranstaltungen } from '@/types/enriched';
import type { Berater, Fachbuecher, Fachmagazin, Kongresszentrum, LeadairWebSoftware, Veranstaltungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface FachbuecherMaps {
  beraterMap: Map<string, Berater>;
}

export function enrichFachbuecher(
  fachbuecher: Fachbuecher[],
  maps: FachbuecherMaps
): EnrichedFachbuecher[] {
  return fachbuecher.map(r => ({
    ...r,
    fachbuch_autorenName: resolveDisplay(r.fields.fachbuch_autoren, maps.beraterMap, 'berater_nachname'),
  }));
}

interface FachmagazinMaps {
  beraterMap: Map<string, Berater>;
}

export function enrichFachmagazin(
  fachmagazin: Fachmagazin[],
  maps: FachmagazinMaps
): EnrichedFachmagazin[] {
  return fachmagazin.map(r => ({
    ...r,
    magazin_beraterName: resolveDisplay(r.fields.magazin_berater, maps.beraterMap, 'berater_nachname'),
  }));
}

interface LeadairWebSoftwareMaps {
  beraterMap: Map<string, Berater>;
}

export function enrichLeadairWebSoftware(
  leadairWebSoftware: LeadairWebSoftware[],
  maps: LeadairWebSoftwareMaps
): EnrichedLeadairWebSoftware[] {
  return leadairWebSoftware.map(r => ({
    ...r,
    leadair_beraterName: resolveDisplay(r.fields.leadair_berater, maps.beraterMap, 'berater_nachname'),
  }));
}

interface VeranstaltungenMaps {
  kongresszentrumMap: Map<string, Kongresszentrum>;
  beraterMap: Map<string, Berater>;
}

export function enrichVeranstaltungen(
  veranstaltungen: Veranstaltungen[],
  maps: VeranstaltungenMaps
): EnrichedVeranstaltungen[] {
  return veranstaltungen.map(r => ({
    ...r,
    veranstaltung_raumName: resolveDisplay(r.fields.veranstaltung_raum, maps.kongresszentrumMap, 'raumname'),
    veranstaltung_beraterName: resolveDisplay(r.fields.veranstaltung_berater, maps.beraterMap, 'berater_nachname'),
  }));
}
