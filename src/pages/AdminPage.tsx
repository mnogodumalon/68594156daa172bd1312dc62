import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Fachbuecher, Fachmagazin, Kongresszentrum, LeadairWebSoftware, Veranstaltungen, Unternehmensdaten, Berater } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { FachbuecherDialog } from '@/components/dialogs/FachbuecherDialog';
import { FachbuecherViewDialog } from '@/components/dialogs/FachbuecherViewDialog';
import { FachmagazinDialog } from '@/components/dialogs/FachmagazinDialog';
import { FachmagazinViewDialog } from '@/components/dialogs/FachmagazinViewDialog';
import { KongresszentrumDialog } from '@/components/dialogs/KongresszentrumDialog';
import { KongresszentrumViewDialog } from '@/components/dialogs/KongresszentrumViewDialog';
import { LeadairWebSoftwareDialog } from '@/components/dialogs/LeadairWebSoftwareDialog';
import { LeadairWebSoftwareViewDialog } from '@/components/dialogs/LeadairWebSoftwareViewDialog';
import { VeranstaltungenDialog } from '@/components/dialogs/VeranstaltungenDialog';
import { VeranstaltungenViewDialog } from '@/components/dialogs/VeranstaltungenViewDialog';
import { UnternehmensdatenDialog } from '@/components/dialogs/UnternehmensdatenDialog';
import { UnternehmensdatenViewDialog } from '@/components/dialogs/UnternehmensdatenViewDialog';
import { BeraterDialog } from '@/components/dialogs/BeraterDialog';
import { BeraterViewDialog } from '@/components/dialogs/BeraterViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const FACHBUECHER_FIELDS = [
  { key: 'fachbuch_titel', label: 'Buchtitel', type: 'string/text' },
  { key: 'fachbuch_erscheinungsdatum', label: 'Erscheinungsdatum', type: 'date/date' },
  { key: 'fachbuch_autoren', label: 'Autor(en)', type: 'multipleapplookup/select', targetEntity: 'berater', targetAppId: 'BERATER', displayField: 'berater_nachname' },
  { key: 'fachbuch_isbn', label: 'ISBN', type: 'string/text' },
];
const FACHMAGAZIN_FIELDS = [
  { key: 'magazin_erscheinungsdatum', label: 'Erscheinungsdatum', type: 'date/date' },
  { key: 'magazin_schwerpunkt', label: 'Schwerpunktthema', type: 'string/text' },
  { key: 'magazin_berater', label: 'Beitragende Berater', type: 'multipleapplookup/select', targetEntity: 'berater', targetAppId: 'BERATER', displayField: 'berater_nachname' },
  { key: 'magazin_ausgabenummer', label: 'Ausgabenummer', type: 'string/text' },
];
const KONGRESSZENTRUM_FIELDS = [
  { key: 'raumname', label: 'Raumname', type: 'string/text' },
  { key: 'kapazitaet', label: 'Kapazität (Personen)', type: 'number' },
  { key: 'ausstattung', label: 'Ausstattung', type: 'string/textarea' },
  { key: 'bild1_raum', label: 'Bild 1 (Raum)', type: 'file' },
  { key: 'bild2_raum', label: 'Bild 2 (Raum)', type: 'file' },
  { key: 'bild3_raum', label: 'Bild 3 (Raum)', type: 'file' },
];
const LEADAIRWEBSOFTWARE_FIELDS = [
  { key: 'leadair_modulname', label: 'Modulname', type: 'string/text' },
  { key: 'leadair_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'leadair_berater', label: 'Verantwortlicher Berater', type: 'applookup/select', targetEntity: 'berater', targetAppId: 'BERATER', displayField: 'berater_nachname' },
];
const VERANSTALTUNGEN_FIELDS = [
  { key: 'veranstaltung_titel', label: 'Titel der Veranstaltung', type: 'string/text' },
  { key: 'veranstaltung_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'veranstaltung_datum', label: 'Datum & Uhrzeit', type: 'date/datetimeminute' },
  { key: 'veranstaltung_raum', label: 'Veranstaltungsort (Raum)', type: 'applookup/select', targetEntity: 'kongresszentrum', targetAppId: 'KONGRESSZENTRUM', displayField: 'raumname' },
  { key: 'veranstaltung_berater', label: 'Verantwortlicher Berater', type: 'applookup/select', targetEntity: 'berater', targetAppId: 'BERATER', displayField: 'berater_nachname' },
  { key: 'veranstaltung_typ', label: 'Veranstaltungstyp', type: 'lookup/select', options: [{ key: 'seminar', label: 'Seminar' }, { key: 'workshop', label: 'Workshop' }, { key: 'kongress', label: 'Kongress' }, { key: 'webinar', label: 'Webinar' }, { key: 'sonstiges', label: 'Sonstiges' }] },
];
const UNTERNEHMENSDATEN_FIELDS = [
  { key: 'firmenname', label: 'Firmenname', type: 'string/text' },
  { key: 'strasse', label: 'Straße', type: 'string/text' },
  { key: 'hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'plz', label: 'PLZ', type: 'string/text' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'telefonnummer', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'webseite', label: 'Webseite', type: 'string/url' },
  { key: 'anzahl_veranstaltungen', label: 'Anzahl Veranstaltungen pro Jahr', type: 'number' },
  { key: 'anzahl_fachbuecher', label: 'Anzahl veröffentlichte Fachbücher', type: 'number' },
  { key: 'weiterempfehlungsquote', label: 'Weiterempfehlungsquote (%)', type: 'number' },
  { key: 'wirkungsgarantie_zeitersparnis', label: 'Wirkungsgarantie Zeitersparnis (%)', type: 'number' },
  { key: 'leitsatz', label: 'Leitsatz', type: 'string/textarea' },
];
const BERATER_FIELDS = [
  { key: 'berater_nachname', label: 'Nachname', type: 'string/text' },
  { key: 'berater_telefon', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'berater_fachgebiet', label: 'Fachgebiet', type: 'string/text' },
  { key: 'berater_vorname', label: 'Vorname', type: 'string/text' },
  { key: 'berater_email', label: 'E-Mail-Adresse', type: 'string/email' },
];

const ENTITY_TABS = [
  { key: 'fachbuecher', label: 'Fachbücher', pascal: 'Fachbuecher' },
  { key: 'fachmagazin', label: 'Fachmagazin', pascal: 'Fachmagazin' },
  { key: 'kongresszentrum', label: 'Kongresszentrum', pascal: 'Kongresszentrum' },
  { key: 'leadair_web_software', label: 'LeadAir Web-Software', pascal: 'LeadairWebSoftware' },
  { key: 'veranstaltungen', label: 'Veranstaltungen', pascal: 'Veranstaltungen' },
  { key: 'unternehmensdaten', label: 'Unternehmensdaten', pascal: 'Unternehmensdaten' },
  { key: 'berater', label: 'Berater', pascal: 'Berater' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('fachbuecher');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'fachbuecher': new Set(),
    'fachmagazin': new Set(),
    'kongresszentrum': new Set(),
    'leadair_web_software': new Set(),
    'veranstaltungen': new Set(),
    'unternehmensdaten': new Set(),
    'berater': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'fachbuecher': {},
    'fachmagazin': {},
    'kongresszentrum': {},
    'leadair_web_software': {},
    'veranstaltungen': {},
    'unternehmensdaten': {},
    'berater': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'fachbuecher': return (data as any).fachbuecher as Fachbuecher[] ?? [];
      case 'fachmagazin': return (data as any).fachmagazin as Fachmagazin[] ?? [];
      case 'kongresszentrum': return (data as any).kongresszentrum as Kongresszentrum[] ?? [];
      case 'leadair_web_software': return (data as any).leadairWebSoftware as LeadairWebSoftware[] ?? [];
      case 'veranstaltungen': return (data as any).veranstaltungen as Veranstaltungen[] ?? [];
      case 'unternehmensdaten': return (data as any).unternehmensdaten as Unternehmensdaten[] ?? [];
      case 'berater': return (data as any).berater as Berater[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'fachbuecher':
        lists.beraterList = (data as any).berater ?? [];
        break;
      case 'fachmagazin':
        lists.beraterList = (data as any).berater ?? [];
        break;
      case 'leadair_web_software':
        lists.beraterList = (data as any).berater ?? [];
        break;
      case 'veranstaltungen':
        lists.kongresszentrumList = (data as any).kongresszentrum ?? [];
        lists.beraterList = (data as any).berater ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'fachbuecher' && fieldKey === 'fachbuch_autoren') {
      const match = (lists.beraterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.berater_nachname ?? '—';
    }
    if (entity === 'fachmagazin' && fieldKey === 'magazin_berater') {
      const match = (lists.beraterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.berater_nachname ?? '—';
    }
    if (entity === 'leadair_web_software' && fieldKey === 'leadair_berater') {
      const match = (lists.beraterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.berater_nachname ?? '—';
    }
    if (entity === 'veranstaltungen' && fieldKey === 'veranstaltung_raum') {
      const match = (lists.kongresszentrumList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.raumname ?? '—';
    }
    if (entity === 'veranstaltungen' && fieldKey === 'veranstaltung_berater') {
      const match = (lists.beraterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.berater_nachname ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'fachbuecher': return FACHBUECHER_FIELDS;
      case 'fachmagazin': return FACHMAGAZIN_FIELDS;
      case 'kongresszentrum': return KONGRESSZENTRUM_FIELDS;
      case 'leadair_web_software': return LEADAIRWEBSOFTWARE_FIELDS;
      case 'veranstaltungen': return VERANSTALTUNGEN_FIELDS;
      case 'unternehmensdaten': return UNTERNEHMENSDATEN_FIELDS;
      case 'berater': return BERATER_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'fachbuecher': return {
        create: (fields: any) => LivingAppsService.createFachbuecherEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateFachbuecherEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteFachbuecherEntry(id),
      };
      case 'fachmagazin': return {
        create: (fields: any) => LivingAppsService.createFachmagazinEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateFachmagazinEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteFachmagazinEntry(id),
      };
      case 'kongresszentrum': return {
        create: (fields: any) => LivingAppsService.createKongresszentrumEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKongresszentrumEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKongresszentrumEntry(id),
      };
      case 'leadair_web_software': return {
        create: (fields: any) => LivingAppsService.createLeadairWebSoftwareEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateLeadairWebSoftwareEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteLeadairWebSoftwareEntry(id),
      };
      case 'veranstaltungen': return {
        create: (fields: any) => LivingAppsService.createVeranstaltungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateVeranstaltungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteVeranstaltungenEntry(id),
      };
      case 'unternehmensdaten': return {
        create: (fields: any) => LivingAppsService.createUnternehmensdatenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateUnternehmensdatenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteUnternehmensdatenEntry(id),
      };
      case 'berater': return {
        create: (fields: any) => LivingAppsService.createBeraterEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateBeraterEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteBeraterEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'fachbuecher' || dialogState?.entity === 'fachbuecher') && (
        <FachbuecherDialog
          open={createEntity === 'fachbuecher' || dialogState?.entity === 'fachbuecher'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'fachbuecher' ? handleUpdate : (fields: any) => handleCreate('fachbuecher', fields)}
          defaultValues={dialogState?.entity === 'fachbuecher' ? dialogState.record?.fields : undefined}
          beraterList={(data as any).berater ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Fachbuecher']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Fachbuecher']}
        />
      )}
      {(createEntity === 'fachmagazin' || dialogState?.entity === 'fachmagazin') && (
        <FachmagazinDialog
          open={createEntity === 'fachmagazin' || dialogState?.entity === 'fachmagazin'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'fachmagazin' ? handleUpdate : (fields: any) => handleCreate('fachmagazin', fields)}
          defaultValues={dialogState?.entity === 'fachmagazin' ? dialogState.record?.fields : undefined}
          beraterList={(data as any).berater ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Fachmagazin']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Fachmagazin']}
        />
      )}
      {(createEntity === 'kongresszentrum' || dialogState?.entity === 'kongresszentrum') && (
        <KongresszentrumDialog
          open={createEntity === 'kongresszentrum' || dialogState?.entity === 'kongresszentrum'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'kongresszentrum' ? handleUpdate : (fields: any) => handleCreate('kongresszentrum', fields)}
          defaultValues={dialogState?.entity === 'kongresszentrum' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Kongresszentrum']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kongresszentrum']}
        />
      )}
      {(createEntity === 'leadair_web_software' || dialogState?.entity === 'leadair_web_software') && (
        <LeadairWebSoftwareDialog
          open={createEntity === 'leadair_web_software' || dialogState?.entity === 'leadair_web_software'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'leadair_web_software' ? handleUpdate : (fields: any) => handleCreate('leadair_web_software', fields)}
          defaultValues={dialogState?.entity === 'leadair_web_software' ? dialogState.record?.fields : undefined}
          beraterList={(data as any).berater ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['LeadairWebSoftware']}
          enablePhotoLocation={AI_PHOTO_LOCATION['LeadairWebSoftware']}
        />
      )}
      {(createEntity === 'veranstaltungen' || dialogState?.entity === 'veranstaltungen') && (
        <VeranstaltungenDialog
          open={createEntity === 'veranstaltungen' || dialogState?.entity === 'veranstaltungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'veranstaltungen' ? handleUpdate : (fields: any) => handleCreate('veranstaltungen', fields)}
          defaultValues={dialogState?.entity === 'veranstaltungen' ? dialogState.record?.fields : undefined}
          kongresszentrumList={(data as any).kongresszentrum ?? []}
          beraterList={(data as any).berater ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
        />
      )}
      {(createEntity === 'unternehmensdaten' || dialogState?.entity === 'unternehmensdaten') && (
        <UnternehmensdatenDialog
          open={createEntity === 'unternehmensdaten' || dialogState?.entity === 'unternehmensdaten'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'unternehmensdaten' ? handleUpdate : (fields: any) => handleCreate('unternehmensdaten', fields)}
          defaultValues={dialogState?.entity === 'unternehmensdaten' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Unternehmensdaten']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensdaten']}
        />
      )}
      {(createEntity === 'berater' || dialogState?.entity === 'berater') && (
        <BeraterDialog
          open={createEntity === 'berater' || dialogState?.entity === 'berater'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'berater' ? handleUpdate : (fields: any) => handleCreate('berater', fields)}
          defaultValues={dialogState?.entity === 'berater' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Berater']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Berater']}
        />
      )}
      {viewState?.entity === 'fachbuecher' && (
        <FachbuecherViewDialog
          open={viewState?.entity === 'fachbuecher'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'fachbuecher', record: r }); }}
          beraterList={(data as any).berater ?? []}
        />
      )}
      {viewState?.entity === 'fachmagazin' && (
        <FachmagazinViewDialog
          open={viewState?.entity === 'fachmagazin'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'fachmagazin', record: r }); }}
          beraterList={(data as any).berater ?? []}
        />
      )}
      {viewState?.entity === 'kongresszentrum' && (
        <KongresszentrumViewDialog
          open={viewState?.entity === 'kongresszentrum'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'kongresszentrum', record: r }); }}
        />
      )}
      {viewState?.entity === 'leadair_web_software' && (
        <LeadairWebSoftwareViewDialog
          open={viewState?.entity === 'leadair_web_software'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'leadair_web_software', record: r }); }}
          beraterList={(data as any).berater ?? []}
        />
      )}
      {viewState?.entity === 'veranstaltungen' && (
        <VeranstaltungenViewDialog
          open={viewState?.entity === 'veranstaltungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'veranstaltungen', record: r }); }}
          kongresszentrumList={(data as any).kongresszentrum ?? []}
          beraterList={(data as any).berater ?? []}
        />
      )}
      {viewState?.entity === 'unternehmensdaten' && (
        <UnternehmensdatenViewDialog
          open={viewState?.entity === 'unternehmensdaten'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'unternehmensdaten', record: r }); }}
        />
      )}
      {viewState?.entity === 'berater' && (
        <BeraterViewDialog
          open={viewState?.entity === 'berater'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'berater', record: r }); }}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}