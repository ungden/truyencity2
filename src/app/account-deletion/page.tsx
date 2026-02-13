import { Header } from '@/components/header';

export const metadata = {
  title: 'Xoa tai khoan',
};

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <Header title="Xoa tai khoan" showBack />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Yeu cau xoa tai khoan</h1>
        <p className="text-sm text-muted-foreground">
          Ban co the yeu cau xoa tai khoan va du lieu lien quan bang cach gui email den support@truyencity.com.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Thong tin can cung cap</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Email dang ky tai khoan</li>
            <li>Tieu de email: "Yeu cau xoa tai khoan"</li>
            <li>Ly do (tuy chon)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Thoi gian xu ly</h2>
          <p className="text-sm text-muted-foreground">
            Yeu cau se duoc xu ly trong 7 ngay lam viec sau khi xac minh quyen so huu tai khoan.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Du lieu bi xoa</h2>
          <p className="text-sm text-muted-foreground">
            Tai khoan, thong tin ho so ca nhan, va du lieu doc truyen gan voi tai khoan se bi xoa theo chinh sach.
          </p>
        </section>
      </div>
    </div>
  );
}
