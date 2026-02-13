import { Header } from '@/components/header';

export const metadata = {
  title: 'Chinh sach bao mat',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <Header title="Chinh sach bao mat" showBack />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Chinh sach bao mat</h1>
        <p className="text-sm text-muted-foreground">Cap nhat lan cuoi: 2026-02-13</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Du lieu chung toi thu thap</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Chung toi thu thap thong tin tai khoan, thong tin su dung ung dung, va noi dung ban tu tao
            de van hanh tinh nang doc truyen, dong bo tu sach va ca nhan hoa trai nghiem.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Muc dich su dung du lieu</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Du lieu duoc su dung de xac thuc dang nhap, duy tri tai khoan, cai thien chat luong noi dung,
            va dam bao an toan he thong. Chung toi khong ban du lieu ca nhan cho ben thu ba.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Luu tru va bao mat</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Du lieu duoc luu tren ha tang dam may co kiem soat truy cap. Chung toi ap dung co che xac thuc,
            phan quyen va ghi nhat ky de giam thieu rui ro truy cap trai phep.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Quyen cua nguoi dung</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Ban co quyen yeu cau xem, chinh sua hoac xoa du lieu tai khoan. Vui long xem trang
            <a className="underline ml-1" href="/account-deletion">Xoa tai khoan</a>
            de gui yeu cau.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Lien he</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Neu ban can ho tro ve bao mat va du lieu, lien he: support@truyencity.com.
          </p>
        </section>
      </div>
    </div>
  );
}
