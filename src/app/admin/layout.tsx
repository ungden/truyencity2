import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {/* Add padding for mobile header and bottom nav */}
        <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6 pb-20 lg:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}
