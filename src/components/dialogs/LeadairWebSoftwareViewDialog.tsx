import type { LeadairWebSoftware, Berater } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface LeadairWebSoftwareViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: LeadairWebSoftware | null;
  onEdit: (record: LeadairWebSoftware) => void;
  beraterList: Berater[];
}

export function LeadairWebSoftwareViewDialog({ open, onClose, record, onEdit, beraterList }: LeadairWebSoftwareViewDialogProps) {
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
          <DialogTitle>LeadAir Web-Software anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Modulname</Label>
            <p className="text-sm">{record.fields.leadair_modulname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.leadair_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verantwortlicher Berater</Label>
            <p className="text-sm">{getBeraterDisplayName(record.fields.leadair_berater)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}