import {
  Dialect,
  Driver,
  QueryCompiler,
  SqliteQueryCompiler,
  DialectAdapter,
  SqliteAdapter,
  Kysely,
  DatabaseIntrospector,
  SqliteIntrospector,
} from "kysely";
import { ExpoSqliteConfig } from "./ExpoSqliteConfig";
import { ExpoSqliteDriver } from "./ExpoSqliteDriver";

export class ExpoSqliteDialect implements Dialect {
  readonly #config: ExpoSqliteConfig;

  constructor(config: ExpoSqliteConfig) {
    this.#config = config;
  }

  createDriver(): Driver {
    return new ExpoSqliteDriver(this.#config);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
