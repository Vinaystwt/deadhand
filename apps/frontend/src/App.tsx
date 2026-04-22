import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ToastContainer } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { Landing } from "@/pages/Landing";
import { Dashboard } from "@/pages/app/Dashboard";
import { PoliciesPage } from "@/pages/app/PoliciesPage";
import { PolicyDetailPage } from "@/pages/app/PolicyDetailPage";
import { TasksPage } from "@/pages/app/TasksPage";
import { TaskDetailPage } from "@/pages/app/TaskDetailPage";
import { ReplayPage } from "@/pages/app/ReplayPage";
import { AuditPage } from "@/pages/app/AuditPage";
import { DemoPage } from "@/pages/app/DemoPage";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="policies" element={<PoliciesPage />} />
            <Route path="policies/:id" element={<PolicyDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="replay" element={<ReplayPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="demo" element={<DemoPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
