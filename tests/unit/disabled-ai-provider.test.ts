import { describe, expect, it } from "vitest";

import { previewProjectCreation } from "@consultant-ai-office/application";
import { createDisabledAIProvider } from "@consultant-ai-office/infrastructure";

describe("disabled AI provider boundary", () => {
  it("fails closed while deterministic non-AI use cases remain available", async () => {
    const provider = createDisabledAIProvider();

    await expect(
      provider.complete({ requestId: "ai-disabled", prompt: "create a project" }),
    ).resolves.toEqual({ state: "DISABLED", output: null });
    expect(provider.isEnabled()).toBe(false);

    expect(
      previewProjectCreation(
        {
          requestId: "human-preview",
          projectId: null,
          actor: {
            actorId: "technical-1",
            actorType: "HUMAN",
            actorRole: "TECHNICAL",
          },
        },
        { name: "Kantor Camat", code: "KC-01" },
      ),
    ).toMatchObject({ state: "PREVIEW" });
  });
});
