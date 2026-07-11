declare module "node:sqlite" {
  export type SQLInputValue = string | number | bigint | null | Uint8Array;

  export class StatementSync {
    run(...params: SQLInputValue[]): {
      lastInsertRowid: number | bigint;
      changes: number | bigint;
    };
    all<T = Record<string, unknown>>(...params: SQLInputValue[]): T[];
    get<T = Record<string, unknown>>(
      ...params: SQLInputValue[]
    ): T | undefined;
  }

  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
