use anyhow::{Context, Result};
use serde_json;
use std::fs;
use std::path::PathBuf;
use crate::models::AppConfig;

pub struct Config;

impl Config {
    pub fn get_config_path() -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .context("Failed to get config directory")?
            .join("cvr-unity-package-manager");

        if !config_dir.exists() {
            fs::create_dir_all(&config_dir)
                .context("Failed to create config directory")?;
        }

        Ok(config_dir.join("config.json"))
    }

    pub fn load() -> Result<AppConfig> {
        let config_path = Self::get_config_path()?;

        if !config_path.exists() {
            // Return default config if file doesn't exist
            return Ok(AppConfig::default());
        }

        let content = fs::read_to_string(&config_path)
            .context("Failed to read config file")?;

        let config: AppConfig = serde_json::from_str(&content)
            .context("Failed to parse config file")?;

        Ok(config)
    }

    pub fn save(config: &AppConfig) -> Result<()> {
        let config_path = Self::get_config_path()?;

        let content = serde_json::to_string_pretty(config)
            .context("Failed to serialize config")?;

        fs::write(&config_path, content)
            .context("Failed to write config file")?;

        Ok(())
    }
}
