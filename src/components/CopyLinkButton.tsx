import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopyLinkButtonProps {
  /** Optional function to generate a custom share URL. Falls back to window.location.href */
  getShareUrl?: () => string;
}

export function CopyLinkButton({ getShareUrl }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleCopy = () => {
    const url = getShareUrl ? getShareUrl() : window.location.href;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      },
      (err: unknown) => {
        console.error('Failed to copy link:', err);
        toast.error('Could not copy the link to the clipboard');
      }
    );
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}>
      {copied ? (
        <>
          <Check className="size-4" />
          Copied!
        </>
      ) : (
        <>
          <Link className="size-4" />
          Copy Link
        </>
      )}
    </Button>
  );
}
