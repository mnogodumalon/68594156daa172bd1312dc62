import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Fachbuecher, Fachmagazin, Kongresszentrum, LeadairWebSoftware, Veranstaltungen, Unternehmensdaten, Berater } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [fachbuecher, setFachbuecher] = useState<Fachbuecher[]>([]);
  const [fachmagazin, setFachmagazin] = useState<Fachmagazin[]>([]);
  const [kongresszentrum, setKongresszentrum] = useState<Kongresszentrum[]>([]);
  const [leadairWebSoftware, setLeadairWebSoftware] = useState<LeadairWebSoftware[]>([]);
  const [veranstaltungen, setVeranstaltungen] = useState<Veranstaltungen[]>([]);
  const [unternehmensdaten, setUnternehmensdaten] = useState<Unternehmensdaten[]>([]);
  const [berater, setBerater] = useState<Berater[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [fachbuecherData, fachmagazinData, kongresszentrumData, leadairWebSoftwareData, veranstaltungenData, unternehmensdatenData, beraterData] = await Promise.all([
        LivingAppsService.getFachbuecher(),
        LivingAppsService.getFachmagazin(),
        LivingAppsService.getKongresszentrum(),
        LivingAppsService.getLeadairWebSoftware(),
        LivingAppsService.getVeranstaltungen(),
        LivingAppsService.getUnternehmensdaten(),
        LivingAppsService.getBerater(),
      ]);
      setFachbuecher(fachbuecherData);
      setFachmagazin(fachmagazinData);
      setKongresszentrum(kongresszentrumData);
      setLeadairWebSoftware(leadairWebSoftwareData);
      setVeranstaltungen(veranstaltungenData);
      setUnternehmensdaten(unternehmensdatenData);
      setBerater(beraterData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [fachbuecherData, fachmagazinData, kongresszentrumData, leadairWebSoftwareData, veranstaltungenData, unternehmensdatenData, beraterData] = await Promise.all([
          LivingAppsService.getFachbuecher(),
          LivingAppsService.getFachmagazin(),
          LivingAppsService.getKongresszentrum(),
          LivingAppsService.getLeadairWebSoftware(),
          LivingAppsService.getVeranstaltungen(),
          LivingAppsService.getUnternehmensdaten(),
          LivingAppsService.getBerater(),
        ]);
        setFachbuecher(fachbuecherData);
        setFachmagazin(fachmagazinData);
        setKongresszentrum(kongresszentrumData);
        setLeadairWebSoftware(leadairWebSoftwareData);
        setVeranstaltungen(veranstaltungenData);
        setUnternehmensdaten(unternehmensdatenData);
        setBerater(beraterData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kongresszentrumMap = useMemo(() => {
    const m = new Map<string, Kongresszentrum>();
    kongresszentrum.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kongresszentrum]);

  const beraterMap = useMemo(() => {
    const m = new Map<string, Berater>();
    berater.forEach(r => m.set(r.record_id, r));
    return m;
  }, [berater]);

  return { fachbuecher, setFachbuecher, fachmagazin, setFachmagazin, kongresszentrum, setKongresszentrum, leadairWebSoftware, setLeadairWebSoftware, veranstaltungen, setVeranstaltungen, unternehmensdaten, setUnternehmensdaten, berater, setBerater, loading, error, fetchAll, kongresszentrumMap, beraterMap };
}