use anyhow::{Context, Result};
use serde_json::Value;
use std::fs;
use std::path::Path;
use crate::git_operations::GitOperations;
use crate::models::*;

pub struct PackageManager;

impl PackageManager {
    pub fn get_project_info(project_path: &str) -> Result<ProjectInfo> {
        let project_settings_path = Path::new(project_path)
            .join("ProjectSettings")
            .join("ProjectVersion.txt");

        let packages_path = Path::new(project_path)
            .join("Packages")
            .join("manifest.json");

        // Get project name from path
        let project_name = Path::new(project_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Unknown Project")
            .to_string();

        // Get Unity version
        let unity_version = if project_settings_path.exists() {
            let content = fs::read_to_string(&project_settings_path)
                .context("Failed to read ProjectVersion.txt")?;

            content
                .lines()
                .find(|line| line.starts_with("m_EditorVersion:"))
                .and_then(|line| line.split(':').nth(1))
                .map(|version| version.trim().to_string())
        } else {
            None
        };

        // Get installed packages
        let packages = if packages_path.exists() {
            Self::parse_manifest(&packages_path)?
        } else {
            Vec::new()
        };

        Ok(ProjectInfo {
            path: project_path.to_string(),
            name: project_name,
            unity_version,
            packages,
        })
    }

    fn parse_manifest(manifest_path: &Path) -> Result<Vec<InstalledPackage>> {
        let content = fs::read_to_string(manifest_path)
            .context("Failed to read manifest.json")?;

        let manifest: Value = serde_json::from_str(&content)
            .context("Failed to parse manifest.json")?;

        let mut packages = Vec::new();
        let packages_dir = manifest_path.parent().unwrap(); // This should be the Packages directory

        if let Some(dependencies) = manifest.get("dependencies").and_then(|d| d.as_object()) {
            for (name, version_value) in dependencies {
                if let Some(version_str) = version_value.as_str() {
                    if version_str.starts_with("file:") {
                        // Local package - read version from package.json
                        let package_dir_name = version_str.strip_prefix("file:").unwrap_or("");
                        let package_dir = packages_dir.join(package_dir_name);
                        let package_json_path = package_dir.join("package.json");

                        let (actual_version, git_url) = if package_json_path.exists() {
                            match fs::read_to_string(&package_json_path) {
                                Ok(package_content) => {
                                    match serde_json::from_str::<Value>(&package_content) {
                                        Ok(package_data) => {
                                            let version = package_data.get("version")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("unknown")
                                                .to_string();

                                            // Try to get git URL from repository field
                                            let git_url = package_data.get("repository")
                                                .and_then(|r| r.get("url"))
                                                .and_then(|u| u.as_str())
                                                .unwrap_or("")
                                                .to_string();

                                            (version, git_url)
                                        }
                                        Err(_) => ("unknown".to_string(), String::new())
                                    }
                                }
                                Err(_) => ("unknown".to_string(), String::new())
                            }
                        } else {
                            ("local".to_string(), String::new())
                        };

                        packages.push(InstalledPackage {
                            name: name.clone(),
                            version: actual_version,
                            git_url,
                            installed_from_registry: None,
                        });
                    } else if version_str.starts_with("https://") || version_str.starts_with("git+") {
                        // Git URL (legacy format)
                        packages.push(InstalledPackage {
                            name: name.clone(),
                            version: "git".to_string(),
                            git_url: version_str.to_string(),
                            installed_from_registry: None,
                        });
                    } else {
                        // Regular version number (Unity Package Manager registry)
                        packages.push(InstalledPackage {
                            name: name.clone(),
                            version: version_str.to_string(),
                            git_url: String::new(),
                            installed_from_registry: None,
                        });
                    }
                }
            }
        }

        Ok(packages)
    }

    pub fn install_package(project_path: &str, package: &Package) -> Result<()> {
        let packages_dir = Path::new(project_path).join("Packages");
        let manifest_path = packages_dir.join("manifest.json");

        if !manifest_path.exists() {
            return Err(anyhow::anyhow!("Project manifest.json not found"));
        }

        // Read current manifest to check for conflicts
        let content = fs::read_to_string(&manifest_path)
            .context("Failed to read manifest.json")?;

        let mut manifest: Value = serde_json::from_str(&content)
            .context("Failed to parse manifest.json")?;

        // Ensure dependencies object exists
        if !manifest.get("dependencies").is_some() {
            manifest["dependencies"] = serde_json::json!({});
        }

        // Check if package already exists and handle conflicts
        let existing_entry_info = manifest.get("dependencies")
            .and_then(|d| d.get(&package.name))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if let Some(existing_ref) = &existing_entry_info {
            println!("Found existing package entry: {} -> {}", package.name, existing_ref);

            // If it's a Git URL, we need to remove it before installing our local version
            if existing_ref.starts_with("https://") || existing_ref.starts_with("git+") || existing_ref.contains(".git") {
                println!("Removing Unity-managed Git package to avoid conflicts: {}", existing_ref);
                // The package will be replaced with our local version below
            }
            // If it's already a local file reference, we'll replace it (upgrade/downgrade scenario)
            else if existing_ref.starts_with("file:") {
                let existing_package_dir_name = existing_ref.strip_prefix("file:").unwrap_or("");
                let existing_package_path = packages_dir.join(existing_package_dir_name);
                if existing_package_path.exists() {
                    println!("Removing existing local package directory for upgrade/downgrade: {}", existing_package_path.display());
                    fs::remove_dir_all(&existing_package_path)
                        .with_context(|| format!("Failed to remove existing package directory: {}", existing_package_path.display()))?;
                }
            }
        }

        // Create package directory name from package name (sanitize for filesystem)
        let package_dir_name = package.name.replace("/", "_").replace("\\", "_").replace(".", "_");
        let package_install_path = packages_dir.join(&package_dir_name);

        // Remove existing package directory if it exists (additional safety check)
        if package_install_path.exists() {
            println!("Removing existing package directory: {}", package_install_path.display());
            fs::remove_dir_all(&package_install_path)
                .with_context(|| format!("Failed to remove existing package directory: {}", package_install_path.display()))?;
        }

        // Clone the repository directly into the Packages folder
        println!("Cloning repository {} to {}", package.git_url, package_install_path.display());
        GitOperations::clone_repository(&package.git_url, &package_install_path)
            .with_context(|| format!("Failed to clone repository {} to {}", package.git_url, package_install_path.display()))?;

        // Checkout specific tag or branch if specified
        if let Some(tag) = &package.git_tag {
            println!("Checking out tag: {}", tag);

            // List available tags for debugging
            match GitOperations::list_available_tags(&package_install_path) {
                Ok(tags) => {
                    println!("Available tags: {:?}", tags);
                    if !tags.contains(tag) {
                        println!("Warning: Requested tag '{}' not found in available tags", tag);
                    }
                }
                Err(e) => println!("Could not list tags: {}", e),
            }

            GitOperations::checkout_tag(&package_install_path, tag)
                .with_context(|| format!("Failed to checkout tag: {}", tag))?;

            // Verify the checkout worked by reading the version again
            let version_after_checkout = GitOperations::get_current_version_from_package_json(&package_install_path)
                .unwrap_or_else(|_| "unknown".to_string());
            println!("Version after checkout: {}", version_after_checkout);
        } else if let Some(branch) = &package.git_branch {
            println!("Checking out branch: {}", branch);
            GitOperations::checkout_branch(&package_install_path, branch)
                .with_context(|| format!("Failed to checkout branch: {}", branch))?;

            // Verify the checkout worked
            let version_after_checkout = GitOperations::get_current_version_from_package_json(&package_install_path)
                .unwrap_or_else(|_| "unknown".to_string());
            println!("Version after checkout: {}", version_after_checkout);
        }

        // Read the package.json from the cloned repository to get actual version info
        // This should be done AFTER checkout to get the correct version
        let actual_version = GitOperations::get_current_version_from_package_json(&package_install_path)
            .unwrap_or_else(|e| {
                println!("Warning: Could not read version from package.json: {}", e);
                "unknown".to_string()
            });

        // Update manifest.json to reference the local folder (this replaces any existing entry)
        let local_path = format!("file:{}", package_dir_name);
        manifest["dependencies"][&package.name] = Value::String(local_path);

        // Write back to file
        let updated_content = serde_json::to_string_pretty(&manifest)
            .context("Failed to serialize manifest.json")?;

        fs::write(&manifest_path, updated_content)
            .context("Failed to write manifest.json")?;

        if let Some(existing_ref) = existing_entry_info {
            println!("Successfully replaced package {} (was: {}, now: file:{} version: {})",
                package.name, existing_ref, package_dir_name, actual_version);
        } else {
            println!("Successfully installed package {} (version: {}) to {}",
                package.name, actual_version, package_dir_name);
        }

        Ok(())
    }

    pub fn remove_package(project_path: &str, package_name: &str) -> Result<()> {
        let packages_dir = Path::new(project_path).join("Packages");
        let manifest_path = packages_dir.join("manifest.json");

        if !manifest_path.exists() {
            return Err(anyhow::anyhow!("Project manifest.json not found"));
        }

        let content = fs::read_to_string(&manifest_path)
            .context("Failed to read manifest.json")?;

        let mut manifest: Value = serde_json::from_str(&content)
            .context("Failed to parse manifest.json")?;

        // Remove package from dependencies and get the package path if it's local
        let mut package_dir_to_remove: Option<String> = None;
        if let Some(dependencies) = manifest.get_mut("dependencies").and_then(|d| d.as_object_mut()) {
            if let Some(package_ref) = dependencies.get(package_name) {
                if let Some(package_ref_str) = package_ref.as_str() {
                    // Check if it's a local file reference
                    if package_ref_str.starts_with("file:") {
                        package_dir_to_remove = Some(package_ref_str.strip_prefix("file:").unwrap_or("").to_string());
                    }
                }
            }
            dependencies.remove(package_name);
        }

        // Remove the local package directory if it exists
        if let Some(package_dir_name) = package_dir_to_remove {
            let package_path = packages_dir.join(&package_dir_name);
            if package_path.exists() {
                println!("Removing local package directory: {}", package_path.display());
                fs::remove_dir_all(&package_path)
                    .with_context(|| format!("Failed to remove package directory: {}", package_path.display()))?;
            }
        }

        // Write back to file
        let updated_content = serde_json::to_string_pretty(&manifest)
            .context("Failed to serialize manifest.json")?;

        fs::write(&manifest_path, updated_content)
            .context("Failed to write manifest.json")?;

        println!("Successfully removed package: {}", package_name);
        Ok(())
    }

    pub fn check_package_conflicts(project_path: &str, package_name: &str) -> Result<Option<String>> {
        let manifest_path = Path::new(project_path)
            .join("Packages")
            .join("manifest.json");

        if !manifest_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&manifest_path)
            .context("Failed to read manifest.json")?;

        let manifest: Value = serde_json::from_str(&content)
            .context("Failed to parse manifest.json")?;

        if let Some(dependencies) = manifest.get("dependencies").and_then(|d| d.as_object()) {
            if let Some(existing_ref) = dependencies.get(package_name).and_then(|v| v.as_str()) {
                return Ok(Some(existing_ref.to_string()));
            }
        }

        Ok(None)
    }

    pub fn get_installed_package_info(project_path: &str, package_name: &str) -> Result<Option<(String, String)>> {
        let packages_dir = Path::new(project_path).join("Packages");
        let manifest_path = packages_dir.join("manifest.json");

        if !manifest_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&manifest_path)
            .context("Failed to read manifest.json")?;

        let manifest: Value = serde_json::from_str(&content)
            .context("Failed to parse manifest.json")?;

        if let Some(dependencies) = manifest.get("dependencies").and_then(|d| d.as_object()) {
            if let Some(package_ref) = dependencies.get(package_name).and_then(|v| v.as_str()) {
                if package_ref.starts_with("file:") {
                    // Local package - read version from package.json
                    let package_dir_name = package_ref.strip_prefix("file:").unwrap_or("");
                    let package_dir = packages_dir.join(package_dir_name);
                    let package_json_path = package_dir.join("package.json");

                    if package_json_path.exists() {
                        let package_content = fs::read_to_string(&package_json_path)
                            .context("Failed to read package.json from local package")?;
                        let package_data: Value = serde_json::from_str(&package_content)
                            .context("Failed to parse package.json from local package")?;

                        let version = package_data.get("version")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string();

                        return Ok(Some((version, "local".to_string())));
                    } else {
                        return Ok(Some(("unknown".to_string(), "local".to_string())));
                    }
                } else if package_ref.starts_with("https://") || package_ref.starts_with("git+") || package_ref.contains(".git") {
                    // Git URL - extract version if available
                    let version = if let Some(hash_pos) = package_ref.find('#') {
                        package_ref[hash_pos + 1..].to_string()
                    } else {
                        "latest".to_string()
                    };
                    return Ok(Some((version, "git".to_string())));
                } else {
                    // Registry version
                    return Ok(Some((package_ref.to_string(), "registry".to_string())));
                }
            }
        }

        Ok(None)
    }
}
