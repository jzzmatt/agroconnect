export type CourseMutationCode =
  | "UNAUTHORIZED"
  | "COURSE_NOT_FOUND"
  | "COURSE_PUBLISHED"
  | "INVALID_STATE_TRANSITION"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "DEPENDENCY_ERROR"
  | "UNKNOWN_ERROR";

export interface CourseMutationSuccess<T> {
  success: true;
  data: T;
}

export interface CourseMutationFailure {
  success: false;
  code: CourseMutationCode;
  error: string;
}

export type CourseMutationResult<T> = CourseMutationSuccess<T> | CourseMutationFailure;

export class CoursePersistenceError extends Error {
  public readonly code: CourseMutationCode;
  public readonly cause?: unknown;

  constructor(code: CourseMutationCode, message: string, cause?: unknown) {
    super(message);
    this.name = "CoursePersistenceError";
    this.code = code;
    this.cause = cause;
  }
}

/** Safe Portuguese fallbacks. UI should prefer i18n mapped by `code`. */
export const COURSE_MUTATION_MESSAGES: Record<CourseMutationCode, string> = {
  UNAUTHORIZED: "Não tem permissão para alterar este curso.",
  COURSE_NOT_FOUND: "Curso não encontrado.",
  COURSE_PUBLISHED: "Um curso publicado não pode ser eliminado. Retire-o da publicação primeiro.",
  INVALID_STATE_TRANSITION: "Esta alteração de estado não é permitida.",
  VALIDATION_ERROR: "O curso não está pronto para publicação.",
  DATABASE_ERROR: "Não foi possível concluir a operação. Tente novamente.",
  DEPENDENCY_ERROR: "Não foi possível concluir a operação porque o curso ainda tem dependências.",
  UNKNOWN_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
};

export function mutationOk<T>(data: T): CourseMutationSuccess<T> {
  return { success: true, data };
}

export function mutationFail(code: CourseMutationCode, error?: string): CourseMutationFailure {
  return {
    success: false,
    code,
    error: error || COURSE_MUTATION_MESSAGES[code],
  };
}

export function logAcademyError(context: string, err: unknown): void {
  console.error(`[AgriAcademy] ${context}`, err);
  if (process.env.NODE_ENV === "development" && err instanceof Error) {
    if (err.stack) console.error(err.stack);
    if ("cause" in err && err.cause) console.error("[AgriAcademy] cause:", err.cause);
  }
}

export function toCourseMutationFailure(err: unknown, fallback: CourseMutationCode = "UNKNOWN_ERROR"): CourseMutationFailure {
  if (err instanceof CoursePersistenceError) {
    logAcademyError(err.code, err);
    return mutationFail(err.code, err.message);
  }

  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code || "");
    if (code === "AUTH_REQUIRED" || code === "PERMISSION_DENIED" || code === "ENTITLEMENT_REQUIRED" || code === "ROLE_REQUIRED" || code === "OWNERSHIP_REQUIRED") {
      logAcademyError("UNAUTHORIZED", err);
      return mutationFail("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }
    if (code === "23503") {
      logAcademyError("DEPENDENCY_ERROR", err);
      return mutationFail("DEPENDENCY_ERROR");
    }
  }

  logAcademyError(fallback, err);
  const message =
    process.env.NODE_ENV === "development" && err instanceof Error && err.message
      ? err.message
      : COURSE_MUTATION_MESSAGES[fallback];
  return mutationFail(fallback, message);
}
