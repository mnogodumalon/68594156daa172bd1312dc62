import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichFachbuecher, enrichFachmagazin, enrichLeadairWebSoftware, enrichVeranstaltungen } from '@/lib/enrich';
import type { EnrichedVeranstaltungen } from '@/types/enriched';
import type { Berater, Kongresszentrum, Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconBook, IconChevronLeft, IconChevronRight, IconMapPin, IconUser, IconBuildingArch, IconNews } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VeranstaltungenDialog } from '@/components/dialogs/VeranstaltungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '68594156daa172bd1312dc62';
const REPAIR_ENDPOINT = '/claude/build/repair';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const TYP_COLORS: Record<string, string> = {
  seminar: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  workshop: 'bg-violet-100 text-violet-700 border-violet-200',
  kongress: 'bg-blue-100 text-blue-700 border-blue-200',
  webinar: 'bg-teal-100 text-teal-700 border-teal-200',
  sonstiges: 'bg-slate-100 text-slate-600 border-slate-200',
};

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-based week: Mon=0 ... Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function DashboardOverview() {
  const {
    fachbuecher, fachmagazin, kongresszentrum, leadairWebSoftware, veranstaltungen, unternehmensdaten: _unternehmensdaten, berater,
    kongresszentrumMap, beraterMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedFachbuecher = enrichFachbuecher(fachbuecher, { beraterMap });
  const enrichedFachmagazin = enrichFachmagazin(fachmagazin, { beraterMap });
  const enrichedLeadairWebSoftware = enrichLeadairWebSoftware(leadairWebSoftware, { beraterMap });
  const enrichedVeranstaltungen = enrichVeranstaltungen(veranstaltungen, { kongresszentrumMap, beraterMap });

  // --- State (ALL hooks before any early return) ---
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedVeranstaltungen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedVeranstaltungen | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'berater' | 'raeume'>('berater');
  const [selectedRaum, setSelectedRaum] = useState<Kongresszentrum | null>(null);

  // Map events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EnrichedVeranstaltungen[]>();
    for (const ev of enrichedVeranstaltungen) {
      const dt = ev.fields.veranstaltung_datum;
      if (!dt) continue;
      const d = new Date(dt);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const key = String(d.getDate());
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    }
    return map;
  }, [enrichedVeranstaltungen, calYear, calMonth]);

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return eventsByDay.get(String(selectedDay)) ?? [];
  }, [selectedDay, eventsByDay]);

  // Upcoming events (next 30 days from today)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const limit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return enrichedVeranstaltungen
      .filter(ev => {
        if (!ev.fields.veranstaltung_datum) return false;
        const d = new Date(ev.fields.veranstaltung_datum);
        return d >= now && d <= limit;
      })
      .sort((a, b) => new Date(a.fields.veranstaltung_datum!).getTime() - new Date(b.fields.veranstaltung_datum!).getTime())
      .slice(0, 5);
  }, [enrichedVeranstaltungen]);

  const calDays = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);

  const selectedRaumEvents = useMemo(() => {
    if (!selectedRaum) return [];
    return enrichedVeranstaltungen.filter(ev => ev.veranstaltung_raumName === selectedRaum.fields.raumname);
  }, [selectedRaum, enrichedVeranstaltungen]);

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(prev => prev === day ? null : day);
  };

  const handleCreateFromDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setPrefillDate(dateStr + 'T09:00');
    setEditRecord(null);
    setDialogOpen(true);
  };

  const handleEdit = (ev: EnrichedVeranstaltungen) => {
    setEditRecord(ev);
    setPrefillDate(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteVeranstaltungenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleSubmit = async (fields: Veranstaltungen['fields']) => {
    if (editRecord) {
      await LivingAppsService.updateVeranstaltungenEntry(editRecord.record_id, fields);
    } else {
      await LivingAppsService.createVeranstaltungenEntry(fields);
    }
    fetchAll();
  };

  const getDefaultValues = (): Veranstaltungen['fields'] | undefined => {
    if (editRecord) return editRecord.fields;
    if (prefillDate) return { veranstaltung_datum: prefillDate };
    return undefined;
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;

  const firma = _unternehmensdaten[0];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {firma?.fields.firmenname ?? 'HelfRecht Management Suite'}
          </h1>
          {firma?.fields.leitsatz && (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">{firma.fields.leitsatz}</p>
          )}
        </div>
        <Button onClick={() => { setEditRecord(null); setPrefillDate(undefined); setDialogOpen(true); }} className="shrink-0 self-start sm:self-auto">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Neue Veranstaltung
        </Button>
      </div>

      {/* Main: Kalender + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kalender */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          {/* Kalender Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              {MONATE[calMonth]} {calYear}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                <IconChevronLeft size={16} />
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8 px-3"
                onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); setSelectedDay(today.getDate()); }}>
                Heute
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                <IconChevronRight size={16} />
              </Button>
            </div>
          </div>

          {/* Wochentage */}
          <div className="grid grid-cols-7 border-b border-border">
            {WOCHENTAGE.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Tage */}
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square border-r border-b border-border/40 last:border-r-0" />;
              }
              const events = eventsByDay.get(String(day)) ?? [];
              const isSelected = selectedDay === day;
              const isTodayDay = isToday(day);
              return (
                <div
                  key={day}
                  className={`relative border-r border-b border-border/40 last:border-r-0 cursor-pointer transition-colors min-h-[56px] sm:min-h-[72px] p-1
                    ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                      ${isTodayDay ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                      {day}
                    </span>
                    <button
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleCreateFromDay(day); }}
                      title="Veranstaltung erstellen"
                    >
                      <IconPlus size={12} />
                    </button>
                  </div>
                  <div className="mt-0.5 space-y-0.5 overflow-hidden">
                    {events.slice(0, 2).map(ev => {
                      const typKey = ev.fields.veranstaltung_typ?.key ?? 'sonstiges';
                      return (
                        <div
                          key={ev.record_id}
                          className={`text-[10px] font-medium px-1 py-0.5 rounded truncate leading-tight border
                            ${TYP_COLORS[typKey] ?? TYP_COLORS.sonstiges}`}
                        >
                          {ev.fields.veranstaltung_titel ?? '(Kein Titel)'}
                        </div>
                      );
                    })}
                    {events.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{events.length - 2} mehr</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailansicht für ausgewählten Tag */}
          {selectedDay !== null && (
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {String(selectedDay).padStart(2, '0')}. {MONATE[calMonth]} {calYear}
                </h3>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleCreateFromDay(selectedDay)}>
                  <IconPlus size={12} className="mr-1" /> Neu
                </Button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Veranstaltungen an diesem Tag.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(ev => (
                    <EventCard
                      key={ev.record_id}
                      ev={ev}
                      onEdit={() => handleEdit(ev)}
                      onDelete={() => setDeleteTarget(ev)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Upcoming + Ressourcen */}
        <div className="space-y-4">
          {/* Kommende Veranstaltungen */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Nächste 30 Tage</h3>
            </div>
            <div className="divide-y divide-border">
              {upcomingEvents.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Keine bevorstehenden Veranstaltungen
                </div>
              ) : (
                upcomingEvents.map(ev => {
                  const typKey = ev.fields.veranstaltung_typ?.key ?? 'sonstiges';
                  const dt = ev.fields.veranstaltung_datum ? new Date(ev.fields.veranstaltung_datum) : null;
                  return (
                    <div key={ev.record_id} className="px-4 py-3 hover:bg-muted/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {ev.fields.veranstaltung_titel ?? '(Kein Titel)'}
                          </p>
                          {dt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}{' '}
                              {dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </p>
                          )}
                          {ev.veranstaltung_raumName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <IconMapPin size={11} className="shrink-0" />
                              <span className="truncate">{ev.veranstaltung_raumName}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => handleEdit(ev)}>
                            <IconPencil size={14} />
                          </button>
                          <button className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeleteTarget(ev)}>
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] mt-1.5 px-1.5 py-0 ${TYP_COLORS[typKey] ?? TYP_COLORS.sonstiges}`}>
                        {ev.fields.veranstaltung_typ?.label ?? 'Sonstiges'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Berater / Räume Tabs */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-border">
              <button
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'berater' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('berater')}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <IconUser size={14} /> Berater
                </span>
              </button>
              <button
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'raeume' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('raeume')}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <IconBuildingArch size={14} /> Räume
                </span>
              </button>
            </div>

            {activeTab === 'berater' && (
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {berater.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Keine Berater erfasst</div>
                ) : (
                  berater.map(b => (
                    <BeraterRow key={b.record_id} berater={b} veranstaltungen={enrichedVeranstaltungen} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'raeume' && (
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {kongresszentrum.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Keine Räume erfasst</div>
                ) : (
                  kongresszentrum.map(r => (
                    <RaumRow key={r.record_id} raum={r} veranstaltungen={enrichedVeranstaltungen} onClick={() => setSelectedRaum(r)} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Fachpublikationen Mini-Übersicht */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <IconNews size={15} className="text-muted-foreground" />
              <h3 className="font-semibold text-sm text-foreground">Fachpublikationen</h3>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{enrichedFachbuecher.length}</p>
                <p className="text-xs text-muted-foreground">Fachbücher</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{enrichedFachmagazin.length}</p>
                <p className="text-xs text-muted-foreground">Magazin-Ausgaben</p>
              </div>
              <div className="col-span-2 text-center">
                <p className="text-2xl font-bold text-foreground">{enrichedLeadairWebSoftware.length}</p>
                <p className="text-xs text-muted-foreground">LeadAir Module</p>
              </div>
            </div>
            {enrichedFachbuecher.slice(0, 2).map(b => (
              <div key={b.record_id} className="px-4 py-2 border-t border-border/60 flex items-center gap-2">
                <IconBook size={13} className="shrink-0 text-muted-foreground" />
                <span className="text-xs text-foreground truncate min-w-0">{b.fields.fachbuch_titel ?? '–'}</span>
                {b.fields.fachbuch_erscheinungsdatum && (
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(b.fields.fachbuch_erscheinungsdatum)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raum-Overlay */}
      {selectedRaum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedRaum(null)}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <IconBuildingArch size={16} className="shrink-0 text-muted-foreground" />
                <h3 className="font-semibold text-foreground truncate">{selectedRaum.fields.raumname ?? '–'}</h3>
                {selectedRaum.fields.kapazitaet != null && (
                  <span className="text-xs text-muted-foreground shrink-0">· {selectedRaum.fields.kapazitaet} Pers.</span>
                )}
              </div>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" onClick={() => setSelectedRaum(null)}>
                <IconPlus size={16} className="rotate-45" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {selectedRaumEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Keine Veranstaltungen für diesen Raum.</p>
              ) : (
                <div className="space-y-2">
                  {selectedRaumEvents.map(ev => (
                    <EventCard
                      key={ev.record_id}
                      ev={ev}
                      onEdit={() => { handleEdit(ev); setSelectedRaum(null); }}
                      onDelete={() => { setDeleteTarget(ev); setSelectedRaum(null); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialoge */}
      <VeranstaltungenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); setPrefillDate(undefined); }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        kongresszentrumList={kongresszentrum}
        beraterList={berater}
        enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Veranstaltung löschen"
        description={`"${deleteTarget?.fields.veranstaltung_titel ?? 'Diese Veranstaltung'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// --- Sub-Components ---

function EventCard({ ev, onEdit, onDelete }: {
  ev: EnrichedVeranstaltungen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typKey = ev.fields.veranstaltung_typ?.key ?? 'sonstiges';
  const dt = ev.fields.veranstaltung_datum ? new Date(ev.fields.veranstaltung_datum) : null;
  return (
    <div className={`rounded-xl border p-3 ${TYP_COLORS[typKey] ?? TYP_COLORS.sonstiges}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{ev.fields.veranstaltung_titel ?? '(Kein Titel)'}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {dt && (
              <span className="text-xs opacity-80">
                {dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
            )}
            {ev.veranstaltung_raumName && (
              <span className="text-xs opacity-80 flex items-center gap-1">
                <IconMapPin size={11} className="shrink-0" />{ev.veranstaltung_raumName}
              </span>
            )}
            {ev.veranstaltung_beraterName && (
              <span className="text-xs opacity-80 flex items-center gap-1">
                <IconUser size={11} className="shrink-0" />{ev.veranstaltung_beraterName}
              </span>
            )}
          </div>
          {ev.fields.veranstaltung_beschreibung && (
            <p className="text-xs mt-1 opacity-70 line-clamp-2">{ev.fields.veranstaltung_beschreibung}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button className="p-1 rounded hover:bg-black/10 transition-colors" onClick={onEdit} title="Bearbeiten">
            <IconPencil size={14} />
          </button>
          <button className="p-1 rounded hover:bg-black/10 transition-colors" onClick={onDelete} title="Löschen">
            <IconTrash size={14} />
          </button>
        </div>
      </div>
      <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0 border-current/30 bg-white/40">
        {ev.fields.veranstaltung_typ?.label ?? 'Sonstiges'}
      </Badge>
    </div>
  );
}

function BeraterRow({ berater, veranstaltungen }: { berater: Berater; veranstaltungen: EnrichedVeranstaltungen[] }) {
  const count = veranstaltungen.filter(ev => ev.veranstaltung_beraterName === `${berater.fields.berater_vorname ?? ''} ${berater.fields.berater_nachname ?? ''}`.trim()).length;
  const initials = `${(berater.fields.berater_vorname ?? '').charAt(0)}${(berater.fields.berater_nachname ?? '').charAt(0)}`.toUpperCase();
  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
        {initials || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {berater.fields.berater_vorname} {berater.fields.berater_nachname}
        </p>
        {berater.fields.berater_fachgebiet && (
          <p className="text-xs text-muted-foreground truncate">{berater.fields.berater_fachgebiet}</p>
        )}
      </div>
      {count > 0 && (
        <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
      )}
    </div>
  );
}

function RaumRow({ raum, veranstaltungen, onClick }: { raum: Kongresszentrum; veranstaltungen: EnrichedVeranstaltungen[]; onClick: () => void }) {
  const count = veranstaltungen.filter(ev => ev.veranstaltung_raumName === raum.fields.raumname).length;
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <IconBuildingArch size={15} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{raum.fields.raumname ?? '–'}</p>
        {raum.fields.kapazitaet != null && (
          <p className="text-xs text-muted-foreground">Kapazität: {raum.fields.kapazitaet} Pers.</p>
        )}
      </div>
      {count > 0 && (
        <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
      )}
    </div>
  );
}

// --- Skeleton & Error ---

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
