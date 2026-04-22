import { Navigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { EmergencyBanner } from "@/components/emergency/EmergencyBanner";
import { useAuthStore } from "@/store/authStore";
import { useEmergencyStore } from "@/store/emergencyStore";
import { emergencyApi } from "@/api/emergency";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { useEffect, useState } from "react";

export function AppShell() {
  const { isAuthenticated } = useAuthStore();
  const { setStopped } = useEmergencyStore();
  const toast = useToast();
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;

    emergencyApi
      .status()
      .then((status) => {
        if (!mounted) return;
        setStopped(status.emergencyStopped);
      })
      .catch(() => {
        // Keep the last-known local state if the status probe fails.
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, setStopped]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleResume() {
    setResuming(true);
    try {
      await emergencyApi.resume();
      setStopped(false);
      toast.success("Operations resumed.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResuming(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-bg overflow-hidden">
      <EmergencyBanner onResume={handleResume} resuming={resuming} />
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key="app-content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
