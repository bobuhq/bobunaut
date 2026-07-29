import {
  useState,
  type ReactNode,
} from "react";

import { useAdminSessionTimeout } from "../../core/admin/useAdminSessionTimeout";
import { useAuthSession } from "../../core/auth/useAuthSession";
import { AdminHeader } from "./components/AdminHeader";
import { AdminSidebar } from "./components/AdminSidebar";

type AdminLayoutProps = {
  role: string;
  children: ReactNode;
};

export function AdminLayout({
  role,
  children,
}: AdminLayoutProps) {
  const { session } = useAuthSession();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useAdminSessionTimeout();

  return (
    <div className="admin-layout">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="admin-layout__workspace">
        <AdminHeader
          role={role}
          email={session?.user.email ?? null}
          onMenuToggle={() =>
            setSidebarOpen(
              (current) => !current,
            )
          }
        />

        <main className="admin-layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}
