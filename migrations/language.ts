import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("language")
    .addColumn("id", "varchar", (col) => col.primaryKey())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("language_code", "varchar")
    .addColumn("created_at", "timestamp")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  //   await db.schema.dropTable("language").execute();
}
