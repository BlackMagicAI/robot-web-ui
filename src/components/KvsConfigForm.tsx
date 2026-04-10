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
  region: '',
  accessKeyId: '',
  secretAccessKey: '',
  channelName: '',
  channelARN: '',
};

function loadConfig(): KvsConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        region: parsed.region || '',
        accessKeyId: parsed.accessKeyId || '',
        secretAccessKey: parsed.secretAccessKey || '',
        channelName: parsed.channelName || '',
        channelARN: parsed.channelARN || '',
      };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

interface KvsConfigFormProps {
  config: KvsConfig;
  onChange: (config: KvsConfig) => void;
  signedUrl?: string | null;
  onSignedUrlChange?: (url: string) => void;
  isConsumer?: boolean;
}

export const KvsConfigForm = ({ config, onChange, signedUrl, onSignedUrlChange, isConsumer = false }: KvsConfigFormProps) => {
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
            <Label className="text-xs">Region</Label>
            <Input
              className="h-7 text-xs"
              value={draft.region}
              onChange={(e) => setDraft((prev) => ({ ...prev, region: e.target.value }))}
              placeholder="us-east-1"
            />
          </div>
          {!isConsumer && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Access Key ID</Label>
                <Input
                  className="h-7 text-xs"
                  value={draft.accessKeyId}
                  onChange={(e) => setDraft((prev) => ({ ...prev, accessKeyId: e.target.value }))}
                  placeholder="AKIA..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secret Access Key</Label>
                <Input
                  className="h-7 text-xs"
                  type="password"
                  value={draft.secretAccessKey}
                  onChange={(e) => setDraft((prev) => ({ ...prev, secretAccessKey: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Channel Name</Label>
                <Input
                  className="h-7 text-xs"
                  value={draft.channelName}
                  onChange={(e) => setDraft((prev) => ({ ...prev, channelName: e.target.value }))}
                  placeholder="my-channel"
                />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Channel ARN</Label>
            <Input
              className="h-7 text-xs"
              value={draft.channelARN}
              onChange={(e) => setDraft((prev) => ({ ...prev, channelARN: e.target.value }))}
              placeholder="arn:aws:kinesisvideo:..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Signed URL</Label>
            <textarea
              readOnly={!isConsumer}
              className="w-full h-16 text-[10px] font-mono bg-muted border rounded p-1.5 resize-none break-all"
              value={signedUrl || ''}
              onChange={(e) => onSignedUrlChange?.(e.target.value)}
              placeholder={isConsumer ? "Paste signed WebSocket URL here..." : "Generated when streaming..."}
            />
          </div>
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
