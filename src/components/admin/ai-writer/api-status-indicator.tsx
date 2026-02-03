'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Status = 'checking' | 'ok' | 'error';

export function ApiStatusIndicator() {
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('Đang kiểm tra kết nối...');

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/ai-writer/test-key');
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Kiểm tra thất bại');
        }

        setStatus('ok');
        setMessage(`Kết nối thành công! ${data.modelsCount} models khả dụng.`);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Lỗi không xác định');
      }
    };

    checkApiStatus();
  }, []);

  const getStatusContent = () => {
    switch (status) {
      case 'checking':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Đang kiểm tra',
          variant: 'secondary',
          tooltip: message,
        };
      case 'ok':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Kết nối tốt',
          variant: 'default',
          className: 'bg-green-100 text-green-800 border-green-200',
          tooltip: message,
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Lỗi kết nối',
          variant: 'destructive',
          tooltip: `Lỗi: ${message}. Vui lòng kiểm tra OPENROUTER_API_KEY và Supabase Edge Functions.`,
        };
    }
  };

  const { icon, text, variant, className, tooltip } = getStatusContent();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant as any} className={className}>
            <span className="mr-1">{icon}</span>
            {text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}