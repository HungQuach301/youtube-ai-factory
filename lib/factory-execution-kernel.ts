export type RepairRoute =
  | "WAIT_PROVIDER"
  | "TARGETED_AI"
  | "DETERMINISTIC"
  | "PROVIDER_RECOVERY"
  | "REOPEN_UPSTREAM"
  | "HUMAN_REVIEW"
  | "NONE";

export type ProgressDimension = {
  label: string;
  completed: number;
  total: number;
  percent: number;
  evidence: string;
};

const boundedPercent = (completed: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 0;

export function classifyRepairRoute(input: {
  blocker: string;
  remainingBatches: number;
  remoteInflight: number;
}): { route: RepairRoute; requiresAI: boolean; reason: string } {
  const blocker = input.blocker.toUpperCase();
  if (input.remoteInflight > 0)
    return { route: "WAIT_PROVIDER", requiresAI: false, reason: "Provider requests must become terminal first." };
  if (input.remainingBatches > 0)
    return { route: "TARGETED_AI", requiresAI: true, reason: "Only missing immutable batches may be generated." };
  if (blocker.includes("VISUAL GRAMMAR") || blocker.includes("TAXONOMY") || blocker.includes("REPETITION"))
    return { route: "DETERMINISTIC", requiresAI: false, reason: "Normalize the frozen taxonomy and re-audit stored material." };
  if (blocker.includes("PROVIDER_") || blocker.includes("MAX_OUTPUT_TOKENS"))
    return { route: "PROVIDER_RECOVERY", requiresAI: true, reason: "Retry with a smaller adaptive work package." };
  if (blocker.includes("UPSTREAM") || blocker.includes("CONTRACT"))
    return { route: "REOPEN_UPSTREAM", requiresAI: false, reason: "Invalidate downstream work and repair the source contract." };
  if (!input.blocker)
    return { route: "NONE", requiresAI: false, reason: "No repair is required." };
  return { route: "HUMAN_REVIEW", requiresAI: false, reason: "The blocker needs adjudication before any new spend." };
}

export function buildProgressDimensions(input: {
  providerTerminal: number;
  providerTotal: number;
  materialStored: number;
  materialTotal: number;
  qualityPassed: number;
  qualityTotal: number;
}): ProgressDimension[] {
  return [
    {
      label: "Provider",
      completed: input.providerTerminal,
      total: input.providerTotal,
      percent: boundedPercent(input.providerTerminal, input.providerTotal),
      evidence: `${input.providerTerminal}/${input.providerTotal} requests terminal`,
    },
    {
      label: "Material",
      completed: input.materialStored,
      total: input.materialTotal,
      percent: boundedPercent(input.materialStored, input.materialTotal),
      evidence: `${input.materialStored}/${input.materialTotal} batches stored`,
    },
    {
      label: "Quality",
      completed: input.qualityPassed,
      total: input.qualityTotal,
      percent: boundedPercent(input.qualityPassed, input.qualityTotal),
      evidence: `${input.qualityPassed}/${input.qualityTotal} hard gates passed`,
    },
  ];
}
