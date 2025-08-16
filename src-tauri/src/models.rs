use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub registries: Vec<Registry>,
    pub project_paths: Vec<String>,
    pub selected_project_path: Option<String>,
    pub theme: String, // "dark", "light", "auto"
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            registries: Vec::new(),
            project_paths: Vec::new(),
            selected_project_path: None,
            theme: "dark".to_string(), // Default to dark mode
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Registry {
    pub id: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageVersion {
    pub version: String,
    pub git_tag: Option<String>,
    pub git_branch: Option<String>,
    #[serde(default)]
    pub is_prerelease: bool,
    pub unity_version: Option<String>,
    pub dependencies: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Package {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub git_url: String,
    pub author: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub category: Option<String>,
    pub license: Option<String>,
    // Support both new and legacy formats
    pub versions: Option<Vec<PackageVersion>>,
    // Legacy fields for backward compatibility
    pub version: Option<String>,
    pub git_branch: Option<String>,
    pub git_tag: Option<String>,
    pub dependencies: Option<HashMap<String, String>>,
    pub unity_version: Option<String>,
    #[serde(default)]
    pub is_prerelease: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageRegistry {
    pub name: String,
    pub description: Option<String>,
    pub packages: Vec<Package>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPackage {
    pub name: String,
    pub version: String,
    pub git_url: String,
    pub installed_from_registry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub path: String,
    pub name: String,
    pub unity_version: Option<String>,
    pub packages: Vec<InstalledPackage>,
}
