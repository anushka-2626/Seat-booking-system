"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { getCurrentEmployeeProfile } from "@/lib/auth";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      try {
        const { user, employee } = await getCurrentEmployeeProfile();
        if (!user || !employee || employee.role !== "admin") {
          router.replace("/");
          return;
        }
        if (!cancelled) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("Admin guard error", e);
        if (!cancelled) router.replace("/");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100">
        <div className="rounded-3xl bg-white/80 border border-white shadow-sm px-6 py-4 text-sm text-slate-700">
          Checking admin access…
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 flex flex-col">
      <AdminSidebar />
      <div className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10">
        <main className="rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

