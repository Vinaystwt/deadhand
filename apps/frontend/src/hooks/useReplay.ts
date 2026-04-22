import { useQuery } from "@tanstack/react-query";
import { taskApi } from "@/api/task";

export function useReplay(taskId: string) {
  return useQuery({
    queryKey: ["replay", taskId],
    queryFn: () => taskApi.replay(taskId),
    enabled: !!taskId,
    staleTime: 30_000,
  });
}
