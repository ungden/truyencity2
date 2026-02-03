import { AuthGuard } from '@/components/admin/auth-guard';
import { StoryInspirationDashboard } from '@/components/admin/story-inspiration/dashboard';

export default function StoryInspirationPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Story Inspiration</h1>
          <p className="text-muted-foreground">
            Import truyện hot, AI phân tích và tạo kịch bản mới inspired từ nguồn
          </p>
        </div>

        <StoryInspirationDashboard />
      </div>
    </AuthGuard>
  );
}
