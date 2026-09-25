import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export type ErrorCode = keyof typeof ERROR_CODES;

// Service 层异常：承载业务校验错误码，页面据此提示具体原因。
export class ApprovalServiceError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ApprovalServiceError";
    this.code = code;
  }
}

// API / Repository 层异常：本机持久化失败时由仓储单独包装，
// 不与业务校验异常混在一个全局位置吞掉。
export class ApprovalRepositoryError extends Error {
  code: ErrorCode;
  cause?: unknown;
  constructor(code: ErrorCode, cause?: unknown) {
    super(ERROR_MESSAGES[code]);
    this.name = "ApprovalRepositoryError";
    this.code = code;
    this.cause = cause;
  }
}
