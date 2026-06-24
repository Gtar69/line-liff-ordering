/** 訂單建立的業務錯誤；對應 docs/API.md 的錯誤碼與 HTTP 狀態。 */
export type OrderErrorCode =
  | "VALIDATION_ERROR"
  | "EMPTY_CART"
  | "ITEM_UNAVAILABLE"
  | "INVALID_OPTION_SELECTION"
  | "INVALID_PICKUP_TIME"
  | "STORE_CLOSED"
  | "ORDER_LIMIT_EXCEEDED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface OrderErrorDetail {
  field: string;
  issue: string;
}

export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly status: number;
  readonly details?: OrderErrorDetail[];

  constructor(
    code: OrderErrorCode,
    status: number,
    message: string,
    details?: OrderErrorDetail[],
  ) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
