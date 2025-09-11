// User Authentication and Profile Management
class AuthSystem {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('quietHoursUser')) || null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }
    }

    checkAuthState() {
        if (this.currentUser) {
            this.showAuthenticatedUI();
        } else {
            this.showLoginUI();
        }
    }

    handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!this.validateEmail(email)) {
            app.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Simulate login (in real app, this would be an API call)
        const users = JSON.parse(localStorage.getItem('quietHoursUsers')) || [];
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = user;
            localStorage.setItem('quietHoursUser', JSON.stringify(user));
            this.showAuthenticatedUI();
            app.showNotification('Login successful!', 'success');
        } else {
            app.showNotification('Invalid email or password', 'error');
        }
    }

    handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!this.validateEmail(email)) {
            app.showNotification('Please enter a valid email address', 'error');
            return;
        }

        if (password !== confirmPassword) {
            app.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            app.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        // Check if user already exists
        const users = JSON.parse(localStorage.getItem('quietHoursUsers')) || [];
        if (users.find(u => u.email === email)) {
            app.showNotification('User with this email already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            password: password, // In real app, this should be hashed
            preferences: {
                emailNotifications: true,
                reminderTime: 10, // minutes before session
                theme: 'light'
            },
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('quietHoursUsers', JSON.stringify(users));
        
        this.currentUser = newUser;
        localStorage.setItem('quietHoursUser', JSON.stringify(newUser));
        
        this.showAuthenticatedUI();
        app.showNotification('Registration successful!', 'success');
    }

    updateProfile() {
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const reminderTime = parseInt(document.getElementById('reminderTime').value);

        if (!this.validateEmail(email)) {
            app.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Update current user
        this.currentUser.name = name;
        this.currentUser.email = email;
        this.currentUser.preferences.emailNotifications = emailNotifications;
        this.currentUser.preferences.reminderTime = reminderTime;

        // Update in storage
        localStorage.setItem('quietHoursUser', JSON.stringify(this.currentUser));
        
        // Update users array
        const users = JSON.parse(localStorage.getItem('quietHoursUsers')) || [];
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = this.currentUser;
            localStorage.setItem('quietHoursUsers', JSON.stringify(users));
        }

        app.showNotification('Profile updated successfully!', 'success');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('quietHoursUser');
        this.showLoginUI();
        app.showNotification('Logged out successfully', 'success');
    }

    showLoginUI() {
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    showAuthenticatedUI() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        // Update user info in UI
        const userNameElement = document.getElementById('userName');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name;
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserPreferences() {
        return this.currentUser ? this.currentUser.preferences : null;
    }
}

// Initialize auth system
const authSystem = new AuthSystem();