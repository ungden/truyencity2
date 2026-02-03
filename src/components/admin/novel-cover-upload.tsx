'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { updateNovelCover } from '@/lib/actions';

interface NovelCoverUploadProps {
  novelId: string;
  currentCoverUrl?: string | null;
}

export function NovelCoverUpload({ novelId, currentCoverUrl }: NovelCoverUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl || '');

  const handleUrlSubmit = async () => {
    if (!coverUrl.trim()) {
      toast.error('Vui lòng nhập URL ảnh bìa');
      return;
    }

    setIsUploading(true);
    try {
      const result = await updateNovelCover(novelId, coverUrl.trim());
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật ảnh bìa');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {currentCoverUrl ? (
          <div className="aspect-[3/4] relative overflow-hidden rounded-lg border">
            <img
              src={currentCoverUrl}
              alt="Ảnh bìa truyện"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
          </div>
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Chưa có ảnh bìa</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cover-url">URL ảnh bìa</Label>
          <Input
            id="cover-url"
            type="url"
            placeholder="https://example.com/cover.jpg"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
          <Button
            onClick={handleUrlSubmit}
            disabled={isUploading}
            size="sm"
            className="w-full"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Cập nhật ảnh bìa
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}