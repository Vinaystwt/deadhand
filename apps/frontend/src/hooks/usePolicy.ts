import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { policyApi, type Policy, type CreatePolicyInput } from "@/api/policy";

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: policyApi.list,
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: ["policies", id],
    queryFn: () => policyApi.get(id),
    enabled: !!id,
  });
}

export function usePolicyPresets() {
  return useQuery({
    queryKey: ["policy-presets"],
    queryFn: policyApi.listPresets,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreatePolicyInput>) => policyApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useUpdatePolicy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Policy>) => policyApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policies"] });
      qc.invalidateQueries({ queryKey: ["policies", id] });
    },
  });
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policyApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}
