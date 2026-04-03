// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Fachbuecher, Fachmagazin, Kongresszentrum, LeadairWebSoftware, Veranstaltungen, Unternehmensdaten, Berater, CreateFachbuecher, CreateFachmagazin, CreateKongresszentrum, CreateLeadairWebSoftware, CreateVeranstaltungen, CreateUnternehmensdaten, CreateBerater } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event('auth-error'));
    throw new Error(await response.text());
  }
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) window.dispatchEvent(new Event('auth-error'));
    throw new Error(`File upload failed: ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a deployed dashboard via app params
  const paramChecks = await Promise.allSettled(
    groups.map(g => callApi('GET', `/apps/${(g as any)._firstAppId}/params/la_page_header_additional_url`))
  );
  paramChecks.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const url = result.value.value;
    if (typeof url === 'string' && url.length > 0) {
      try { groups[i].href = new URL(url).pathname; } catch { groups[i].href = url; }
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- FACHBUECHER ---
  static async getFachbuecher(): Promise<Fachbuecher[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.FACHBUECHER}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Fachbuecher[];
    return enrichLookupFields(records, 'fachbuecher');
  }
  static async getFachbuecherEntry(id: string): Promise<Fachbuecher | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.FACHBUECHER}/records/${id}`);
    const record = { record_id: data.id, ...data } as Fachbuecher;
    return enrichLookupFields([record], 'fachbuecher')[0];
  }
  static async createFachbuecherEntry(fields: CreateFachbuecher) {
    return callApi('POST', `/apps/${APP_IDS.FACHBUECHER}/records`, { fields: cleanFieldsForApi(fields as any, 'fachbuecher') });
  }
  static async updateFachbuecherEntry(id: string, fields: Partial<CreateFachbuecher>) {
    return callApi('PATCH', `/apps/${APP_IDS.FACHBUECHER}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'fachbuecher') });
  }
  static async deleteFachbuecherEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.FACHBUECHER}/records/${id}`);
  }

  // --- FACHMAGAZIN ---
  static async getFachmagazin(): Promise<Fachmagazin[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.FACHMAGAZIN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Fachmagazin[];
    return enrichLookupFields(records, 'fachmagazin');
  }
  static async getFachmagazinEntry(id: string): Promise<Fachmagazin | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.FACHMAGAZIN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Fachmagazin;
    return enrichLookupFields([record], 'fachmagazin')[0];
  }
  static async createFachmagazinEntry(fields: CreateFachmagazin) {
    return callApi('POST', `/apps/${APP_IDS.FACHMAGAZIN}/records`, { fields: cleanFieldsForApi(fields as any, 'fachmagazin') });
  }
  static async updateFachmagazinEntry(id: string, fields: Partial<CreateFachmagazin>) {
    return callApi('PATCH', `/apps/${APP_IDS.FACHMAGAZIN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'fachmagazin') });
  }
  static async deleteFachmagazinEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.FACHMAGAZIN}/records/${id}`);
  }

  // --- KONGRESSZENTRUM ---
  static async getKongresszentrum(): Promise<Kongresszentrum[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.KONGRESSZENTRUM}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Kongresszentrum[];
    return enrichLookupFields(records, 'kongresszentrum');
  }
  static async getKongresszentrumEntry(id: string): Promise<Kongresszentrum | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.KONGRESSZENTRUM}/records/${id}`);
    const record = { record_id: data.id, ...data } as Kongresszentrum;
    return enrichLookupFields([record], 'kongresszentrum')[0];
  }
  static async createKongresszentrumEntry(fields: CreateKongresszentrum) {
    return callApi('POST', `/apps/${APP_IDS.KONGRESSZENTRUM}/records`, { fields: cleanFieldsForApi(fields as any, 'kongresszentrum') });
  }
  static async updateKongresszentrumEntry(id: string, fields: Partial<CreateKongresszentrum>) {
    return callApi('PATCH', `/apps/${APP_IDS.KONGRESSZENTRUM}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'kongresszentrum') });
  }
  static async deleteKongresszentrumEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.KONGRESSZENTRUM}/records/${id}`);
  }

  // --- LEADAIR_WEB_SOFTWARE ---
  static async getLeadairWebSoftware(): Promise<LeadairWebSoftware[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.LEADAIR_WEB_SOFTWARE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as LeadairWebSoftware[];
    return enrichLookupFields(records, 'leadair_web_software');
  }
  static async getLeadairWebSoftwareEntry(id: string): Promise<LeadairWebSoftware | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.LEADAIR_WEB_SOFTWARE}/records/${id}`);
    const record = { record_id: data.id, ...data } as LeadairWebSoftware;
    return enrichLookupFields([record], 'leadair_web_software')[0];
  }
  static async createLeadairWebSoftwareEntry(fields: CreateLeadairWebSoftware) {
    return callApi('POST', `/apps/${APP_IDS.LEADAIR_WEB_SOFTWARE}/records`, { fields: cleanFieldsForApi(fields as any, 'leadair_web_software') });
  }
  static async updateLeadairWebSoftwareEntry(id: string, fields: Partial<CreateLeadairWebSoftware>) {
    return callApi('PATCH', `/apps/${APP_IDS.LEADAIR_WEB_SOFTWARE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'leadair_web_software') });
  }
  static async deleteLeadairWebSoftwareEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.LEADAIR_WEB_SOFTWARE}/records/${id}`);
  }

  // --- VERANSTALTUNGEN ---
  static async getVeranstaltungen(): Promise<Veranstaltungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.VERANSTALTUNGEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Veranstaltungen[];
    return enrichLookupFields(records, 'veranstaltungen');
  }
  static async getVeranstaltungenEntry(id: string): Promise<Veranstaltungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.VERANSTALTUNGEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Veranstaltungen;
    return enrichLookupFields([record], 'veranstaltungen')[0];
  }
  static async createVeranstaltungenEntry(fields: CreateVeranstaltungen) {
    return callApi('POST', `/apps/${APP_IDS.VERANSTALTUNGEN}/records`, { fields: cleanFieldsForApi(fields as any, 'veranstaltungen') });
  }
  static async updateVeranstaltungenEntry(id: string, fields: Partial<CreateVeranstaltungen>) {
    return callApi('PATCH', `/apps/${APP_IDS.VERANSTALTUNGEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'veranstaltungen') });
  }
  static async deleteVeranstaltungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.VERANSTALTUNGEN}/records/${id}`);
  }

  // --- UNTERNEHMENSDATEN ---
  static async getUnternehmensdaten(): Promise<Unternehmensdaten[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.UNTERNEHMENSDATEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Unternehmensdaten[];
    return enrichLookupFields(records, 'unternehmensdaten');
  }
  static async getUnternehmensdatenEntry(id: string): Promise<Unternehmensdaten | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.UNTERNEHMENSDATEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Unternehmensdaten;
    return enrichLookupFields([record], 'unternehmensdaten')[0];
  }
  static async createUnternehmensdatenEntry(fields: CreateUnternehmensdaten) {
    return callApi('POST', `/apps/${APP_IDS.UNTERNEHMENSDATEN}/records`, { fields: cleanFieldsForApi(fields as any, 'unternehmensdaten') });
  }
  static async updateUnternehmensdatenEntry(id: string, fields: Partial<CreateUnternehmensdaten>) {
    return callApi('PATCH', `/apps/${APP_IDS.UNTERNEHMENSDATEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'unternehmensdaten') });
  }
  static async deleteUnternehmensdatenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.UNTERNEHMENSDATEN}/records/${id}`);
  }

  // --- BERATER ---
  static async getBerater(): Promise<Berater[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BERATER}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Berater[];
    return enrichLookupFields(records, 'berater');
  }
  static async getBeraterEntry(id: string): Promise<Berater | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BERATER}/records/${id}`);
    const record = { record_id: data.id, ...data } as Berater;
    return enrichLookupFields([record], 'berater')[0];
  }
  static async createBeraterEntry(fields: CreateBerater) {
    return callApi('POST', `/apps/${APP_IDS.BERATER}/records`, { fields: cleanFieldsForApi(fields as any, 'berater') });
  }
  static async updateBeraterEntry(id: string, fields: Partial<CreateBerater>) {
    return callApi('PATCH', `/apps/${APP_IDS.BERATER}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'berater') });
  }
  static async deleteBeraterEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BERATER}/records/${id}`);
  }

}