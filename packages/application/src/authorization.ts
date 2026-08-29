import type { ActorIdentity } from "@consultant-ai-office/domain";
import type { ActorRole } from "@consultant-ai-office/shared-contracts";

import { ApplicationError } from "./errors";

export class RoleAuthorizationPolicy {
  static assertAllowed(
    actor: ActorIdentity,
    allowedRoles: readonly ActorRole[],
    action: string,
  ): void {
    if (!allowedRoles.includes(actor.actorRole)) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Actor is not authorized for this action",
        { action },
      );
    }
  }
}
