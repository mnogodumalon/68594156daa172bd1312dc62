import type { Fachbuecher, Berater } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface FachbuecherViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Fachbuecher | null;
  onEdit: (record: Fachbuecher) => void;
  beraterList: Berater[];
}

export function FachbuecherViewDialog({ open, onClose, record, onEdit, beraterList }: FachbuecherViewDialogProps) {
  function getBeraterDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return beraterList.find(r => r.record_id === id)?.fields.berater_nachname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fachbücher anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Buchtitel</Label>
            <p className="text-sm">{record.fields.fachbuch_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erscheinungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.fachbuch_erscheinungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Autor(en)</Label>
            <p className="text-sm">{getBeraterDisplayName(record.fields.fachbuch_autoren)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">ISBN</Label>
            <p className="text-sm">{record.fields.fachbuch_isbn ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}