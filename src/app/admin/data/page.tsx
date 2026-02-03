import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getDatabaseStats } from '@/lib/actions';

export const dynamic = 'force-dynamic';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  HardDrive,
  FileText,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface BackupItem {
  id: string;
  name: string;
  size: string;
  date: string;
  status: string;
}

async function DataContent() {
  const stats = await getDatabaseStats();
  
  // Mock backup data
  const recentBackups: BackupItem[] = [
    {
      id: '1',
      name: 'backup_2024_01_15.sql',
      size: '2.4 MB',
      date: '2024-01-15 10:30',
      status: 'completed'
    },
    {
      id: '2',
      name: 'backup_2024_01_14.sql',
      size: '2.3 MB',
      date: '2024-01-14 10:30',
      status: 'completed'
    },
    {
      id: '3',
      name: 'backup_2024_01_13.sql',
      size: '2.2 MB',
      date: '2024-01-13 10:30',
      status: 'completed'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bản ghi</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Trên tất cả các bảng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dung lượng DB</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15.2 MB</div>
            <p className="text-xs text-muted-foreground">
              +0.5 MB từ tuần trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup gần nhất</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hôm nay</div>
            <p className="text-xs text-muted-foreground">
              10:30 AM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trạng thái</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Tốt</div>
            <p className="text-xs text-muted-foreground">
              Hệ thống ổn định
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê bảng dữ liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.tables.map((table) => (
              <div key={table.table} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium capitalize">{table.table}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">
                    {table.count.toLocaleString()} bản ghi
                  </span>
                  <Progress 
                    value={(table.count / stats.totalRecords) * 100} 
                    className="w-20" 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backup Management */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quản lý Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Tạo Backup
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Khôi phục
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Backup tự động</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hàng ngày lúc 10:30 AM</span>
                <Badge variant="secondary">Đã bật</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBackups.map((backup: BackupItem) => (
                <div key={backup.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{backup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {backup.size} • {backup.date}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={backup.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {backup.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Bảo trì cơ sở dữ liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">Tối ưu hóa</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Tối ưu hóa hiệu suất cơ sở dữ liệu
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Chạy tối ưu hóa
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-green-500" />
                <h4 className="font-medium">Kiểm tra toàn vẹn</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Kiểm tra tính toàn vẹn dữ liệu
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Kiểm tra
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <HardDrive className="h-4 w-4 text-orange-500" />
                <h4 className="font-medium">Dọn dẹp</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Xóa dữ liệu tạm và log cũ
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Dọn dẹp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DataManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý dữ liệu</h1>
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>
      
      <Suspense fallback={<div>Đang tải...</div>}>
        <DataContent />
      </Suspense>
    </div>
  );
}