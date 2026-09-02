import postgres from "postgres";

type SqlValue = string | number | boolean | null | Date;

type QueryRunner = ReturnType<typeof postgres>;

export type WorkspaceStatement = {
  bind(...values: SqlValue[]): WorkspaceStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

export type WorkspaceDb = {
  prepare(query: string): WorkspaceStatement;
  batch<T = unknown>(statements: WorkspaceStatement[]): Promise<T[]>;
};

let client: QueryRunner | null = null;

function databaseUrl() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL. Add a Postgres database in Vercel and set DATABASE_URL.");
  }
  return url;
}

function sqlClient() {
  client ??= postgres(databaseUrl(), {
    max: 5,
    prepare: false,
  });
  return client;
}

function toPostgresQuery(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

class PostgresStatement implements WorkspaceStatement {
  private values: SqlValue[] = [];

  constructor(private readonly query: string) {}

  bind(...values: SqlValue[]) {
    this.values = values;
    return this;
  }

  async first<T = Record<string, unknown>>() {
    const rows = await this.execute<T>();
    return rows[0] ?? null;
  }

  async all<T = Record<string, unknown>>() {
    const rows = await this.execute<T>();
    return { results: rows };
  }

  async run() {
    return this.execute();
  }

  private async execute<T = Record<string, unknown>>() {
    const rows = await sqlClient().unsafe(toPostgresQuery(this.query), this.values);
    return rows as unknown as T[];
  }
}

export function getWorkspaceDb(): WorkspaceDb {
  return {
    prepare(query: string) {
      return new PostgresStatement(query);
    },
    async batch<T = unknown>(statements: WorkspaceStatement[]) {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results as T[];
    },
  };
}
