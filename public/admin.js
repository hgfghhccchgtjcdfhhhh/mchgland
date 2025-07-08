class AdminPanel {
    constructor() {
        this.isAuthenticated = false;
        this.passcode = null;
        this.socket = null;
        this.logs = [];
        this.maxLogs = 100;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Server controls
        document.getElementById('startServerBtn').addEventListener('click', () => {
            this.startServer();
        });

        document.getElementById('stopServerBtn').addEventListener('click', () => {
            this.stopServer();
        });

        document.getElementById('restartServerBtn').addEventListener('click', () => {
            this.restartServer();
        });

        // Operator management
        document.getElementById('addOpBtn').addEventListener('click', () => {
            this.addOperator();
        });

        document.getElementById('removeOpBtn').addEventListener('click', () => {
            this.removeOperator();
        });

        // Ban management
        document.getElementById('banPlayerBtn').addEventListener('click', () => {
            this.banPlayer();
        });

        document.getElementById('unbanPlayerBtn').addEventListener('click', () => {
            this.unbanPlayer();
        });

        // Clear logs
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });

        // Enter key handling for inputs
        document.getElementById('passcode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        document.getElementById('opPlayerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addOperator();
            }
        });

        document.getElementById('banPlayerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.banPlayer();
            }
        });

        document.getElementById('unbanPlayerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.unbanPlayer();
            }
        });
    }

    checkAuthStatus() {
        // Check if user is already authenticated (session storage)
        const storedPasscode = sessionStorage.getItem('adminPasscode');
        if (storedPasscode === '45982') {
            this.passcode = storedPasscode;
            this.isAuthenticated = true;
            this.showAdminPanel();
        } else {
            this.showLoginPanel();
        }
    }

    async handleLogin() {
        const passcodeInput = document.getElementById('passcode');
        const passcode = passcodeInput.value;
        const errorDiv = document.getElementById('loginError');

        if (!passcode) {
            this.showError(errorDiv, 'Please enter the passcode');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ passcode }),
            });

            const data = await response.json();

            if (data.success) {
                this.isAuthenticated = true;
                this.passcode = passcode;
                sessionStorage.setItem('adminPasscode', passcode);
                this.showAdminPanel();
                this.connectWebSocket();
                this.loadInitialData();
            } else {
                this.showError(errorDiv, data.message || 'Invalid passcode');
            }
        } catch (error) {
            this.showError(errorDiv, 'Connection error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        this.isAuthenticated = false;
        this.passcode = null;
        sessionStorage.removeItem('adminPasscode');
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        this.showLoginPanel();
    }

    showLoginPanel() {
        document.getElementById('loginSection').classList.add('active');
        document.getElementById('adminSection').classList.remove('active');
        document.getElementById('passcode').value = '';
        document.getElementById('loginError').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginSection').classList.remove('active');
        document.getElementById('adminSection').classList.add('active');
    }

    connectWebSocket() {
        if (this.socket) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Admin WebSocket connected');
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.socket.onclose = () => {
            console.log('Admin WebSocket disconnected');
            this.socket = null;
            // Attempt to reconnect if authenticated
            if (this.isAuthenticated) {
                setTimeout(() => this.connectWebSocket(), 5000);
            }
        };
        
        this.socket.onerror = (error) => {
            console.error('Admin WebSocket error:', error);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                this.updateServerStatus(data.data);
                break;
            case 'log':
                this.addLog(data.data.message);
                break;
            case 'playerJoin':
                this.addLog(`Player joined: ${data.data.player}`);
                break;
            case 'playerLeave':
                this.addLog(`Player left: ${data.data.player}`);
                break;
        }
    }

    updateServerStatus(status) {
        const statusElement = document.getElementById('adminServerStatus');
        const playerCountElement = document.getElementById('adminPlayerCount');
        const uptimeElement = document.getElementById('adminUptime');

        statusElement.textContent = status.running ? 'Online' : 'Offline';
        statusElement.className = `status-value ${status.running ? 'online' : 'offline'}`;
        
        playerCountElement.textContent = `${status.players}/${status.maxPlayers}`;
        uptimeElement.textContent = this.formatUptime(status.uptime);

        // Update button states
        document.getElementById('startServerBtn').disabled = status.running;
        document.getElementById('stopServerBtn').disabled = !status.running;
        document.getElementById('restartServerBtn').disabled = !status.running;
    }

    addLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        this.logs.push(logMessage);
        
        // Keep only the last maxLogs messages
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const logOutput = document.getElementById('serverLogs');
        logOutput.innerHTML = this.logs.map(log => `<p>${this.escapeHtml(log)}</p>`).join('');
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        this.updateLogDisplay();
    }

    async loadInitialData() {
        try {
            // Load server status
            const statusResponse = await fetch('/api/status');
            const statusData = await statusResponse.json();
            this.updateServerStatus(statusData);

            // Load operators
            await this.loadOperators();

            // Load banned players
            await this.loadBannedPlayers();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async loadOperators() {
        try {
            const response = await fetch(`/api/ops?passcode=${this.passcode}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayOperators(data.ops);
            }
        } catch (error) {
            console.error('Failed to load operators:', error);
        }
    }

    async loadBannedPlayers() {
        try {
            const response = await fetch(`/api/bans?passcode=${this.passcode}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayBannedPlayers(data.bans);
            }
        } catch (error) {
            console.error('Failed to load banned players:', error);
        }
    }

    displayOperators(ops) {
        const opList = document.getElementById('opList');
        
        if (ops.length === 0) {
            opList.innerHTML = '<p class="no-items">No operators</p>';
        } else {
            opList.innerHTML = ops.map(op => `
                <div class="list-item">
                    <span>${this.escapeHtml(op.name || op.uuid)}</span>
                    <small>${op.level ? `Level ${op.level}` : ''}</small>
                </div>
            `).join('');
        }
    }

    displayBannedPlayers(bans) {
        const banList = document.getElementById('banList');
        
        if (bans.length === 0) {
            banList.innerHTML = '<p class="no-items">No banned players</p>';
        } else {
            banList.innerHTML = bans.map(ban => `
                <div class="list-item">
                    <span>${this.escapeHtml(ban.name || ban.uuid)}</span>
                    <small>${ban.reason || 'No reason provided'}</small>
                </div>
            `).join('');
        }
    }

    async startServer() {
        await this.performServerAction('/api/server/start', 'Starting server...');
    }

    async stopServer() {
        await this.performServerAction('/api/server/stop', 'Stopping server...');
    }

    async restartServer() {
        await this.performServerAction('/api/server/restart', 'Restarting server...');
    }

    async performServerAction(endpoint, loadingMessage) {
        this.showLoading(true, loadingMessage);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ passcode: this.passcode }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccessMessage(data.message);
                this.addLog(`Admin action: ${data.message}`);
            } else {
                this.showErrorMessage(data.message);
            }
        } catch (error) {
            this.showErrorMessage('Connection error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async addOperator() {
        const playerName = document.getElementById('opPlayerName').value.trim();
        
        if (!playerName) {
            this.showErrorMessage('Please enter a player name');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/ops/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    passcode: this.passcode,
                    player: playerName 
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccessMessage(data.message);
                this.addLog(`Admin action: Added operator ${playerName}`);
                document.getElementById('opPlayerName').value = '';
                await this.loadOperators();
            } else {
                this.showErrorMessage(data.message);
            }
        } catch (error) {
            this.showErrorMessage('Connection error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async removeOperator() {
        const playerName = document.getElementById('opPlayerName').value.trim();
        
        if (!playerName) {
            this.showErrorMessage('Please enter a player name');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/ops/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    passcode: this.passcode,
                    player: playerName 
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccessMessage(data.message);
                this.addLog(`Admin action: Removed operator ${playerName}`);
                document.getElementById('opPlayerName').value = '';
                await this.loadOperators();
            } else {
                this.showErrorMessage(data.message);
            }
        } catch (error) {
            this.showErrorMessage('Connection error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async banPlayer() {
        const playerName = document.getElementById('banPlayerName').value.trim();
        const reason = document.getElementById('banReason').value.trim();
        
        if (!playerName) {
            this.showErrorMessage('Please enter a player name');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/ban/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    passcode: this.passcode,
                    player: playerName,
                    reason: reason || 'No reason provided'
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccessMessage(data.message);
                this.addLog(`Admin action: Banned player ${playerName}${reason ? ` (${reason})` : ''}`);
                document.getElementById('banPlayerName').value = '';
                document.getElementById('banReason').value = '';
                await this.loadBannedPlayers();
            } else {
                this.showErrorMessage(data.message);
            }
        } catch (error) {
            this.showErrorMessage('Connection error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async unbanPlayer() {
        const playerName = document.getElementById('unbanPlayerName').value.trim();
        
        if (!playerName) {
            this.showErrorMessage('Please enter a player name');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/ban/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    passcode: this.passcode,
                    player: playerName 
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccessMessage(data.message);
                this.addLog(`Admin action: Unbanned player ${playerName}`);
                document.getElementById('unbanPlayerName').value = '';
                await this.loadBannedPlayers();
            } else {
                this.showErrorMessage(data.message);
            }
        } catch (error) {
            this.showErrorMessage('Connection error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show, message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingContent = overlay.querySelector('.loading-content p');
        
        if (show) {
            loadingContent.textContent = message;
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }

    formatUptime(ms) {
        if (ms === 0) return '0s';
        
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0) result += `${minutes}m `;
        if (seconds > 0) result += `${seconds}s`;
        
        return result.trim();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});
