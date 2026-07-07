export type ApiScope =
  | "balances:read"
  | "ledger:credit"
  | "ledger:debit"
  | "ledger:hold"
  | "ledger:void";

export type ApiClient = {
  id: string;
  name: string;
  scopes: ApiScope[];
};

export type ApiSuccess<T> = {
  data: T;
  ok: true;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
};
