import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, Save } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { KvsConfig } from '@/hooks/useKinesisWebRTC';

const STORAGE_KEY = 'kvs-config';

const DEFAULT_CONFIG: KvsConfig = {
  channelName: '',
};

function loadConfig(): KvsConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { channelName: parsed.channelName || '' };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

interface KvsConfigFormProps {
  config: KvsConfig;
  onChange: (config: KvsConfig) => void;
}

export const KvsConfigForm = ({ config, onChange }: KvsConfigFormProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<KvsConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    onChange(draft);
    setOpen(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" title="KVS Settings">
          <Settings className="w-4 h-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="p-3 mt-2 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KVS Config</h4>
          <div className="space-y-1">
            <Label className="text-xs">Channel Name</Label>
            <Input
              className="h-7 text-xs"
              value={draft.channelName}
              onChange={(e) => setDraft((prev) => ({ ...prev, channelName: e.target.value }))}
              placeholder="my-channel"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            AWS credentials are securely stored server-side.
          </p>
          <Button size="sm" className="w-full h-7 text-xs" onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" /> Save Config
          </Button>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export { loadConfig };
export type { KvsConfig };
