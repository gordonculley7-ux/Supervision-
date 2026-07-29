// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    // Schema is the same file the Node reference store uses — single source of truth.
    let migrations = vec![Migration {
        version: 1,
        description: "create_core_tables",
        sql: include_str!("../../../../packages/data/src/schema.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:supervision.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Supervision & CEU Tracker");
}
