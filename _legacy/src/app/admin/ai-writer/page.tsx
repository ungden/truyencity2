import { AuthGuard } from '@/components/admin/auth-guard';
import { AIWriterDashboard } from '@/components/admin/ai-writer/dashboard';

export default function AIWriterPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Story Writer</h1>
          <p className="text-muted-foreground">
            Công cụ AI viết truyện tự động - Chỉ cần 1 click để tạo chương mới
          </p>
        </div>

        <AIWriterDashboard />
      </div>
    </AuthGuard>
  );
}