import { Migration, MigrationProvider } from "kysely";

export class ExpoMigrationProvider implements MigrationProvider {
  private context: __MetroModuleApi.RequireContext;

  constructor(context: __MetroModuleApi.RequireContext) {
    this.context = context;
  }

  getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {};

    for (const migration of this.context.keys()) {
      const module = this.context(migration);

      migrations[migration] = {
        up: module.default ? module.default : module.up,
        down: module.default ? () => Promise.resolve() : module.down,
      };
    }

    return Promise.resolve(migrations);
  }
}
