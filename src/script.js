// CVR Community Unity Package Manager Frontend

console.log('Script loaded successfully!');

// Wait for Tauri to be ready and then initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Tauri APIs...');

    // Simple approach - just try to access the APIs directly
    window.invoke = window.__TAURI_INVOKE__;

    console.log('Tauri invoke available:', typeof window.__TAURI_INVOKE__);
    console.log('Window properties:', Object.keys(window).filter(k => k.includes('TAURI')));

    if (typeof window.__TAURI_INVOKE__ !== 'undefined') {
        console.log('Found __TAURI_INVOKE__, setting up APIs...');

        window.tauriDialog = {
            open: async (options) => {
                console.log('Using Tauri dialog with options:', options);
                try {
                    const result = await window.__TAURI_INVOKE__('show_open_dialog', { options });
                    console.log('Dialog result:', result);
                    return result;
                } catch (error) {
                    console.error('Tauri dialog error:', error);
                    return null;
                }
            }
        };

        console.log('Tauri APIs set up successfully');
    } else {
        console.log('Tauri not available, setting up mock APIs...');

        window.invoke = async (command, args) => {
            console.log('Mock invoke:', command, args);
            switch (command) {
                case 'get_config':
                    return { registries: [], project_paths: [], selected_project_path: null, theme: 'dark' };
                case 'get_system_theme':
                    return 'dark';
                case 'set_theme':
                    return true;
                default:
                    return null;
            }
        };

        window.tauriDialog = {
            open: async (options) => {
                console.log('Mock dialog:', options);
                const result = prompt('Enter project path:');
                return result || null;
            }
        };
    }
});

class PackageManager {
    constructor() {
        console.log('PackageManager constructor called');
        this.currentProject = null;
        this.packages = [];
        this.registries = [];
        this.config = null;
        this.currentTheme = 'dark';

        console.log('Starting initialization...');
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.initializeTheme();
        this.setupEventListeners();
        this.setupTabs();
        await this.refreshRegistries();
        await this.refreshProjects();
    }

    async loadConfig() {
        try {
            this.config = await window.invoke('get_config');
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = { registries: [], project_paths: [], selected_project_path: null };
        }
    }

    async initializeTheme() {
        try {
            console.log('initializeTheme called');
            // Set theme from config or default to dark
            this.currentTheme = this.config.theme || 'dark';
            console.log('Current theme from config:', this.currentTheme);
            await this.applyTheme(this.currentTheme);

            // Update theme selector
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                console.log('Setting theme selector value to:', this.currentTheme);
                themeSelect.value = this.currentTheme;
            } else {
                console.warn('Theme select element not found during initialization');
            }
        } catch (error) {
            console.error('Failed to initialize theme:', error);
            this.currentTheme = 'dark';
            await this.applyTheme('dark');
        }
    }

    async applyTheme(theme) {
        console.log('Applying theme:', theme);
        const html = document.documentElement;

        if (theme === 'auto') {
            // Detect system theme
            try {
                const systemTheme = await window.invoke('get_system_theme');
                console.log('System theme detected:', systemTheme);
                html.setAttribute('data-theme', systemTheme);
            } catch (error) {
                console.warn('Failed to detect system theme, falling back to dark:', error);
                html.setAttribute('data-theme', 'dark');
            }
        } else {
            console.log('Setting data-theme attribute to:', theme);
            html.setAttribute('data-theme', theme);
        }

        // Log current theme attribute for debugging
        console.log('Current data-theme attribute:', html.getAttribute('data-theme'));

        // Force a style recalculation by temporarily changing a CSS property
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = '';

        // Add visual confirmation
        console.log('Body background color after theme change:',
                   window.getComputedStyle(document.body).backgroundColor);
    }

    async setTheme(theme) {
        try {
            console.log('setTheme called with:', theme);
            this.currentTheme = theme;
            this.config.theme = theme;

            await this.applyTheme(theme);
            await window.invoke('set_theme', theme); // Pass theme directly, not as object

            console.log(`Theme changed to: ${theme}`);
        } catch (error) {
            console.error('Failed to set theme:', error);
        }
    }

    async saveConfig() {
        try {
            await window.invoke('save_config', { config: this.config });
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    setupEventListeners() {
        // Project management
        document.getElementById('add-project-btn').addEventListener('click', () => this.addProject());
        document.getElementById('project-select').addEventListener('change', (e) => this.selectProject(e.target.value));
        document.getElementById('refresh-project-btn').addEventListener('click', () => this.refreshCurrentProject());

        // Registry management
        document.getElementById('add-registry-btn').addEventListener('click', () => this.addRegistry());

        // Package filter (removed search box functionality)
        document.getElementById('package-filter').addEventListener('change', (e) => this.filterPackagesByType(e.target.value));

        // Theme selector
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            console.log('Setting up theme selector event listener');
            themeSelect.addEventListener('change', (e) => {
                console.log('Theme selector changed to:', e.target.value);
                this.setTheme(e.target.value);
            });
        } else {
            console.error('Theme select element not found!');
        }
    }

    setupTabs() {
        console.log('Setting up tabs...');

        // Try a more direct approach
        setTimeout(() => {
            console.log('Tab setup timeout executed');
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            console.log('Found tab buttons:', tabButtons.length);
            console.log('Found tab contents:', tabContents.length);

            // Test that elements exist
            tabButtons.forEach((button, index) => {
                console.log(`Tab button ${index}:`, {
                    element: button,
                    dataset: button.dataset,
                    tab: button.dataset.tab,
                    innerHTML: button.innerHTML
                });
            });

            // Simple click handler that should definitely work
            tabButtons.forEach((button) => {
                button.onclick = function(e) {
                    console.log('CLICK EVENT TRIGGERED!', this.dataset.tab);
                    e.preventDefault();
                    e.stopPropagation();

                    const targetTab = this.dataset.tab;
                    console.log('Processing tab:', targetTab);

                    // Remove active from all
                    tabButtons.forEach(btn => {
                        btn.classList.remove('active');
                        console.log('Removed active from:', btn.dataset.tab);
                    });

                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        console.log('Removed active from content:', content.id);
                    });

                    // Add active to current
                    this.classList.add('active');
                    console.log('Added active to button:', targetTab);

                    const targetContent = document.getElementById(`${targetTab}-tab`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        console.log('Added active to content:', targetContent.id);
                    } else {
                        console.error('Could not find content element:', `${targetTab}-tab`);
                    }
                };
            });

            console.log('Tab setup completed with onclick handlers');
        }, 100);
    }

    async addProject() {
        try {
            console.log('Add project button clicked');
            console.log('Dialog available:', !!window.tauriDialog);

            const result = await window.tauriDialog.open({
                directory: true,
                multiple: false,
                title: 'Select Unity Project Directory'
            });

            console.log('Dialog result:', result);

            if (result) {
                await window.invoke('add_project_path', { path: result });
                await this.loadConfig();
                await this.refreshProjects();
            }
        } catch (error) {
            console.error('Failed to add project:', error);
            alert('Failed to add project. Please try again.');
        }
    }

    async refreshProjects() {
        const projectSelect = document.getElementById('project-select');
        projectSelect.innerHTML = '<option value="">Select a project...</option>';

        this.config.project_paths.forEach(path => {
            const option = document.createElement('option');
            option.value = path;
            option.textContent = this.getProjectNameFromPath(path);
            projectSelect.appendChild(option);
        });

        if (this.config.selected_project_path) {
            projectSelect.value = this.config.selected_project_path;
            await this.selectProject(this.config.selected_project_path);
        }
    }

    getProjectNameFromPath(path) {
        return path.split(/[\\/]/).pop() || path;
    }

    async selectProject(projectPath) {
        if (!projectPath) {
            this.currentProject = null;
            document.getElementById('project-info').classList.add('hidden');
            this.updateCurrentProjectDisplay(null);
            await this.updatePackageList([]);
            return;
        }

        this.showLoading();

        try {
            const projectInfo = await window.invoke('get_project_info', { projectPath });
            this.currentProject = projectInfo;

            // Update config
            this.config.selected_project_path = projectPath;
            await this.saveConfig();

            // Update UI
            this.updateProjectInfo(projectInfo);
            this.updateCurrentProjectDisplay(projectInfo);
            await this.refreshPackages();
        } catch (error) {
            console.error('Failed to load project info:', error);
            alert('Failed to load project information. Please ensure this is a valid Unity project.');
        } finally {
            this.hideLoading();
        }
    }

    updateProjectInfo(projectInfo) {
        document.getElementById('project-name').textContent = projectInfo.name;
        document.getElementById('project-path').textContent = projectInfo.path;
        document.getElementById('unity-version').textContent = projectInfo.unity_version || 'Unknown';
        document.getElementById('project-info').classList.remove('hidden');
    }

    updateCurrentProjectDisplay(projectInfo) {
        const display = document.getElementById('current-project-display');
        const nameElement = document.getElementById('current-project-name');

        if (projectInfo) {
            nameElement.textContent = projectInfo.name;
            display.classList.remove('hidden');
        } else {
            nameElement.textContent = 'None Selected';
            display.classList.add('hidden');
        }
    }

    async refreshCurrentProject() {
        if (this.currentProject) {
            await this.selectProject(this.currentProject.path);
        }
    }

    async addRegistry() {
        const urlInput = document.getElementById('registry-url');
        const url = urlInput.value.trim();

        if (!url) {
            alert('Please enter a registry URL.');
            return;
        }

        this.showLoading();

        try {
            console.log('Fetching registry from URL:', url);

            // First, fetch the registry JSON to get the name
            const registryData = await window.invoke('get_packages_from_registry', {
                registryUrl: url
            });

            // Extract the name from the registry data
            let registryName = registryData.name || 'Unknown Registry';

            // If no name in the registry, try to derive it from the URL
            if (!registryData.name) {
                try {
                    const urlObj = new URL(url);
                    const pathParts = urlObj.pathname.split('/');
                    // Try to get a meaningful name from the URL
                    if (pathParts.length > 2) {
                        registryName = `${pathParts[1]}/${pathParts[2]}`.replace('.git', '');
                    } else {
                        registryName = urlObj.hostname;
                    }
                } catch {
                    registryName = 'Custom Registry';
                }
            }

            console.log('Registry name extracted:', registryName);
            console.log('Registry contains', registryData.packages?.length || 0, 'packages');

            // Add the registry with the extracted/derived name
            await window.invoke('add_registry', { name: registryName, url });
            await this.loadConfig();
            await this.refreshRegistries();

            // Clear input
            urlInput.value = '';

            // Show success message
            alert(`Successfully added registry: ${registryName}`);
        } catch (error) {
            console.error('Failed to add registry:', error);
            alert('Failed to add registry. Please check the URL and ensure it points to a valid registry JSON file.');
        } finally {
            this.hideLoading();
        }
    }

    async refreshRegistries() {
        const registryList = document.getElementById('registry-list');
        registryList.innerHTML = '';

        if (this.config.registries.length === 0) {
            registryList.innerHTML = '<p class="no-project-message">No registries configured. Add one to get started!</p>';
            return;
        }

        this.config.registries.forEach(registry => {
            const registryElement = this.createRegistryElement(registry);
            registryList.appendChild(registryElement);
        });
    }

    createRegistryElement(registry) {
        const div = document.createElement('div');
        div.className = 'registry-item';

        div.innerHTML = `
            <div class="registry-info">
                <h4>${registry.name}</h4>
                <p>${registry.url}</p>
            </div>
            <div class="registry-actions">
                <label class="registry-toggle">
                    <input type="checkbox" ${registry.enabled ? 'checked' : ''}
                           onchange="packageManager.toggleRegistry('${registry.id}', this.checked)">
                    Enabled
                </label>
                <button class="btn btn-secondary" onclick="packageManager.refreshRegistry('${registry.id}')">Refresh</button>
                <button class="btn btn-danger" onclick="packageManager.removeRegistry('${registry.id}')">Remove</button>
            </div>
        `;

        return div;
    }

    async toggleRegistry(registryId, enabled) {
        const registry = this.config.registries.find(r => r.id === registryId);
        if (registry) {
            registry.enabled = enabled;
            await this.saveConfig();
            if (this.currentProject) {
                await this.refreshPackages();
            }
        }
    }

    async refreshRegistry(registryId) {
        // Force refresh packages from this registry
        if (this.currentProject) {
            await this.refreshPackages();
        }
    }

    async removeRegistry(registryId) {
        console.log('removeRegistry called with ID:', registryId);

        try {
            // Since Tauri intercepts confirm() and makes it async, we need to await it
            const userConfirmed = await confirm('Are you sure you want to remove this registry?');
            console.log('User confirmation result:', userConfirmed, 'Type:', typeof userConfirmed);

            // Check for true value
            if (userConfirmed === true) {
                console.log('User confirmed deletion, proceeding...');
                try {
                    await window.invoke('remove_registry', { registryId });
                    await this.loadConfig();
                    await this.refreshRegistries();
                    if (this.currentProject) {
                        await this.refreshPackages();
                    }
                    console.log('Registry removed successfully');
                } catch (error) {
                    console.error('Failed to remove registry:', error);
                    alert('Failed to remove registry.');
                }
            } else {
                console.log('User cancelled deletion, result was:', userConfirmed);
            }
        } catch (confirmError) {
            console.error('Confirmation dialog error:', confirmError);
            // Fallback to a simple check
            const fallbackConfirm = window.confirm('Are you sure you want to remove this registry? (fallback)');
            console.log('Fallback confirm result:', fallbackConfirm, typeof fallbackConfirm);

            if (fallbackConfirm) {
                try {
                    await window.invoke('remove_registry', { registryId });
                    await this.loadConfig();
                    await this.refreshRegistries();
                    if (this.currentProject) {
                        await this.refreshPackages();
                    }
                } catch (error) {
                    console.error('Failed to remove registry:', error);
                    alert('Failed to remove registry.');
                }
            }
        }
    }

    async refreshPackages() {
        if (!this.currentProject) {
            await this.updatePackageList([]);
            return;
        }

        this.showLoading();

        try {
            // Get installed packages
            const installedPackages = await window.invoke('get_installed_packages', {
                projectPath: this.currentProject.path
            });

            // Get available packages from enabled registries
            const availablePackages = [];
            for (const registry of this.config.registries.filter(r => r.enabled)) {
                try {
                    const registryData = await window.invoke('get_packages_from_registry', {
                        registryUrl: registry.url
                    });
                    availablePackages.push(...registryData.packages);
                } catch (error) {
                    console.warn(`Failed to fetch packages from registry ${registry.name}:`, error);
                }
            }

            // Combine and mark packages as installed/available
            const allPackages = this.combinePackages(installedPackages, availablePackages);
            this.packages = allPackages;
            await this.updatePackageList(allPackages);
        } catch (error) {
            console.error('Failed to refresh packages:', error);
            alert('Failed to refresh package list.');
        } finally {
            this.hideLoading();
        }
    }

    combinePackages(installed, available) {
        // Filter out Unity native packages (those starting with 'com.unity.')
        const filteredInstalled = installed.filter(pkg => !pkg.name.startsWith('com.unity.'));
        const filteredAvailable = available.filter(pkg => !pkg.name.startsWith('com.unity.'));

        // Group packages by name to collect all versions
        const packageMap = new Map();

        // Process available packages first
        for (const pkg of filteredAvailable) {
            const packageName = pkg.name;
            if (!packageMap.has(packageName)) {
                packageMap.set(packageName, {
                    name: pkg.name,
                    display_name: pkg.display_name,
                    description: pkg.description,
                    git_url: pkg.git_url,
                    author: pkg.author,
                    keywords: pkg.keywords,
                    category: pkg.category,
                    license: pkg.license,
                    versions: [],
                    installedVersion: null
                });
            }

            // Add this version to the package
            packageMap.get(packageName).versions.push({
                version: pkg.version,
                git_tag: pkg.git_tag,
                git_branch: pkg.git_branch,
                dependencies: pkg.dependencies,
                unity_version: pkg.unity_version,
                is_prerelease: pkg.is_prerelease
            });
        }

        // Mark installed versions
        for (const installedPkg of filteredInstalled) {
            if (packageMap.has(installedPkg.name)) {
                packageMap.get(installedPkg.name).installedVersion = installedPkg.version;
            } else {
                // Package is installed but not in any registry (manually installed)
                packageMap.set(installedPkg.name, {
                    name: installedPkg.name,
                    display_name: installedPkg.name,
                    description: 'Manually installed package',
                    git_url: installedPkg.git_url || '',
                    author: null,
                    keywords: null,
                    category: 'Manual',
                    license: null,
                    versions: [{
                        version: installedPkg.version,
                        git_tag: null,
                        git_branch: null,
                        dependencies: null,
                        unity_version: null,
                        is_prerelease: false
                    }],
                    installedVersion: installedPkg.version
                });
            }
        }

        // Sort versions within each package (latest first)
        for (const [, packageData] of packageMap) {
            packageData.versions.sort((a, b) => {
                // Simple version comparison - you might want to use a proper semver library
                const aVersion = a.version.split('.').map(n => parseInt(n) || 0);
                const bVersion = b.version.split('.').map(n => parseInt(n) || 0);

                for (let i = 0; i < Math.max(aVersion.length, bVersion.length); i++) {
                    const aPart = aVersion[i] || 0;
                    const bPart = bVersion[i] || 0;
                    if (aPart !== bPart) {
                        return bPart - aPart; // Descending order (latest first)
                    }
                }
                return 0;
            });
        }

        return Array.from(packageMap.values());
    }

    async updatePackageList(packages) {
        const packageList = document.getElementById('package-list');

        if (!this.currentProject) {
            packageList.innerHTML = '<p class="no-project-message">Please select a project to view packages.</p>';
            return;
        }

        if (packages.length === 0) {
            packageList.innerHTML = '<p class="no-project-message">No packages found. Try adding a registry or refreshing.</p>';
            return;
        }

        packageList.innerHTML = '';

        // Create package elements asynchronously to allow conflict checking
        for (const pkg of packages) {
            const packageElement = await this.createPackageElement(pkg);
            packageList.appendChild(packageElement);
        }
    }

    async createPackageElement(pkg) {
        const div = document.createElement('div');
        div.className = 'package-item';

        // Check for conflicts with currently installed packages first
        let conflictInfo = null;
        let installedVersion = null;
        if (this.currentProject) {
            try {
                const conflictResult = await window.invoke('check_package_conflicts', {
                    projectPath: this.currentProject.path,
                    packageName: pkg.name
                });

                if (conflictResult) {
                    const installedInfo = await window.invoke('get_installed_package_info', {
                        projectPath: this.currentProject.path,
                        packageName: pkg.name
                    });

                    conflictInfo = {
                        reference: conflictResult,
                        version: installedInfo ? installedInfo[0] : 'unknown',
                        type: installedInfo ? installedInfo[1] : 'unknown'
                    };
                    installedVersion = installedInfo ? installedInfo[0] : null;
                }
            } catch (error) {
                console.warn('Could not check package conflicts:', error);
            }
        }

        // Determine the selected version (prefer currently installed version, otherwise default to latest non-prerelease or just latest)
        let selectedVersion;
        if (installedVersion && pkg.versions.some(v => v.version === installedVersion)) {
            // Use currently installed version if it exists in available versions
            selectedVersion = installedVersion;
        } else {
            // Fall back to default version selection
            const defaultVersion = pkg.versions.find(v => !v.is_prerelease) || pkg.versions[0];
            selectedVersion = defaultVersion.version;
        }

        // Create version dropdown if multiple versions exist
        let versionDropdown = '';
        if (pkg.versions.length > 1) {
            const options = pkg.versions.map(v => {
                const preReleaseLabel = v.is_prerelease ? ' (Pre-release)' : '';
                const selected = v.version === selectedVersion ? 'selected' : '';
                return `<option value="${v.version}" ${selected}>${v.version}${preReleaseLabel}</option>`;
            }).join('');

            versionDropdown = `
                <div class="version-selector">
                    <label>Version:</label>
                    <select id="version-select-${pkg.name}" onchange="packageManager.onVersionChange('${pkg.name}', this.value)">
                        ${options}
                    </select>
                </div>
            `;
        }

        // Determine package status and button text based on conflicts
        const { buttonText, buttonClass, statusText, statusClass } = this.getPackageStatusWithConflicts(pkg, selectedVersion, conflictInfo);

        div.innerHTML = `
            <div class="package-info">
                <h4>${pkg.display_name || pkg.name}</h4>
                <p>${pkg.description || 'No description available'}</p>
                <p class="package-status ${statusClass}">${statusText}</p>
                ${versionDropdown}
            </div>
            <div class="package-actions">
                <button id="action-btn-${pkg.name}" class="btn ${buttonClass}"
                        onclick="packageManager.performPackageAction('${pkg.name}', '${selectedVersion}')">
                    ${buttonText}
                </button>
                ${conflictInfo ?
                    `<button class="btn btn-danger" onclick="packageManager.removePackage('${pkg.name}')">Remove</button>` : ''
                }
            </div>
        `;

        return div;
    }

    getPackageStatusWithConflicts(pkg, selectedVersion, conflictInfo) {
        if (!conflictInfo) {
            // Not installed - use original logic
            return {
                buttonText: 'Install',
                buttonClass: 'btn-success',
                statusText: `Available (${selectedVersion})`,
                statusClass: ''
            };
        }

        const { version: installedVersion, type: installType, reference } = conflictInfo;

        if (installType === 'git') {
            // Git-managed package - needs replacement
            return {
                buttonText: 'Replace Git',
                buttonClass: 'btn-warning',
                statusText: `Git-managed (${installedVersion}) → Replace with Local (${selectedVersion})`,
                statusClass: 'text-warning'
            };
        } else if (installType === 'registry') {
            // Registry package - needs replacement
            return {
                buttonText: 'Replace Registry',
                buttonClass: 'btn-warning',
                statusText: `Registry (${installedVersion}) → Replace with Local (${selectedVersion})`,
                statusClass: 'text-warning'
            };
        } else if (installType === 'local') {
            // Local package - can upgrade/downgrade
            if (installedVersion === selectedVersion) {
                return {
                    buttonText: 'Reinstall',
                    buttonClass: 'btn-secondary',
                    statusText: `Installed (${installedVersion})`,
                    statusClass: 'text-success'
                };
            }

            const comparison = this.compareVersions(selectedVersion, installedVersion);

            if (comparison > 0) {
                return {
                    buttonText: 'Upgrade',
                    buttonClass: 'btn-primary',
                    statusText: `Installed (${installedVersion}) → Upgrade to ${selectedVersion}`,
                    statusClass: 'text-info'
                };
            } else {
                return {
                    buttonText: 'Downgrade',
                    buttonClass: 'btn-warning',
                    statusText: `Installed (${installedVersion}) → Downgrade to ${selectedVersion}`,
                    statusClass: 'text-warning'
                };
            }
        }

        // Fallback
        return {
            buttonText: 'Install',
            buttonClass: 'btn-success',
            statusText: `Available (${selectedVersion})`,
            statusClass: ''
        };
    }

    getPackageStatus(pkg, selectedVersion) {
        const installedVersion = pkg.installedVersion;

        if (!installedVersion) {
            // Not installed
            return {
                buttonText: 'Install',
                buttonClass: 'btn-success',
                statusText: `Available (${selectedVersion})`,
                statusClass: ''
            };
        }

        if (installedVersion === selectedVersion) {
            // Same version installed
            return {
                buttonText: 'Reinstall',
                buttonClass: 'btn-secondary',
                statusText: `Installed (${installedVersion})`,
                statusClass: 'text-success'
            };
        }

        // Compare versions to determine if it's an upgrade or downgrade
        const comparison = this.compareVersions(selectedVersion, installedVersion);

        if (comparison > 0) {
            // Selected version is newer
            return {
                buttonText: 'Upgrade',
                buttonClass: 'btn-primary',
                statusText: `Installed (${installedVersion}) → Upgrade to ${selectedVersion}`,
                statusClass: 'text-info'
            };
        } else {
            // Selected version is older
            return {
                buttonText: 'Downgrade',
                buttonClass: 'btn-warning',
                statusText: `Installed (${installedVersion}) → Downgrade to ${selectedVersion}`,
                statusClass: 'text-warning'
            };
        }
    }

    compareVersions(versionA, versionB) {
        const parseVersion = (version) => {
            return version.split('.').map(part => {
                // Handle pre-release versions like "2.0.0-beta"
                const match = part.match(/^(\d+)(.*)$/);
                return match ? parseInt(match[1]) : 0;
            });
        };

        const a = parseVersion(versionA);
        const b = parseVersion(versionB);

        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const aPart = a[i] || 0;
            const bPart = b[i] || 0;

            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        }

        return 0;
    }

    onVersionChange(packageName, selectedVersion) {
        console.log('Version changed for', packageName, 'to', selectedVersion);

        // Find the package and update the button
        const pkg = this.packages.find(p => p.name === packageName);
        if (!pkg) return;

        const { buttonText, buttonClass } = this.getPackageStatus(pkg, selectedVersion);

        // Update the button
        const button = document.getElementById(`action-btn-${packageName}`);
        if (button) {
            button.textContent = buttonText;
            button.className = `btn ${buttonClass}`;
            button.onclick = () => this.performPackageAction(packageName, selectedVersion);
        }

        // Update status text
        const statusElement = button.closest('.package-item').querySelector('.package-status');
        if (statusElement) {
            const { statusText, statusClass } = this.getPackageStatus(pkg, selectedVersion);
            statusElement.textContent = statusText;
            statusElement.className = `package-status ${statusClass}`;
        }
    }

    async performPackageAction(packageName, version) {
        console.log('Performing action for', packageName, 'version', version);

        const pkg = this.packages.find(p => p.name === packageName);
        if (!pkg || !this.currentProject) return;

        // Find the specific version data
        const versionData = pkg.versions.find(v => v.version === version);
        if (!versionData) {
            console.error('Version data not found for', version);
            return;
        }

        // Create a package object with the selected version data
        const packageToInstall = {
            name: pkg.name,
            display_name: pkg.display_name,
            description: pkg.description,
            version: versionData.version,
            git_url: pkg.git_url,
            git_tag: versionData.git_tag,
            git_branch: versionData.git_branch,
            dependencies: versionData.dependencies,
            unity_version: versionData.unity_version,
            is_prerelease: versionData.is_prerelease
        };

        this.showLoading();

        try {
            await window.invoke('install_package', {
                projectPath: this.currentProject.path,
                package: packageToInstall
            });
            await this.refreshPackages();
        } catch (error) {
            console.error('Failed to perform package action:', error);
            alert('Failed to perform package action. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async installPackage(packageName) {
        const pkg = this.packages.find(p => p.name === packageName);
        if (!pkg || !this.currentProject) return;

        try {
            // Check for conflicts before installing
            const conflictResult = await window.invoke('check_package_conflicts', {
                projectPath: this.currentProject.path,
                packageName: packageName
            });

            let confirmMessage = `Install ${packageName}?`;

            if (conflictResult) {
                if (conflictResult.startsWith('https://') || conflictResult.startsWith('git+') || conflictResult.includes('.git')) {
                    // Git URL conflict
                    const gitVersion = conflictResult.includes('#') ? conflictResult.split('#')[1] : 'latest';
                    confirmMessage = `Replace Unity-managed Git package?\n\nCurrent: ${packageName} (Git: ${gitVersion})\nNew: ${packageName} (Local: ${pkg.git_tag || pkg.git_branch || 'latest'})\n\nThis will remove the Git reference and install a local copy managed by this app.`;
                } else if (conflictResult.startsWith('file:')) {
                    // Local file conflict (upgrade/downgrade)
                    const installedInfo = await window.invoke('get_installed_package_info', {
                        projectPath: this.currentProject.path,
                        packageName: packageName
                    });

                    const currentVersion = installedInfo ? installedInfo[0] : 'unknown';
                    const newVersion = pkg.git_tag || pkg.git_branch || 'latest';
                    confirmMessage = `Update ${packageName}?\n\nCurrent version: ${currentVersion}\nNew version: ${newVersion}\n\nThis will replace the current local installation.`;
                } else {
                    // Registry version conflict
                    confirmMessage = `Replace Unity registry package?\n\nCurrent: ${packageName} (Registry: ${conflictResult})\nNew: ${packageName} (Local: ${pkg.git_tag || pkg.git_branch || 'latest'})\n\nThis will replace the registry version with a local copy.`;
                }
            }

            const userConfirmed = await confirm(confirmMessage);
            if (!userConfirmed) {
                console.log('User cancelled package installation');
                return;
            }

            this.showLoading();

            await window.invoke('install_package', {
                projectPath: this.currentProject.path,
                package: pkg
            });
            await this.refreshPackages();

            console.log('Package installed successfully');
        } catch (error) {
            console.error('Failed to install package:', error);
            alert('Failed to install package. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async updatePackage(packageName) {
        const pkg = this.packages.find(p => p.name === packageName);
        if (!pkg || !this.currentProject) return;

        this.showLoading();

        try {
            await window.invoke('update_package', {
                projectPath: this.currentProject.path,
                package: pkg
            });
            await this.refreshPackages();
        } catch (error) {
            console.error('Failed to update package:', error);
            alert('Failed to update package. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async removePackage(packageName) {
        console.log('removePackage called for:', packageName);

        try {
            // Use async confirm to handle Tauri's Promise-based dialog
            const userConfirmed = await confirm(`Are you sure you want to remove ${packageName}?`);
            console.log('Package removal confirmation result:', userConfirmed, 'Type:', typeof userConfirmed);

            // Explicitly check for true value
            if (userConfirmed === true) {
                console.log('User confirmed package removal, proceeding...');

                if (!this.currentProject) {
                    console.error('No current project selected');
                    return;
                }

                this.showLoading();

                try {
                    await window.invoke('remove_package', {
                        projectPath: this.currentProject.path,
                        packageName
                    });
                    await this.refreshPackages();
                    console.log('Package removed successfully');
                } catch (error) {
                    console.error('Failed to remove package:', error);
                    alert('Failed to remove package. Please try again.');
                } finally {
                    this.hideLoading();
                }
            } else {
                console.log('User cancelled package removal, result was:', userConfirmed);
            }
        } catch (confirmError) {
            console.error('Package removal confirmation dialog error:', confirmError);
            // Fallback to native confirm
            const fallbackConfirm = window.confirm(`Are you sure you want to remove ${packageName}? (fallback)`);
            console.log('Fallback confirm result:', fallbackConfirm, typeof fallbackConfirm);

            if (fallbackConfirm) {
                if (!this.currentProject) return;

                this.showLoading();
                try {
                    await window.invoke('remove_package', {
                        projectPath: this.currentProject.path,
                        packageName
                    });
                    await this.refreshPackages();
                } catch (error) {
                    console.error('Failed to remove package:', error);
                    alert('Failed to remove package. Please try again.');
                } finally {
                    this.hideLoading();
                }
            }
        }
    }

    async filterPackages(searchTerm) {
        const filteredPackages = this.packages.filter(pkg =>
            pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (pkg.display_name && pkg.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        await this.updatePackageList(filteredPackages);
    }

    async filterPackagesByType(type) {
        let filteredPackages;
        switch (type) {
            case 'installed':
                filteredPackages = this.packages.filter(pkg => pkg.installedVersion !== null);
                break;
            case 'available':
                filteredPackages = this.packages.filter(pkg => pkg.installedVersion === null);
                break;
            default:
                filteredPackages = this.packages;
        }
        await this.updatePackageList(filteredPackages);
    }

    showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

// Global instance
let packageManager;

// Test function for debugging
window.debugTabs = function() {
    console.log('=== TAB DEBUG ===');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    console.log('Tab buttons found:', tabButtons.length);
    console.log('Tab contents found:', tabContents.length);

    tabButtons.forEach((btn, i) => {
        console.log(`Button ${i}: data-tab="${btn.dataset.tab}", classes="${btn.className}"`);
    });

    tabContents.forEach((content, i) => {
        console.log(`Content ${i}: id="${content.id}", classes="${content.className}"`);
    });
    console.log('=================');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded event fired');
    console.log('Creating PackageManager instance...');
    packageManager = new PackageManager();
    window.packageManager = packageManager; // Make it globally accessible for onclick handlers
    console.log('PackageManager instance created:', packageManager);
});
