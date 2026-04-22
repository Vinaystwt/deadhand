import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/api/task";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: taskApi.list,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => taskApi.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "PENDING" || status === "NEEDS_CLARIFICATION" || status === "ACTIVE") {
        return 3000;
      }
      return false;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, goal }: { policyId: string; goal: string }) =>
      taskApi.create(policyId, goal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useClarifyTask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answer: string) => taskApi.clarify(taskId, answer),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", taskId] }),
  });
}

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => taskApi.cancel(taskId),
    onSuccess: (_data, taskId) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}

export function useApproveAction(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => taskApi.approveAction(taskId, actionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", taskId] }),
  });
}

export function useRejectAction(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => taskApi.rejectAction(taskId, actionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", taskId] }),
  });
}

export function useExecuteAction(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actionId,
      options,
    }: {
      actionId: string;
      options: { signedPayload?: string; useDemoWallet?: boolean };
    }) => taskApi.executeAction(taskId, actionId, options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}
