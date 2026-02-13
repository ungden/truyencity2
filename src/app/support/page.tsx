import { Header } from '@/components/header';

export const metadata = {
  title: 'Ho tro',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <Header title="Ho tro" showBack />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Ho tro nguoi dung</h1>
        <p className="text-sm text-muted-foreground">
          Neu ban gap loi, can ho tro tai khoan, hoac can tu van ve noi dung, vui long lien he:
        </p>

        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-sm"><span className="font-medium">Email:</span> support@truyencity.com</p>
          <p className="text-sm"><span className="font-medium">Thoi gian phan hoi:</span> 24-72 gio lam viec</p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground leading-6">
          <p>
            Khi gui yeu cau, vui long dinh kem thong tin tai khoan va mo ta loi cu the (thoi diem, thiet bi,
            trinh duyet/phien ban app) de doi ngu ho tro xu ly nhanh hon.
          </p>
        </div>
      </div>
    </div>
  );
}
