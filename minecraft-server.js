const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const EventEmitter = require('events');

class MinecraftServer extends EventEmitter {
    constructor() {
        super();
        this.serverProcess = null;
        this.serverDir = path.join(__dirname, 'minecraft-server');
        this.serverJar = path.join(this.serverDir, 'server.jar');
        this.startTime = null;
        this.playerCount = 0;
        this.maxPlayers = 999999;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Create server directory
            await fs.mkdir(this.serverDir, { recursive: true });
            await fs.mkdir(path.join(this.serverDir, 'plugins'), { recursive: true });
            
            // Download server JAR if not exists
            if (!await this.fileExists(this.serverJar)) {
                console.log('Downloading Minecraft server JAR...');
                await this.downloadServerJar();
            }
            
            // Download plugins if not exist
            await this.downloadPlugins();
            
            // Setup server configuration
            await this.setupServerConfig();
            
            this.isInitialized = true;
            console.log('Minecraft server initialization complete');
        } catch (error) {
            console.error('Failed to initialize server:', error);
            throw error;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async downloadServerJar() {
        return new Promise((resolve, reject) => {
            // Use Paper server for better performance and plugin support
            const url = 'https://api.papermc.io/v2/projects/paper/versions/1.20.4/builds/497/downloads/paper-1.20.4-497.jar';
            
            const download = (downloadUrl, redirectCount = 0) => {
                if (redirectCount > 5) {
                    reject(new Error('Too many redirects'));
                    return;
                }

                https.get(downloadUrl, (response) => {
                    if (response.statusCode === 200) {
                        const fileStream = require('fs').createWriteStream(this.serverJar);
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            console.log('Server JAR downloaded successfully');
                            resolve();
                        });
                    } else if (response.statusCode === 301 || response.statusCode === 302) {
                        let redirectUrl = response.headers.location;
                        if (redirectUrl) {
                            // Handle relative URLs  
                            if (redirectUrl.startsWith('/')) {
                                const originalUrl = new URL(downloadUrl);
                                redirectUrl = `${originalUrl.protocol}//${originalUrl.host}${redirectUrl}`;
                            }
                            console.log(`Redirecting to: ${redirectUrl}`);
                            download(redirectUrl, redirectCount + 1);
                        } else {
                            reject(new Error(`Redirect without location header: ${response.statusCode}`));
                        }
                    } else {
                        reject(new Error(`Failed to download server JAR: ${response.statusCode}`));
                    }
                }).on('error', reject);
            };

            download(url);
        });
    }

    async downloadPlugins() {
        const plugins = [
            {
                name: 'Geyser-Spigot.jar',
                url: 'https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot'
            },
            {
                name: 'floodgate-spigot.jar', 
                url: 'https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot'
            }
        ];

        for (const plugin of plugins) {
            const pluginPath = path.join(this.serverDir, 'plugins', plugin.name);
            if (!await this.fileExists(pluginPath)) {
                console.log(`Downloading ${plugin.name}...`);
                try {
                    await this.downloadFile(plugin.url, pluginPath);
                } catch (error) {
                    console.log(`Failed to download ${plugin.name}, server will work without it`);
                }
            }
        }
    }

    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const download = (downloadUrl, redirectCount = 0) => {
                if (redirectCount > 5) {
                    reject(new Error('Too many redirects'));
                    return;
                }

                https.get(downloadUrl, (response) => {
                    if (response.statusCode === 200) {
                        const fileStream = require('fs').createWriteStream(filePath);
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            console.log(`Downloaded ${path.basename(filePath)}`);
                            resolve();
                        });
                    } else if (response.statusCode === 301 || response.statusCode === 302) {
                        // Handle redirects
                        let redirectUrl = response.headers.location;
                        if (redirectUrl) {
                            // Handle relative URLs
                            if (redirectUrl.startsWith('/')) {
                                const originalUrl = new URL(downloadUrl);
                                redirectUrl = `${originalUrl.protocol}//${originalUrl.host}${redirectUrl}`;
                            }
                            console.log(`Redirecting to: ${redirectUrl}`);
                            download(redirectUrl, redirectCount + 1);
                        } else {
                            reject(new Error(`Redirect without location header: ${response.statusCode}`));
                        }
                    } else {
                        reject(new Error(`Failed to download ${path.basename(filePath)}: ${response.statusCode}`));
                    }
                }).on('error', reject);
            };

            download(url);
        });
    }

    async setupServerConfig() {
        // Create server.properties
        const serverProperties = `
#Minecraft server properties
server-port=25565
server-ip=0.0.0.0
gamemode=survival
difficulty=normal
max-players=999999
online-mode=false
white-list=false
spawn-protection=0
motd=MCHGLand Server - Java & Bedrock Compatible!
enable-rcon=false
view-distance=10
simulation-distance=10
spawn-animals=true
spawn-monsters=true
spawn-npcs=true
pvp=true
allow-flight=false
resource-pack=
level-name=world
level-seed=
level-type=minecraft\\:normal
`.trim();

        await fs.writeFile(path.join(this.serverDir, 'server.properties'), serverProperties);

        // Accept EULA
        await fs.writeFile(path.join(this.serverDir, 'eula.txt'), 'eula=true');

        // Create Geyser config
        const geyserConfig = `
# Geyser Configuration File
bedrock:
  address: 0.0.0.0
  port: 19132
  clone-remote-port: false
  motd1: "MCHGLand Server"
  motd2: "Java & Bedrock Compatible!"
  server-name: "MCHGLand"
  compression-level: 6
  enable-proxy-protocol: false
  proxy-protocol-whitelisted-ips: []

remote:
  address: 127.0.0.1
  port: 25565
  auth-type: offline
  allow-password-authentication: true
  use-proxy-protocol: false
  forward-hostname: false

floodgate:
  key-file: key.pem
  username-prefix: "."
  replace-spaces: true

userdata-folder: userdata
cache-images: 0
allow-custom-skulls: true
allow-third-party-capes: true
allow-third-party-ears: false
allow-third-party-deadmau5ears: false
show-cooldown: title
default-locale: en_us
cache-chunked-loading: true
log-player-ip-addresses: true
config-version: 4
`.trim();

        await fs.mkdir(path.join(this.serverDir, 'plugins', 'Geyser-Spigot'), { recursive: true });
        await fs.writeFile(path.join(this.serverDir, 'plugins', 'Geyser-Spigot', 'config.yml'), geyserConfig);

        // Create ops.json if not exists
        const opsFile = path.join(this.serverDir, 'ops.json');
        if (!await this.fileExists(opsFile)) {
            await fs.writeFile(opsFile, '[]');
        }

        // Create banned-players.json if not exists
        const bannedFile = path.join(this.serverDir, 'banned-players.json');
        if (!await this.fileExists(bannedFile)) {
            await fs.writeFile(bannedFile, '[]');
        }
    }

    async start() {
        if (this.serverProcess) {
            throw new Error('Server is already running');
        }

        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            console.log('Starting Minecraft server...');
            
            // Create a simulated server process that demonstrates all functionality
            // This creates a mock server that shows how the real one would work
            const { spawn } = require('child_process');
            
            // Run the actual Minecraft server JAR
            // Find Java executable
            const javaPath = process.env.JAVA_HOME ? `${process.env.JAVA_HOME}/bin/java` : 'java';
            this.serverProcess = spawn(javaPath, [
                '-Xmx1G',
                '-Xms512M',
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=200',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=30',
                '-XX:G1MaxNewSizePercent=40',
                '-XX:G1HeapRegionSize=8M',
                '-XX:G1ReservePercent=20',
                '-XX:G1HeapWastePercent=5',
                '-XX:G1MixedGCCountTarget=4',
                '-XX:InitiatingHeapOccupancyPercent=15',
                '-XX:G1MixedGCLiveThresholdPercent=90',
                '-XX:G1RSetUpdatingPauseTimePercent=5',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1',
                '-Dusing.aikars.flags=https://mcflags.emc.gs',
                '-Daikars.new.flags=true',
                '-jar', 'server.jar',
                '--nogui'
            ], {
                cwd: this.serverDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.startTime = Date.now();
            
            let serverStarted = false;
            
            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(output);
                this.emit('serverLog', output);
                
                // Check for server start confirmation
                if (output.includes('Done') || output.includes('Starting Minecraft server on') || output.includes('Using epoll channel type')) {
                    if (!serverStarted) {
                        serverStarted = true;
                        console.log('Minecraft server started successfully');
                        this.emit('statusUpdate', {
                            running: true,
                            players: this.playerCount,
                            maxPlayers: this.maxPlayers,
                            uptime: this.getUptime()
                        });
                        resolve();
                    }
                }
                
                // Track player joins/leaves (simulated)
                if (output.includes('joined the game')) {
                    const match = output.match(/(\w+) joined the game/);
                    if (match) {
                        this.playerCount++;
                        this.emit('playerJoin', match[1]);
                        this.emit('statusUpdate', {
                            running: true,
                            players: this.playerCount,
                            maxPlayers: this.maxPlayers,
                            uptime: this.getUptime()
                        });
                    }
                }
                
                if (output.includes('left the game')) {
                    const match = output.match(/(\w+) left the game/);
                    if (match) {
                        this.playerCount = Math.max(0, this.playerCount - 1);
                        this.emit('playerLeave', match[1]);
                        this.emit('statusUpdate', {
                            running: true,
                            players: this.playerCount,
                            maxPlayers: this.maxPlayers,
                            uptime: this.getUptime()
                        });
                    }
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(error);
                this.emit('serverLog', error);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`Server process exited with code ${code}`);
                this.serverProcess = null;
                this.startTime = null;
                this.playerCount = 0;
                this.emit('statusUpdate', {
                    running: false,
                    players: 0,
                    maxPlayers: this.maxPlayers,
                    uptime: 0
                });
                
                if (!serverStarted) {
                    reject(new Error(`Server failed to start (exit code: ${code})`));
                }
            });

            this.serverProcess.on('error', (error) => {
                console.error('Server process error:', error);
                this.serverProcess = null;
                this.startTime = null;
                this.playerCount = 0;
                this.emit('statusUpdate', {
                    running: false,
                    players: 0,
                    maxPlayers: this.maxPlayers,
                    uptime: 0
                });
                reject(error);
            });

            // Timeout after 60 seconds for real server startup
            setTimeout(() => {
                if (!serverStarted) {
                    reject(new Error('Server start timeout'));
                }
            }, 60000);
        });
    }

    async stop() {
        if (!this.serverProcess) {
            throw new Error('Server is not running');
        }

        return new Promise((resolve) => {
            console.log('Stopping Minecraft server...');
            
            this.serverProcess.stdin.write('stop\n');
            
            const timeout = setTimeout(() => {
                console.log('Force killing server process...');
                this.serverProcess.kill('SIGKILL');
            }, 30000);

            this.serverProcess.on('close', () => {
                clearTimeout(timeout);
                console.log('Minecraft server stopped');
                resolve();
            });
        });
    }

    async restart() {
        if (this.serverProcess) {
            await this.stop();
        }
        await this.start();
    }

    async executeCommand(command) {
        if (!this.serverProcess) {
            throw new Error('Server is not running');
        }
        
        this.serverProcess.stdin.write(command + '\n');
    }

    async addOp(player) {
        await this.executeCommand(`op ${player}`);
        
        // Also update the ops.json file
        const opsFile = path.join(this.serverDir, 'ops.json');
        try {
            const data = await fs.readFile(opsFile, 'utf8');
            let ops = JSON.parse(data);
            
            // Check if player is already an op
            if (!ops.find(op => op.name === player || op.uuid === player)) {
                ops.push({
                    uuid: player,
                    name: player,
                    level: 4,
                    bypassesPlayerLimit: false
                });
                await fs.writeFile(opsFile, JSON.stringify(ops, null, 2));
            }
        } catch (error) {
            console.error('Error updating ops.json:', error);
        }
    }

    async removeOp(player) {
        await this.executeCommand(`deop ${player}`);
        
        // Also update the ops.json file
        const opsFile = path.join(this.serverDir, 'ops.json');
        try {
            const data = await fs.readFile(opsFile, 'utf8');
            let ops = JSON.parse(data);
            
            // Remove player from ops
            ops = ops.filter(op => op.name !== player && op.uuid !== player);
            await fs.writeFile(opsFile, JSON.stringify(ops, null, 2));
        } catch (error) {
            console.error('Error updating ops.json:', error);
        }
    }

    async banPlayer(player, reason = 'No reason provided') {
        await this.executeCommand(`ban ${player} ${reason}`);
    }

    async unbanPlayer(player) {
        await this.executeCommand(`pardon ${player}`);
    }

    async getOps() {
        const opsFile = path.join(this.serverDir, 'ops.json');
        try {
            const data = await fs.readFile(opsFile, 'utf8');
            const ops = JSON.parse(data);
            return ops.map(op => ({
                name: op.name || op.uuid,
                uuid: op.uuid,
                level: op.level || 4
            }));
        } catch (error) {
            return [];
        }
    }

    async getBans() {
        const bannedFile = path.join(this.serverDir, 'banned-players.json');
        try {
            const data = await fs.readFile(bannedFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    isRunning() {
        return this.serverProcess !== null;
    }

    getPlayerCount() {
        return this.playerCount;
    }

    getMaxPlayers() {
        return this.maxPlayers;
    }

    getUptime() {
        if (!this.startTime) return 0;
        return Date.now() - this.startTime;
    }
}

module.exports = MinecraftServer;
