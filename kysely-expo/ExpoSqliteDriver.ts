import { WebSQLDatabase } from "expo-sqlite";
import { Driver, DatabaseConnection, CompiledQuery, QueryResult } from "kysely";
import { ExpoSqliteConfig } from "./ExpoSqliteConfig";

export class ExpoSqliteDriver implements Driver {
  readonly #config: ExpoSqliteConfig;
  readonly #connectionMutex = new ConnectionMutex();

  #db?: WebSQLDatabase;
  #connection?: DatabaseConnection;

  constructor(config: ExpoSqliteConfig) {
    this.#config = config;
  }

  async init(): Promise<void> {
    this.#db =
      typeof this.#config.database === "function"
        ? await this.#config.database()
        : this.#config.database;

    this.#connection = new SqliteConnection(this.#db);

    if (this.#config.onCreateConnection) {
      await this.#config.onCreateConnection(this.#connection);
    }
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    // SQLite only has one single connection. We use a mutex here to wait
    // until the single connection has been released.
    await this.#connectionMutex.lock();
    return this.#connection!;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("begin"));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("commit"));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("rollback"));
  }

  async releaseConnection(): Promise<void> {
    this.#connectionMutex.unlock();
  }

  async destroy(): Promise<void> {
    this.#db?.closeAsync();
  }
}

class SqliteConnection implements DatabaseConnection {
  readonly #db: WebSQLDatabase;

  constructor(db: WebSQLDatabase) {
    this.#db = db;
  }

  executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const { sql, parameters } = compiledQuery;

    return new Promise((resolve, reject) => {
      this.#db.transaction((tx) => {
        tx.executeSql(
          sql,
          parameters as (string | number)[],
          (tx, results) => {
            const rows = [];

            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }

            resolve({
              rows,
              numAffectedRows: BigInt(results.rowsAffected),
              insertId: results.insertId ? BigInt(results.insertId) : undefined,
            });
          },
          (tx, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("Sqlite driver doesn't support streaming");
  }
}

class ConnectionMutex {
  #promise?: Promise<void>;
  #resolve?: () => void;

  async lock(): Promise<void> {
    while (this.#promise) {
      await this.#promise;
    }

    this.#promise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  unlock(): void {
    const resolve = this.#resolve;

    this.#promise = undefined;
    this.#resolve = undefined;

    resolve?.();
  }
}
