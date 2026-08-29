import type {
  ActorIdentity,
  ProjectDraft,
  RequestContext,
} from "@consultant-ai-office/domain";

import { ApplicationError } from "./errors";

export interface HumanConfirmation {
  readonly confirmationId: string;
  readonly confirmedBy: ActorIdentity;
  readonly previewFingerprint: string;
  readonly confirmedAt: Date;
}

export type WriteInitiation =
  | { readonly kind: "HUMAN_DIRECT" }
  | {
      readonly kind: "AI_INITIATED";
      readonly confirmation?: HumanConfirmation;
    };

export function projectPreviewFingerprint(project: ProjectDraft): string {
  return `project.create|${project.code}|${project.name}`;
}

export function assertWriteApproved(
  context: RequestContext,
  project: ProjectDraft,
  initiation: WriteInitiation,
): string | null {
  if (initiation.kind === "HUMAN_DIRECT") {
    if (context.actor.actorType !== "HUMAN") {
      throw new ApplicationError(
        "APPROVAL_REQUIRED",
        "Only a human actor may use the direct write path",
      );
    }
    return null;
  }

  const confirmation = initiation.confirmation;
  if (!confirmation || confirmation.confirmedBy.actorType !== "HUMAN") {
    throw new ApplicationError(
      "APPROVAL_REQUIRED",
      "AI initiated writes require explicit human confirmation",
    );
  }

  if (
    confirmation.confirmationId.trim().length === 0 ||
    confirmation.confirmedBy.actorId.trim().length === 0 ||
    Number.isNaN(confirmation.confirmedAt.getTime())
  ) {
    throw new ApplicationError(
      "APPROVAL_MISMATCH",
      "Human confirmation metadata is invalid",
    );
  }

  if (context.actor.actorType !== "AI_AGENT") {
    throw new ApplicationError(
      "APPROVAL_MISMATCH",
      "AI initiation requires an AI agent execution actor",
    );
  }

  if (confirmation.previewFingerprint !== projectPreviewFingerprint(project)) {
    throw new ApplicationError(
      "APPROVAL_MISMATCH",
      "Human confirmation does not match the normalized preview",
    );
  }

  if (confirmation.confirmedBy.actorRole !== context.actor.actorRole) {
    throw new ApplicationError(
      "APPROVAL_MISMATCH",
      "Human confirmer role does not match the initiating actor role",
    );
  }

  return confirmation.confirmationId;
}
