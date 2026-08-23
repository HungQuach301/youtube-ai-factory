export const ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION = "ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1" as const;

const EXPLICIT_PAID_SUBSCRIPTION_TIERS = new Set([
  "starter",
  "creator",
  "pro",
  "scale",
  "business",
  "enterprise",
]);

export type ElevenLabsCommercialEntitlementState =
  | "PAID_SUBSCRIPTION_CONFIRMED"
  | "PAYG_BASE_PLAN_AMBIGUOUS"
  | "FREE_PLAN"
  | "SUBSCRIPTION_INACTIVE"
  | "UNKNOWN_SUBSCRIPTION_TIER";

export type ElevenLabsCommercialEntitlement = {
  version: typeof ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION;
  tier: string;
  status: string;
  state: ElevenLabsCommercialEntitlementState;
  commercialUseEligible: boolean;
};

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function evaluateElevenLabsCommercialEntitlement(
  subscription: Record<string, unknown>,
): ElevenLabsCommercialEntitlement {
  const tier = normalize(subscription.tier);
  const status = normalize(subscription.status);
  let state: ElevenLabsCommercialEntitlementState;

  if (status !== "active") state = "SUBSCRIPTION_INACTIVE";
  else if (EXPLICIT_PAID_SUBSCRIPTION_TIERS.has(tier)) state = "PAID_SUBSCRIPTION_CONFIRMED";
  else if (tier === "payg") state = "PAYG_BASE_PLAN_AMBIGUOUS";
  else if (tier === "free") state = "FREE_PLAN";
  else state = "UNKNOWN_SUBSCRIPTION_TIER";

  return {
    version: ELEVENLABS_COMMERCIAL_ENTITLEMENT_VERSION,
    tier,
    status,
    state,
    commercialUseEligible: state === "PAID_SUBSCRIPTION_CONFIRMED",
  };
}
