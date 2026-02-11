'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MigrationStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  averageConfidence: number;
  estimatedTimeRemaining: number;
}

export default function MigrationPage() {
  const [status, setStatus] = useState<MigrationStatus>({
    status: 'idle',
    total: 0,
    completed: 0,
    failed: 0,
    currentBatch: 0,
    totalBatches: 0,
    averageConfidence: 0,
    estimatedTimeRemaining: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startMigration = async () => {
    setIsLoading(true);
    setStatus(prev => ({ ...prev, status: 'running' }));
    addLog('Bắt đầu Smart Migration...');

    try {
      const response = await fetch('/api/admin/migrate-smart', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus({
          status: 'completed',
          total: data.result.total,
          completed: data.result.completed,
          failed: data.result.failed,
          currentBatch: data.result.totalBatches,
          totalBatches: data.result.totalBatches,
          averageConfidence: data.result.averageConfidence,
          estimatedTimeRemaining: 0,
        });
        addLog(`✅ Migration hoàn thành!`);
        addLog(`📊 ${data.result.completed}/${data.result.total} novels migrated`);
        addLog(`🎯 Average confidence: ${data.result.averageConfidence.toFixed(1)}%`);
        addLog(`⏱️ Duration: ${data.result.duration}`);
        toast.success('Migration hoàn thành!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, status: 'failed' }));
      addLog(`❌ Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Migration thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const progress = status.total > 0 ? (status.completed / status.total) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Migration</h1>
          <p className="text-muted-foreground mt-1">
            Nâng cấp truyện đang viết lên hệ thống Scalability 4 Phases
          </p>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Smart Migration</strong> chỉ analyze 6 chương quan trọng (1, 10, 50, và 3 chương gần nhất) 
          thay vì toàn bộ chương. Thời gian: 30 phút, chi phí: 5%, chất lượng: 90%.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Truyện Cần Migrate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{status.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Novels active &gt;20 chương
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiến Độ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {status.completed}/{status.total}
            </div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confidence TB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {status.averageConfidence.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mức độ tin cậy
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Điều Khiển Migration</CardTitle>
          <CardDescription>
            Chạy migration cho tất cả truyện đang viết dở
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={startMigration}
              disabled={isLoading || status.status === 'running'}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang Chạy...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Bắt Đầu Migration
                </>
              )}
            </Button>

            {status.status === 'completed' && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-5 w-5" />
                Hoàn Thành
              </div>
            )}

            {status.status === 'failed' && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="mr-2 h-5 w-5" />
                Thất Bại
              </div>
            )}
          </div>

          {status.status === 'running' && (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-sm">
                Đang xử lý batch {status.currentBatch}/{status.totalBatches}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <span className="text-gray-500">Chưa có logs...</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi Tiết Kỹ Thuật</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong className="text-purple-600">Strategy:</strong> Smart Selective
            </div>
            <div>
              <strong className="text-purple-600">Chapters per Novel:</strong> 6 (max)
            </div>
            <div>
              <strong className="text-purple-600">Estimated Time:</strong> 30 minutes
            </div>
            <div>
              <strong className="text-purple-600">Cost:</strong> ~5% of full migration
            </div>
            <div>
              <strong className="text-purple-600">Quality:</strong> 90%
            </div>
            <div>
              <strong className="text-purple-600">Batch Size:</strong> 5 novels
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <strong>Chapters Analyzed:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Chương 1: Setup & world building</li>
              <li>Chương 10: Early development</li>
              <li>Chương 50: Mid-point</li>
              <li>3 chương gần nhất: Current state</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
