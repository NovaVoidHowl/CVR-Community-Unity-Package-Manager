// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod package_manager;
mod git_operations;
mod config;

use commands::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            add_registry,
            remove_registry,
            add_project_path,
            remove_project_path,
            get_packages_from_registry,
            get_installed_packages,
            install_package,
            update_package,
            remove_package,
            get_project_info,
            get_system_theme,
            set_theme,
            show_open_dialog,
            check_package_conflicts,
            get_installed_package_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
