import React, { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, Text, View } from "react-native";

import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  SqliteDialect,
  ColumnType,
} from "kysely";
import { ExpoSqliteDialect } from "./kysely-expo/ExpoSqliteDialect";
import * as Sqlite from "expo-sqlite";
import { ExpoMigrationProvider } from "./kysely-expo/ExpoMigrationProvider";
import * as FileSystem from "expo-file-system";

interface Database {
  language: {
    id: string;
    name: string;
    language_code: string;
    created_at: ColumnType<Date, string | undefined, never>;
  };
}

const dialect = new ExpoSqliteDialect({
  database: async () => {
    await FileSystem.deleteAsync(
      FileSystem.documentDirectory + "SQLite/database.db"
    );

    return Sqlite.openDatabase("database.db");
  },
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
  dialect,
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [runFlag, setRunFlag] = useState(0);

  useEffect(() => {
    async function doThings() {
      const migrator = new Migrator({
        db,
        provider: new ExpoMigrationProvider(
          require.context("./migrations", false, /\.ts$/)
        ),
      });

      const { error, results } = await migrator.migrateToLatest();

      results?.forEach((result) => {
        if (result.status === "Success") {
          console.log("successfully migrated", result.migrationName);
        } else {
          console.error("failed to migrate", result.migrationName);
        }
      });

      if (error) {
        console.error("failed to migrate", error);
      }

      setReady(true);
    }

    doThings();
  }, []);

  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    if (ready) {
      async function main() {
        const languages = await db.selectFrom("language").selectAll().execute();
        setLanguages(languages);
      }

      main();
    }
  }, [ready, runFlag]);

  async function onAddLanguage() {
    const insertId = await db
      .insertInto("language")
      .values({
        id: Date.now().toString(36),
        name: "English",
        language_code: "en",
        created_at: new Date().toISOString(),
      })
      .execute();

    console.log(insertId);

    setRunFlag(runFlag + 1);
  }

  return (
    <View style={styles.container}>
      <Text>{JSON.stringify(languages)}</Text>
      <Button title="Add Language" onPress={onAddLanguage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
