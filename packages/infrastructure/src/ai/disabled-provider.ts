import type {
  AICompletionRequest,
  AIProviderPort,
} from "@consultant-ai-office/shared-contracts";

export function createDisabledAIProvider(): AIProviderPort {
  return Object.freeze({
    isEnabled: () => false,
    complete: async (request: AICompletionRequest) => {
      void request;
      return { state: "DISABLED" as const, output: null };
    },
  });
}
