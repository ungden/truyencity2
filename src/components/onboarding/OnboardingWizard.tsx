'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, BookOpen, Sparkles, Rocket, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

interface OnboardingData {
  novelTitle: string;
  genre: string;
  mainCharacter: string;
  worldDescription: string;
  writingStyle: string;
  targetLength: number;
}

const GENRES = [
  { value: 'tien_hiep', label: 'Tiên Hiệp', description: 'Tu tiên, cảnh giới, phi thăng' },
  { value: 'huyen_huyen', label: 'Huyền Huyễn', description: 'Phép thuật, thế giới khác' },
  { value: 'do_thi', label: 'Đô Thị', description: 'Cuộc sống hiện đại, kinh doanh' },
  { value: 'khoa_huyen', label: 'Khoa Huyễn', description: 'Khoa học viễn tưởng, vũ trụ' },
  { value: 'lich_su', label: 'Lịch Sử', description: 'Cổ đại, cung đình, chiến tranh' },
  { value: 'dong_nhan', label: 'Đồng Nhân', description: 'Fanfiction, crossover' },
  { value: 'vong_du', label: 'Võng Du', description: 'Game, thế giới ảo' },
];

const WRITING_STYLES = [
  { value: 'sinh_dong', label: 'Sinh động, hấp dẫn' },
  { value: 'trang_nghiem', label: 'Trang nghiêm, cổ điển' },
  { value: 'hai_huoc', label: 'Hài hước, nhẹ nhàng' },
  { value: 'cang_thang', label: 'Căng thẳng, kịch tính' },
  { value: 'lang_man', label: 'Lãng mạn, sâu lắng' },
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    novelTitle: '',
    genre: '',
    mainCharacter: '',
    worldDescription: '',
    writingStyle: 'sinh_dong',
    targetLength: 2500,
  });

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const updateData = (field: keyof OnboardingData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return true; // Welcome step
      case 1:
        return data.novelTitle.length >= 2 && data.genre;
      case 2:
        return data.mainCharacter.length >= 2;
      case 3:
        return true; // Settings step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Chào mừng đến với TruyenCity AI</h2>
              <p className="text-muted-foreground">
                Nền tảng viết truyện tự động bằng AI hàng đầu Việt Nam.
                Hãy để chúng tôi giúp bạn tạo dự án đầu tiên!
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-muted rounded-lg">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-medium">7 thể loại</p>
                <p className="text-xs text-muted-foreground">Đa dạng phong cách</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm font-medium">AI thông minh</p>
                <p className="text-xs text-muted-foreground">Viết tự động</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Rocket className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                <p className="text-sm font-medium">3 chương/ngày</p>
                <p className="text-xs text-muted-foreground">Miễn phí</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Bắt đầu với truyện của bạn</h2>
              <p className="text-muted-foreground text-sm">
                Đặt tên và chọn thể loại cho dự án
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tên truyện *</Label>
                <Input
                  id="title"
                  placeholder="VD: Ta Là Đại Đế Bất Tử"
                  value={data.novelTitle}
                  onChange={(e) => updateData('novelTitle', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Thể loại *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre.value}
                      type="button"
                      onClick={() => updateData('genre', genre.value)}
                      className={`p-3 text-left rounded-lg border transition-colors ${
                        data.genre === genre.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-sm">{genre.label}</p>
                      <p className="text-xs text-muted-foreground">{genre.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Nhân vật và thế giới</h2>
              <p className="text-muted-foreground text-sm">
                Mô tả nhân vật chính và bối cảnh truyện
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mainChar">Nhân vật chính *</Label>
                <Input
                  id="mainChar"
                  placeholder="VD: Lâm Phong, 18 tuổi, thiên tài tu luyện"
                  value={data.mainCharacter}
                  onChange={(e) => updateData('mainCharacter', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mô tả ngắn gọn về tên, tuổi, đặc điểm nổi bật
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="world">Mô tả thế giới (tùy chọn)</Label>
                <Textarea
                  id="world"
                  placeholder="VD: Thế giới tu tiên với 9 cảnh giới, các tông môn tranh đấu..."
                  value={data.worldDescription}
                  onChange={(e) => updateData('worldDescription', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Hệ thống sức mạnh, bối cảnh, quy tắc đặc biệt
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Tùy chỉnh viết</h2>
              <p className="text-muted-foreground text-sm">
                Điều chỉnh phong cách và độ dài chương
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phong cách viết</Label>
                <Select
                  value={data.writingStyle}
                  onValueChange={(value) => updateData('writingStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WRITING_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Độ dài mỗi chương: {data.targetLength} từ</Label>
                <input
                  type="range"
                  min="1500"
                  max="5000"
                  step="500"
                  value={data.targetLength}
                  onChange={(e) => updateData('targetLength', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1500 từ</span>
                  <span>2500 (khuyến nghị)</span>
                  <span>5000 từ</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Sẵn sàng tạo dự án!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Bạn có thể thay đổi các cài đặt này sau trong phần quản lý dự án.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Thiết lập dự án</CardTitle>
            <CardDescription>Bước {step + 1} / {totalSteps}</CardDescription>
          </div>
          {onSkip && step === 0 && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Bỏ qua
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-1 mt-2" />
      </CardHeader>

      <CardContent className="pt-4">
        {renderStep()}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {step === totalSteps - 1 ? (
              <>
                Tạo dự án
                <Rocket className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Tiếp tục
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default OnboardingWizard;
