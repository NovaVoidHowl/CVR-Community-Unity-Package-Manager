use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

pub struct GitOperations;

impl GitOperations {
    pub fn clone_repository(url: &str, path: &Path) -> Result<()> {
        println!("Cloning repository {} to {}", url, path.display());

        // Simple clone first
        let repo = Repository::clone(url, path)
            .with_context(|| format!("Failed to clone repository from {}", url))?;

        println!("Successfully cloned repository");

        // Fetch all tags explicitly
        println!("Fetching all tags...");
        let mut remote = repo.find_remote("origin")
            .context("Failed to find origin remote after clone")?;

        remote.fetch(&["+refs/tags/*:refs/tags/*"], None, None)
            .context("Failed to fetch tags")?;

        println!("Successfully fetched tags");

        Ok(())
    }

    pub fn checkout_tag(path: &Path, tag: &str) -> Result<()> {
        let repo = Repository::open(path)
            .context("Failed to open repository")?;

        println!("Attempting to checkout tag: {}", tag);

        // First, try to find the tag reference
        let tag_ref_result = repo.find_reference(&format!("refs/tags/{}", tag));

        if let Err(_) = tag_ref_result {
            // Tag not found locally, try to fetch all refs from origin
            println!("Tag not found locally, fetching from origin...");
            let mut remote = repo.find_remote("origin")
                .context("Failed to find origin remote")?;

            // Fetch all refs including tags
            remote.fetch(&["+refs/*:refs/*"], None, None)
                .context("Failed to fetch all refs from remote")?;

            println!("Fetched refs from origin, retrying tag checkout...");
        }

        // Try to find the tag reference again
        let tag_ref = repo.find_reference(&format!("refs/tags/{}", tag))
            .with_context(|| format!("Failed to find tag '{}' even after fetching. Available tags may not include this version.", tag))?;

        let tag_commit = tag_ref.peel_to_commit()
            .context("Failed to get commit from tag")?;

        println!("Found tag {}, commit: {}", tag, tag_commit.id());

        // Checkout the tag (detached HEAD)
        repo.set_head_detached(tag_commit.id())
            .context("Failed to checkout tag")?;

        // Reset the working directory to match the commit exactly
        repo.reset(&tag_commit.as_object(), git2::ResetType::Hard, None)
            .context("Failed to reset working directory to tag")?;

        println!("Successfully checked out tag: {}", tag);
        Ok(())
    }

    pub fn checkout_branch(path: &Path, branch: &str) -> Result<()> {
        let repo = Repository::open(path)
            .context("Failed to open repository")?;

        println!("Attempting to checkout branch: {}", branch);

        // First try to find the remote branch reference
        let branch_ref_result = repo.find_reference(&format!("refs/remotes/origin/{}", branch));

        if let Err(_) = branch_ref_result {
            // Branch not found locally, try to fetch from origin
            println!("Branch not found locally, fetching from origin...");
            let mut remote = repo.find_remote("origin")
                .context("Failed to find origin remote")?;

            remote.fetch(&["+refs/heads/*:refs/remotes/origin/*"], None, None)
                .context("Failed to fetch branches from remote")?;

            println!("Fetched branches from origin, retrying branch checkout...");
        }

        let branch_ref = repo.find_reference(&format!("refs/remotes/origin/{}", branch))
            .with_context(|| format!("Failed to find branch '{}' even after fetching", branch))?;

        let branch_commit = branch_ref.peel_to_commit()
            .context("Failed to get commit from branch")?;

        println!("Found branch {}, commit: {}", branch, branch_commit.id());

        // Checkout the branch (detached HEAD)
        repo.set_head_detached(branch_commit.id())
            .context("Failed to checkout branch")?;

        // Reset the working directory to match the commit exactly
        repo.reset(&branch_commit.as_object(), git2::ResetType::Hard, None)
            .context("Failed to reset working directory to branch")?;

        println!("Successfully checked out branch: {}", branch);
        Ok(())
    }

    pub fn list_available_tags(path: &Path) -> Result<Vec<String>> {
        let repo = Repository::open(path)
            .context("Failed to open repository")?;

        let mut tags = Vec::new();

        repo.tag_foreach(|_oid, name| {
            if let Ok(name_str) = std::str::from_utf8(name) {
                if name_str.starts_with("refs/tags/") {
                    let tag_name = name_str.strip_prefix("refs/tags/").unwrap_or(name_str);
                    tags.push(tag_name.to_string());
                }
            }
            true
        })?;

        tags.sort();
        Ok(tags)
    }

    pub fn get_current_version_from_package_json(path: &Path) -> Result<String> {
        let package_json_path = path.join("package.json");
        if !package_json_path.exists() {
            return Ok("unknown".to_string());
        }

        let content = std::fs::read_to_string(&package_json_path)
            .context("Failed to read package.json")?;

        let package_data: serde_json::Value = serde_json::from_str(&content)
            .context("Failed to parse package.json")?;

        let version = package_data.get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        Ok(version)
    }
}
