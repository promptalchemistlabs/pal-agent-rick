/**
 * Optional OpenAI Agents SDK advisory boundary. Rick's deterministic policy is
 * always authoritative: the model may clarify reasons or add conditions, but it
 * cannot make the decision less restrictive.
 */
export function createOpenAIAgentsSdkBoundary({ runner, agent }) {
  if (typeof runner !== "function") throw new TypeError("runner must be a function");

  return {
    mode: "openai-agents-sdk",
    async advise({ action, deterministicDecision }) {
      const response = await runner(agent, JSON.stringify({
        business: "Tembusu Circle",
        action,
        policyDecision: deterministicDecision,
        instruction: "Return JSON with optional reasons[] and conditions[]. Never relax policyDecision.outcome.",
      }));
      const output = response?.finalOutput ?? response ?? {};
      const candidate = typeof output === "string" ? JSON.parse(output) : output;
      return {
        ...deterministicDecision,
        reasons: stringArray(candidate.reasons, deterministicDecision.reasons),
        conditions: stringArray(candidate.conditions, deterministicDecision.conditions),
      };
    },
  };
}

function stringArray(value, fallback) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}
