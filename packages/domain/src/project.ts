export interface ProjectDraftInput {
  readonly name: string;
  readonly code: string;
}

export interface ProjectDraft {
  readonly name: string;
  readonly code: string;
}

export interface Project extends ProjectDraft {
  readonly projectId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface ProjectMembership {
  readonly projectId: string;
  readonly actorId: string;
  readonly actorRole: "TECHNICAL" | "ADMIN";
  readonly grantedAt: Date;
}

export interface ActiveProjectContext {
  readonly actorId: string;
  readonly actorRole: "TECHNICAL" | "ADMIN";
  readonly projectId: string;
  readonly selectedAt: Date;
}

export class DomainValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super("Project input is invalid");
    this.name = "DomainValidationError";
    this.issues = issues;
  }
}

export function createProjectDraft(input: ProjectDraftInput): ProjectDraft {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const issues: string[] = [];

  if (name.length < 3 || name.length > 120) {
    issues.push("Project name must contain 3 to 120 characters");
  }

  if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(code)) {
    issues.push(
      "Project code must contain 2 to 20 uppercase letters, numbers, or hyphens",
    );
  }

  if (issues.length > 0) {
    throw new DomainValidationError(issues);
  }

  return Object.freeze({ name, code });
}
