import { Header } from '@/components/header';

export const metadata = {
  title: 'Dieu khoan su dung',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <Header title="Dieu khoan" showBack />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Dieu khoan su dung</h1>
        <p className="text-sm text-muted-foreground">Cap nhat lan cuoi: 2026-02-13</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Chap nhan dieu khoan</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Khi su dung TruyenCity, ban dong y tuan thu cac dieu khoan nay va cac chinh sach lien quan.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Tai khoan va trach nhiem</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Ban chiu trach nhiem bao mat tai khoan, thong tin dang nhap, va noi dung do ban dang tai.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Noi dung va ban quyen</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Ban cam ket khong dang noi dung vi pham phap luat, xam pham ban quyen, hoac gay hai cho cong dong.
            Chung toi co quyen han che hoac go bo noi dung vi pham.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Gioi han trach nhiem</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Dich vu duoc cung cap theo nguyen tac kha dung va co the thay doi theo nhu cau van hanh.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Lien he</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Ho tro: support@truyencity.com.
          </p>
        </section>
      </div>
    </div>
  );
}
