import { useMutation, useQueryClient } from "@tanstack/react-query";
import { emergencyApi } from "@/api/emergency";
import { useEmergencyStore } from "@/store/emergencyStore";

export function useEmergencyStop() {
  const qc = useQueryClient();
  const setStopped = useEmergencyStore((s) => s.setStopped);

  return useMutation({
    mutationFn: emergencyApi.stop,
    onSuccess: () => {
      setStopped(true);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useEmergencyResume() {
  const qc = useQueryClient();
  const setStopped = useEmergencyStore((s) => s.setStopped);

  return useMutation({
    mutationFn: emergencyApi.resume,
    onSuccess: () => {
      setStopped(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
