import type { Fachbuecher, Fachmagazin, LeadairWebSoftware, Veranstaltungen } from './app';

export type EnrichedFachbuecher = Fachbuecher & {
  fachbuch_autorenName: string;
};

export type EnrichedFachmagazin = Fachmagazin & {
  magazin_beraterName: string;
};

export type EnrichedLeadairWebSoftware = LeadairWebSoftware & {
  leadair_beraterName: string;
};

export type EnrichedVeranstaltungen = Veranstaltungen & {
  veranstaltung_raumName: string;
  veranstaltung_beraterName: string;
};
