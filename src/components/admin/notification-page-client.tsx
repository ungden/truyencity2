'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { NotificationForm } from './notification-form';

export function NotificationPageClient({ children }: { children: React.ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý thông báo</h1>
          <p className="text-muted-foreground">Gửi và quản lý thông báo đến người dùng</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Send size={16} className="mr-2" />
          Tạo thông báo mới
        </Button>
      </div>

      {children}

      <NotificationForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </>
  );
}