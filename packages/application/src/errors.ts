export type ApplicationErrorCode =
  | "APPROVAL_MISMATCH"
  | "APPROVAL_REQUIRED"
  | "CONFLICT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "TRANSACTION_FAILED"
  | "VALIDATION_ERROR";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: ApplicationErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}
