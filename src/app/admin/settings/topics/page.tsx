'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TopicTable } from '../../../../components/admin/topics/topic-table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Genre = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number | null;
};

export default function AdminTopicsPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('genres')
          .select('*')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        setGenres(data || []);
        if (data && data.length > 0 && !selected) {
          setSelected(data[0].id);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Không thể tải danh sách thể loại');
        setGenres([]);
      }
    })();
    return () => { mounted = false; };
  }, [selected]);

  const current = useMemo(() => genres.find(g => g.id === selected) || null, [genres, selected]);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chủ đề theo thể loại</h1>
            <p className="text-muted-foreground">Quản lý Topic động — dùng trong lọc, tạo dự án AI, v.v.</p>
          </div>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Chọn thể loại</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Select value={selected} onValueChange={(v) => { setSelected(v); setRefreshKey(k => k + 1); }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Chọn thể loại" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{g.icon || '📚'}</span>
                      <span>{g.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {current && current.description && (
              <div className="text-sm text-muted-foreground">
                {current.description}
              </div>
            )}
            {current && (
              <Badge variant="secondary" className="ml-auto">
                ID: {current.id}
              </Badge>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <TopicTable
            genreId={selected}
            supabase={supabase}
            refreshKey={refreshKey}
            onRefreshed={() => {}}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Hãy chọn thể loại để quản lý Topic
          </div>
        )}
      </div>
    </AuthGuard>
  );
}