'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Key, Copy, Trash2, Plus, Eye, EyeOff, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showNewToken, setShowNewToken] = useState(true);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const res = await fetch('/api/user/api-tokens');
      const data = await res.json();
      if (data.tokens) {
        setTokens(data.tokens);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách token');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Vui lòng nhập tên cho token');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/user/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName }),
      });
      const data = await res.json();

      if (data.token) {
        setNewToken(data.token);
        setNewTokenName('');
        loadTokens();
        toast.success('Đã tạo token mới!');
      } else {
        toast.error(data.error || 'Không thể tạo token');
      }
    } catch (error) {
      toast.error('Lỗi khi tạo token');
    } finally {
      setCreating(false);
    }
  };

  const deleteToken = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa token này? Các kết nối đang sử dụng token sẽ bị ngắt.')) {
      return;
    }

    try {
      const res = await fetch('/api/user/api-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: id }),
      });

      if (res.ok) {
        setTokens(tokens.filter(t => t.id !== id));
        toast.success('Đã xóa token');
      } else {
        toast.error('Không thể xóa token');
      }
    } catch (error) {
      toast.error('Lỗi khi xóa token');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy vào clipboard');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            API Tokens
          </h1>
          <p className="text-muted-foreground">
            Tạo token để kết nối Claude Code CLI với tài khoản của bạn
          </p>
        </div>

        {/* New Token Display */}
        {newToken && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Token Mới Được Tạo
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                Hãy copy và lưu token này ngay! Bạn sẽ không thể xem lại sau khi đóng thông báo này.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded border font-mono text-sm break-all">
                  {showNewToken ? newToken : '••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewToken(!showNewToken)}
                >
                  {showNewToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(newToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewToken(null)}
              >
                Đã lưu, đóng thông báo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Token Form */}
        <Card>
          <CardHeader>
            <CardTitle>Tạo Token Mới</CardTitle>
            <CardDescription>
              Token cho phép Claude Code CLI truy cập vào dự án của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="tokenName" className="sr-only">Tên token</Label>
                <Input
                  id="tokenName"
                  placeholder="Ví dụ: Claude Code trên máy Mac"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createToken()}
                />
              </div>
              <Button onClick={createToken} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? 'Đang tạo...' : 'Tạo Token'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tokens List */}
        <Card>
          <CardHeader>
            <CardTitle>Tokens Đang Hoạt Động</CardTitle>
            <CardDescription>
              Quản lý các token đã tạo. Token hết hạn sau 1 năm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Đang tải...
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có token nào. Tạo token đầu tiên để bắt đầu.
              </div>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {token.name}
                        {isExpired(token.expires_at) && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            Hết hạn
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {token.prefix}••••••••
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Tạo: {formatDate(token.created_at)}
                        </span>
                        {token.last_used_at && (
                          <span>
                            Dùng lần cuối: {formatDate(token.last_used_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteToken(token.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Hướng Dẫn Sử Dụng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Cài đặt Claude Code CLI</h4>
              <code className="block p-3 bg-muted rounded text-sm">
                npm install -g @anthropic-ai/claude-code
              </code>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Cấu hình token trong file .claude/config.json</h4>
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`{
  "apiToken": "tc_your_token_here",
  "apiBaseUrl": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/external/claude-code"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Sử dụng các lệnh</h4>
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`# Xem danh sách dự án
curl -H "Authorization: Bearer tc_your_token" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/external/claude-code?action=projects"

# Lấy context để viết chương
curl -H "Authorization: Bearer tc_your_token" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/external/claude-code?action=context&projectId=xxx"

# Gửi chương đã viết
curl -X POST -H "Authorization: Bearer tc_your_token" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"submit_chapter","projectId":"xxx","content":"..."}' \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/external/claude-code"`}
              </pre>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Bảo mật:</strong> Không bao giờ chia sẻ token với người khác.
                  Token cho phép truy cập vào tất cả dự án của bạn.
                  Nếu nghi ngờ token bị lộ, hãy xóa và tạo token mới.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
