const fs = require('fs');
const path = require('path');
const https = require('https');

class MinecraftServerSetup {
    constructor() {
        this.serverDir = path.join(__dirname, '..', 'minecraft-server');
        this.pluginsDir = path.join(this.serverDir, 'plugins');
    }

    async setup() {
        try {
            console.log('Setting up Minecraft server...');
            
            // Create directories
            await this.createDirectories();
            
            // Download server JAR
            await this.downloadServerJar();
            
            // Download plugins
            await this.downloadPlugins();
            
            // Setup configurations
            await this.setupConfigurations();
            
            console.log('Minecraft server setup completed successfully!');
        } catch (error) {
            console.error('Setup failed:', error);
            process.exit(1);
        }
    }

    async createDirectories() {
        const directories = [
            this.serverDir,
            this.pluginsDir,
            path.join(this.pluginsDir, 'Geyser-Spigot'),
            path.join(this.pluginsDir, 'floodgate')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            }
        }
    }

    async downloadServerJar() {
        const serverJarPath = path.join(this.serverDir, 'server.jar');
        
        if (fs.existsSync(serverJarPath)) {
            console.log('Server JAR already exists, skipping download');
            return;
        }

        console.log('Downloading Paper server JAR...');
        const url = 'https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/497/downloads/paper-1.20.4-497.jar';
        
        await this.downloadFile(url, serverJarPath);
        console.log('Server JAR downloaded successfully');
    }

    async downloadPlugins() {
        const plugins = [
            {
                name: 'Geyser-Spigot.jar',
                url: 'https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot',
                path: path.join(this.pluginsDir, 'Geyser-Spigot.jar')
            },
            {
                name: 'floodgate-spigot.jar',
                url: 'https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot',
                path: path.join(this.pluginsDir, 'floodgate-spigot.jar')
            }
        ];

        for (const plugin of plugins) {
            if (fs.existsSync(plugin.path)) {
                console.log(`${plugin.name} already exists, skipping download`);
                continue;
            }

            console.log(`Downloading ${plugin.name}...`);
            await this.downloadFile(plugin.url, plugin.path);
            console.log(`${plugin.name} downloaded successfully`);
        }
    }

    async setupConfigurations() {
        // Copy configuration files
        const configFiles = [
            {
                source: path.join(__dirname, '..', 'config', 'server.properties'),
                dest: path.join(this.serverDir, 'server.properties')
            },
            {
                source: path.join(__dirname, '..', 'config', 'geyser-config.yml'),
                dest: path.join(this.pluginsDir, 'Geyser-Spigot', 'config.yml')
            },
            {
                source: path.join(__dirname, '..', 'config', 'floodgate-config.yml'),
                dest: path.join(this.pluginsDir, 'floodgate', 'config.yml')
            }
        ];

        for (const config of configFiles) {
            if (fs.existsSync(config.source)) {
                // Create destination directory if it doesn't exist
                const destDir = path.dirname(config.dest);
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }
                
                fs.copyFileSync(config.source, config.dest);
                console.log(`Copied ${path.basename(config.source)} to ${config.dest}`);
            }
        }

        // Create EULA file
        const eulaPath = path.join(this.serverDir, 'eula.txt');
        if (!fs.existsSync(eulaPath)) {
            fs.writeFileSync(eulaPath, 'eula=true\n');
            console.log('Created eula.txt');
        }

        // Create empty ops.json
        const opsPath = path.join(this.serverDir, 'ops.json');
        if (!fs.existsSync(opsPath)) {
            fs.writeFileSync(opsPath, '[]');
            console.log('Created ops.json');
        }

        // Create empty banned-players.json
        const bannedPath = path.join(this.serverDir, 'banned-players.json');
        if (!fs.existsSync(bannedPath)) {
            fs.writeFileSync(bannedPath, '[]');
            console.log('Created banned-players.json');
        }

        // Create empty whitelist.json
        const whitelistPath = path.join(this.serverDir, 'whitelist.json');
        if (!fs.existsSync(whitelistPath)) {
            fs.writeFileSync(whitelistPath, '[]');
            console.log('Created whitelist.json');
        }
    }

    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download file: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (error) => {
                fs.unlink(filePath, () => {}); // Delete the file on error
                reject(error);
            });
        });
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    const setup = new MinecraftServerSetup();
    setup.setup();
}

module.exports = MinecraftServerSetup;
