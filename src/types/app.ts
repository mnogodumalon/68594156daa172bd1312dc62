// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Fachbuecher {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    fachbuch_titel?: string;
    fachbuch_erscheinungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    fachbuch_autoren?: string;
    fachbuch_isbn?: string;
  };
}

export interface Fachmagazin {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    magazin_erscheinungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    magazin_schwerpunkt?: string;
    magazin_berater?: string;
    magazin_ausgabenummer?: string;
  };
}

export interface Kongresszentrum {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    raumname?: string;
    kapazitaet?: number;
    ausstattung?: string;
    bild1_raum?: string;
    bild2_raum?: string;
    bild3_raum?: string;
  };
}

export interface LeadairWebSoftware {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    leadair_modulname?: string;
    leadair_beschreibung?: string;
    leadair_berater?: string; // applookup -> URL zu 'Berater' Record
  };
}

export interface Veranstaltungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltung_titel?: string;
    veranstaltung_beschreibung?: string;
    veranstaltung_datum?: string; // Format: YYYY-MM-DD oder ISO String
    veranstaltung_raum?: string; // applookup -> URL zu 'Kongresszentrum' Record
    veranstaltung_berater?: string; // applookup -> URL zu 'Berater' Record
    veranstaltung_typ?: LookupValue;
  };
}

export interface Unternehmensdaten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    telefonnummer?: string;
    email?: string;
    webseite?: string;
    anzahl_veranstaltungen?: number;
    anzahl_fachbuecher?: number;
    weiterempfehlungsquote?: number;
    wirkungsgarantie_zeitersparnis?: number;
    leitsatz?: string;
  };
}

export interface Berater {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    berater_nachname?: string;
    berater_telefon?: string;
    berater_fachgebiet?: string;
    berater_vorname?: string;
    berater_email?: string;
  };
}

export const APP_IDS = {
  FACHBUECHER: '6859413e4aad621c4ce19829',
  FACHMAGAZIN: '6859413e462ab91026a3e9cf',
  KONGRESSZENTRUM: '6859413c6f638c0c97985da3',
  LEADAIR_WEB_SOFTWARE: '6859413fb1744fb0c3c5282c',
  VERANSTALTUNGEN: '6859413d4523fb4c4bde789b',
  UNTERNEHMENSDATEN: '6859412eb907652ead444121',
  BERATER: '6859413c72f4a3bcd174a800',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'veranstaltungen': {
    veranstaltung_typ: [{ key: "seminar", label: "Seminar" }, { key: "workshop", label: "Workshop" }, { key: "kongress", label: "Kongress" }, { key: "webinar", label: "Webinar" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'fachbuecher': {
    'fachbuch_titel': 'string/text',
    'fachbuch_erscheinungsdatum': 'date/date',
    'fachbuch_autoren': 'multipleapplookup/select',
    'fachbuch_isbn': 'string/text',
  },
  'fachmagazin': {
    'magazin_erscheinungsdatum': 'date/date',
    'magazin_schwerpunkt': 'string/text',
    'magazin_berater': 'multipleapplookup/select',
    'magazin_ausgabenummer': 'string/text',
  },
  'kongresszentrum': {
    'raumname': 'string/text',
    'kapazitaet': 'number',
    'ausstattung': 'string/textarea',
    'bild1_raum': 'file',
    'bild2_raum': 'file',
    'bild3_raum': 'file',
  },
  'leadair_web_software': {
    'leadair_modulname': 'string/text',
    'leadair_beschreibung': 'string/textarea',
    'leadair_berater': 'applookup/select',
  },
  'veranstaltungen': {
    'veranstaltung_titel': 'string/text',
    'veranstaltung_beschreibung': 'string/textarea',
    'veranstaltung_datum': 'date/datetimeminute',
    'veranstaltung_raum': 'applookup/select',
    'veranstaltung_berater': 'applookup/select',
    'veranstaltung_typ': 'lookup/select',
  },
  'unternehmensdaten': {
    'firmenname': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'telefonnummer': 'string/tel',
    'email': 'string/email',
    'webseite': 'string/url',
    'anzahl_veranstaltungen': 'number',
    'anzahl_fachbuecher': 'number',
    'weiterempfehlungsquote': 'number',
    'wirkungsgarantie_zeitersparnis': 'number',
    'leitsatz': 'string/textarea',
  },
  'berater': {
    'berater_nachname': 'string/text',
    'berater_telefon': 'string/tel',
    'berater_fachgebiet': 'string/text',
    'berater_vorname': 'string/text',
    'berater_email': 'string/email',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateFachbuecher = StripLookup<Fachbuecher['fields']>;
export type CreateFachmagazin = StripLookup<Fachmagazin['fields']>;
export type CreateKongresszentrum = StripLookup<Kongresszentrum['fields']>;
export type CreateLeadairWebSoftware = StripLookup<LeadairWebSoftware['fields']>;
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateUnternehmensdaten = StripLookup<Unternehmensdaten['fields']>;
export type CreateBerater = StripLookup<Berater['fields']>;