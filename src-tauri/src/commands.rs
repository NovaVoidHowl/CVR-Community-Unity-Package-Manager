use tauri::command;
use uuid::Uuid;
use anyhow::Result;
use crate::models::*;
use crate::config::Config;
use crate::package_manager::PackageManager;

#[command]
pub async fn get_system_theme() -> Result<String, String> {
    // Try to detect system theme preference
    // This is a simplified version - in a full implementation,
    // you'd check Windows registry, macOS defaults, or Linux desktop environment

    #[cfg(target_os = "windows")]
    {
        // On Windows, we can check the registry for dark mode preference
        // For now, default to dark mode as placeholder
        Ok("dark".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, we could check defaults for dark mode
        Ok("dark".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, we could check desktop environment preferences
        Ok("dark".to_string())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok("dark".to_string())
    }
}

#[command]
pub async fn get_config() -> Result<AppConfig, String> {
    Config::load().map_err(|e| e.to_string())
}

#[command]
pub async fn save_config(config: AppConfig) -> Result<(), String> {
    Config::save(&config).map_err(|e| e.to_string())
}

#[command]
pub async fn add_registry(name: String, url: String) -> Result<Registry, String> {
    let registry = Registry {
        id: Uuid::new_v4().to_string(),
        name,
        url,
        enabled: true,
    };

    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.registries.push(registry.clone());
    Config::save(&config).map_err(|e| e.to_string())?;

    Ok(registry)
}

#[command]
pub async fn remove_registry(registry_id: String) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.registries.retain(|r| r.id != registry_id);
    Config::save(&config).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn add_project_path(path: String) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;

    if !config.project_paths.contains(&path) {
        config.project_paths.push(path);
        Config::save(&config).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[command]
pub async fn remove_project_path(path: String) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.project_paths.retain(|p| p != &path);

    // Clear selected project if it was removed
    if config.selected_project_path.as_ref() == Some(&path) {
        config.selected_project_path = None;
    }

    Config::save(&config).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn get_packages_from_registry(registry_url: String) -> Result<PackageRegistry, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&registry_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch registry: {}", e))?;

    let mut registry: PackageRegistry = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse registry JSON: {}", e))?;

    // Expand packages that have multiple versions into separate package entries
    let mut expanded_packages = Vec::new();

    for package in registry.packages {
        if let Some(versions) = &package.versions {
            // New format: package has multiple versions
            for version_info in versions {
                let expanded_package = Package {
                    name: package.name.clone(),
                    display_name: package.display_name.clone(),
                    description: package.description.clone(),
                    git_url: package.git_url.clone(),
                    author: package.author.clone(),
                    keywords: package.keywords.clone(),
                    category: package.category.clone(),
                    license: package.license.clone(),
                    versions: None, // Don't include versions in expanded format
                    // Use version-specific data
                    version: Some(version_info.version.clone()),
                    git_tag: version_info.git_tag.clone(),
                    git_branch: version_info.git_branch.clone(),
                    dependencies: version_info.dependencies.clone(),
                    unity_version: version_info.unity_version.clone(),
                    is_prerelease: version_info.is_prerelease,
                };
                expanded_packages.push(expanded_package);
            }
        } else {
            // Legacy format: single version package
            expanded_packages.push(package);
        }
    }

    registry.packages = expanded_packages;
    Ok(registry)
}

#[command]
pub async fn get_installed_packages(project_path: String) -> Result<Vec<InstalledPackage>, String> {
    let project_info = PackageManager::get_project_info(&project_path)
        .map_err(|e| e.to_string())?;

    Ok(project_info.packages)
}

#[command]
pub async fn install_package(project_path: String, package: Package) -> Result<(), String> {
    PackageManager::install_package(&project_path, &package)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_package(project_path: String, package: Package) -> Result<(), String> {
    // For updates, we can just reinstall the package
    PackageManager::install_package(&project_path, &package)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn remove_package(project_path: String, package_name: String) -> Result<(), String> {
    PackageManager::remove_package(&project_path, &package_name)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn check_package_conflicts(project_path: String, package_name: String) -> Result<Option<String>, String> {
    PackageManager::check_package_conflicts(&project_path, &package_name)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_installed_package_info(project_path: String, package_name: String) -> Result<Option<(String, String)>, String> {
    PackageManager::get_installed_package_info(&project_path, &package_name)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_project_info(project_path: String) -> Result<ProjectInfo, String> {
    PackageManager::get_project_info(&project_path)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn set_theme(theme: String) -> Result<(), String> {
    let mut config = Config::load().map_err(|e| e.to_string())?;
    config.theme = theme;
    Config::save(&config).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn show_open_dialog(options: serde_json::Value) -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;

    let dialog = FileDialogBuilder::new();

    // Configure dialog based on options
    let dialog = if options.get("directory").and_then(|v| v.as_bool()).unwrap_or(false) {
        dialog.pick_folder()
    } else {
        dialog.pick_file()
    };

    Ok(dialog.map(|path| path.to_string_lossy().to_string()))
}
