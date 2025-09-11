// Main Application JavaScript
class QuietHoursApp {
    constructor() {
        this.sessions = JSON.parse(localStorage.getItem('quietHoursSessions')) || [];
        this.currentSession = null;
        this.currentTab = 'dashboard';
        this.theme = localStorage.getItem('theme') || 'light';
        
        // Wait for auth system to initialize
        this.waitForAuth();
    }

    waitForAuth() {
        if (typeof authSystem !== 'undefined') {
            this.init();
        } else {
            setTimeout(() => this.waitForAuth(), 100);
        }
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.updateDashboard();
        this.renderSessions();
        this.checkNotifications();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('sessionDate');
        if (dateInput) {
            dateInput.value = today;
        }
        
        console.log('Quiet Hours Scheduler initialized');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.showTab(tab);
            });
        });

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Form submission
        const scheduleForm = document.getElementById('scheduleForm');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.scheduleSession();
            });
        }

        // Recurring checkbox
        const enableRecurring = document.getElementById('enableRecurring');
        if (enableRecurring) {
            enableRecurring.addEventListener('change', (e) => {
                const recurringOptions = document.getElementById('recurringOptions');
                if (recurringOptions) {
                    recurringOptions.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Session filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterSessions(e.target.dataset.filter);
            });
        });

        // Check for notifications every minute
        setInterval(() => {
            this.checkNotifications();
        }, 60000);
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.setupTheme();
        this.showNotification('Theme changed to ' + this.theme + ' mode', 'success');
    }

    showTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const tabContent = document.getElementById(tabName);
        if (tabContent) {
            tabContent.classList.add('active');
        }

        this.currentTab = tabName;

        // Update content based on tab
        if (tabName === 'dashboard') {
            this.updateDashboard();
        } else if (tabName === 'sessions') {
            this.renderSessions();
        } else if (tabName === 'analytics') {
            this.updateAnalytics();
        } else if (tabName === 'settings') {
            this.loadSettings();
        }
    }

    scheduleSession() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) {
            this.showNotification('Please log in to schedule sessions', 'error');
            return;
        }

        const session = {
            id: Date.now().toString(),
            userId: currentUser.id,
            title: document.getElementById('sessionTitle').value,
            date: document.getElementById('sessionDate').value,
            time: document.getElementById('sessionTime').value,
            duration: parseInt(document.getElementById('sessionDuration').value),
            category: document.getElementById('sessionCategory').value,
            notes: document.getElementById('sessionNotes').value,
            notifications: document.getElementById('enableNotifications').checked,
            recurring: document.getElementById('enableRecurring').checked,
            recurringType: document.getElementById('recurringType').value,
            recurringEnd: document.getElementById('recurringEnd').value,
            status: 'upcoming',
            createdAt: new Date().toISOString()
        };

        // Validate session
        if (!this.validateSession(session)) {
            return;
        }

        // Check for overlaps
        if (this.hasOverlap(session)) {
            this.showNotification('Session overlaps with existing session', 'error');
            return;
        }

        // Add session(s)
        if (session.recurring) {
            this.createRecurringSessions(session);
        } else {
            this.sessions.push(session);
            
            // Schedule email notification if enabled
            if (session.notifications && currentUser.preferences.emailNotifications) {
                emailService.scheduleSessionReminder(session, currentUser);
            }
        }

        this.saveSessions();
        this.showNotification('Session scheduled successfully!', 'success');
        this.resetForm();
        this.updateDashboard();
        this.renderSessions();
    }

    validateSession(session) {
        const sessionDateTime = new Date(`${session.date}T${session.time}`);
        const now = new Date();

        if (sessionDateTime <= now) {
            this.showNotification('Session must be scheduled for a future time', 'error');
            return false;
        }

        if (session.title.trim().length < 3) {
            this.showNotification('Session title must be at least 3 characters', 'error');
            return false;
        }

        return true;
    }

    hasOverlap(newSession) {
        const newStart = new Date(`${newSession.date}T${newSession.time}`);
        const newEnd = new Date(newStart.getTime() + newSession.duration * 60000);

        return this.sessions.some(session => {
            if (session.status === 'completed' || session.status === 'missed') {
                return false;
            }

            const existingStart = new Date(`${session.date}T${session.time}`);
            const existingEnd = new Date(existingStart.getTime() + session.duration * 60000);

            return (newStart < existingEnd && newEnd > existingStart);
        });
    }

    createRecurringSessions(baseSession) {
        const startDate = new Date(baseSession.date);
        const endDate = new Date(baseSession.recurringEnd);
        const sessions = [];
        const currentUser = authSystem.getCurrentUser();

        let currentDate = new Date(startDate);
        let sessionCount = 0;
        const maxSessions = 100; // Prevent infinite loops

        while (currentDate <= endDate && sessionCount < maxSessions) {
            const session = {
                ...baseSession,
                id: `${baseSession.id}_${sessionCount}`,
                date: currentDate.toISOString().split('T')[0]
            };

            if (!this.hasOverlap(session)) {
                sessions.push(session);
                
                // Schedule email notification if enabled
                if (session.notifications && currentUser && currentUser.preferences.emailNotifications) {
                    emailService.scheduleSessionReminder(session, currentUser);
                }
            }

            // Move to next occurrence
            switch (baseSession.recurringType) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
            }

            sessionCount++;
        }

        this.sessions.push(...sessions);
        this.showNotification(`Created ${sessions.length} recurring sessions`, 'success');
    }

    resetForm() {
        const form = document.getElementById('scheduleForm');
        if (form) {
            form.reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('sessionDate').value = today;
            document.getElementById('recurringOptions').style.display = 'none';
        }
    }

    updateDashboard() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;

        const userSessions = this.sessions.filter(s => s.userId === currentUser.id);
        
        // Update stats
        const totalHours = userSessions.reduce((sum, session) => {
            return sum + (session.actualDuration || session.duration);
        }, 0) / 60;

        const completedSessions = userSessions.filter(s => s.status === 'completed').length;
        const todaySessions = userSessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length;
        const currentStreak = this.calculateStreak(userSessions);

        // Update DOM
        this.updateElement('totalHours', Math.round(totalHours));
        this.updateElement('completedSessions', completedSessions);
        this.updateElement('todaySessions', todaySessions);
        this.updateElement('currentStreak', currentStreak);

        // Update upcoming sessions
        this.renderUpcomingSessions(userSessions);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    calculateStreak(sessions) {
        const completedDates = sessions
            .filter(s => s.status === 'completed')
            .map(s => s.date)
            .sort()
            .reverse();

        if (completedDates.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const dateStr of completedDates) {
            const sessionDate = new Date(dateStr);
            sessionDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

            if (diffDays === streak) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    renderUpcomingSessions(sessions) {
        const container = document.getElementById('upcomingSessions');
        if (!container) return;

        const upcoming = sessions
            .filter(s => s.status === 'upcoming')
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
            .slice(0, 3);

        if (upcoming.length === 0) {
            container.innerHTML = '<p>No upcoming sessions</p>';
            return;
        }

        container.innerHTML = upcoming.map(session => `
            <div class="session-preview">
                <div class="session-info">
                    <h4>${session.title}</h4>
                    <p>${this.formatDateTime(session.date, session.time)} • ${session.duration} min</p>
                </div>
                <button class="btn btn-primary" onclick="app.startSession('${session.id}')">
                    Start
                </button>
            </div>
        `).join('');
    }

    renderSessions() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;

        const container = document.getElementById('sessionsList');
        if (!container) return;

        const userSessions = this.sessions.filter(s => s.userId === currentUser.id);
        
        if (userSessions.length === 0) {
            container.innerHTML = '<p>No sessions found. Create your first session!</p>';
            return;
        }

        const sortedSessions = userSessions.sort((a, b) => 
            new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)
        );

        container.innerHTML = sortedSessions.map(session => `
            <div class="session-card ${session.status}">
                <div class="session-header">
                    <h3>${session.title}</h3>
                    <span class="session-status ${session.status}">${session.status}</span>
                </div>
                <div class="session-details">
                    <p><i class="fas fa-calendar"></i> ${this.formatDateTime(session.date, session.time)}</p>
                    <p><i class="fas fa-clock"></i> ${session.duration} minutes</p>
                    <p><i class="fas fa-tag"></i> ${session.category}</p>
                    ${session.notes ? `<p><i class="fas fa-note-sticky"></i> ${session.notes}</p>` : ''}
                </div>
                <div class="session-actions">
                    ${session.status === 'upcoming' ? `
                        <button class="btn btn-primary" onclick="app.startSession('${session.id}')">
                            <i class="fas fa-play"></i> Start
                        </button>
                        <button class="btn btn-secondary" onclick="app.editSession('${session.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="app.deleteSession('${session.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    formatDateTime(date, time) {
        const dateObj = new Date(`${date}T${time}`);
        return dateObj.toLocaleString();
    }

    filterSessions(filter) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Filter sessions
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;

        let filteredSessions = this.sessions.filter(s => s.userId === currentUser.id);

        if (filter !== 'all') {
            filteredSessions = filteredSessions.filter(s => s.status === filter);
        }

        this.renderFilteredSessions(filteredSessions);
    }

    renderFilteredSessions(sessions) {
        const container = document.getElementById('sessionsList');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = '<p>No sessions found for this filter.</p>';
            return;
        }

        const sortedSessions = sessions.sort((a, b) => 
            new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)
        );

        container.innerHTML = sortedSessions.map(session => `
            <div class="session-card ${session.status}">
                <div class="session-header">
                    <h3>${session.title}</h3>
                    <span class="session-status ${session.status}">${session.status}</span>
                </div>
                <div class="session-details">
                    <p><i class="fas fa-calendar"></i> ${this.formatDateTime(session.date, session.time)}</p>
                    <p><i class="fas fa-clock"></i> ${session.duration} minutes</p>
                    <p><i class="fas fa-tag"></i> ${session.category}</p>
                    ${session.notes ? `<p><i class="fas fa-note-sticky"></i> ${session.notes}</p>` : ''}
                </div>
                <div class="session-actions">
                    ${session.status === 'upcoming' ? `
                        <button class="btn btn-primary" onclick="app.startSession('${session.id}')">
                            <i class="fas fa-play"></i> Start
                        </button>
                        <button class="btn btn-secondary" onclick="app.editSession('${session.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="app.deleteSession('${session.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    startSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        this.currentSession = session;
        session.status = 'active';
        session.startedAt = new Date().toISOString();
        
        this.saveSessions();
        this.showNotification(`Started session: ${session.title}`, 'success');
        
        // Open timer modal (if timer.js is loaded)
        if (typeof timer !== 'undefined') {
            timer.start(session);
        }
    }

    editSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Populate form with session data
        document.getElementById('sessionTitle').value = session.title;
        document.getElementById('sessionDate').value = session.date;
        document.getElementById('sessionTime').value = session.time;
        document.getElementById('sessionDuration').value = session.duration;
        document.getElementById('sessionCategory').value = session.category;
        document.getElementById('sessionNotes').value = session.notes || '';
        document.getElementById('enableNotifications').checked = session.notifications;

        // Switch to schedule tab
        this.showTab('schedule');
        
        // Remove the old session
        this.deleteSession(sessionId, false);
    }

    deleteSession(sessionId, showConfirm = true) {
        if (showConfirm && !confirm('Are you sure you want to delete this session?')) {
            return;
        }

        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.saveSessions();
        this.showNotification('Session deleted', 'success');
        this.updateDashboard();
        this.renderSessions();
    }

    checkNotifications() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;

        const now = new Date();
        const reminderTime = currentUser.preferences.reminderTime || 10;
        
        this.sessions
            .filter(s => s.userId === currentUser.id && s.status === 'upcoming' && s.notifications)
            .forEach(session => {
                const sessionTime = new Date(`${session.date}T${session.time}`);
                const notificationTime = new Date(sessionTime.getTime() - reminderTime * 60 * 1000);
                
                if (now >= notificationTime && now < sessionTime) {
                    this.showSessionNotification(session);
                }
            });
    }

    showSessionNotification(session) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Quiet Hours Reminder', {
                body: `Your "${session.title}" session starts in ${authSystem.getUserPreferences().reminderTime} minutes`,
                icon: '/favicon.ico'
            });
        }
        
        this.showNotification(`Reminder: ${session.title} starts soon!`, 'warning');
    }

    updateAnalytics() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;

        const userSessions = this.sessions.filter(s => s.userId === currentUser.id);
        
        // Update analytics (if analytics.js is loaded)
        if (typeof analytics !== 'undefined') {
            analytics.update(userSessions);
        }
    }

    loadSettings() {
        const user = authSystem.getCurrentUser();
        if (user) {
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const emailNotifications = document.getElementById('emailNotifications');
            const reminderTime = document.getElementById('reminderTime');

            if (profileName) profileName.value = user.name;
            if (profileEmail) profileEmail.value = user.email;
            if (emailNotifications) emailNotifications.checked = user.preferences.emailNotifications;
            if (reminderTime) reminderTime.value = user.preferences.reminderTime;
        }
    }

    saveSessions() {
        localStorage.setItem('quietHoursSessions', JSON.stringify(this.sessions));
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = notification.querySelector('.notification-message');
        const iconElement = notification.querySelector('.notification-icon');
        
        if (!notification || !messageElement || !iconElement) return;

        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        iconElement.className = `notification-icon ${icons[type] || icons.info}`;
        
        // Show notification
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Quick schedule functions
function quickSchedule(duration) {
    const now = new Date();
    const sessionTime = new Date(now.getTime() + 2 * 60 * 1000); // Start in 2 minutes
    
    const session = {
        id: Date.now().toString(),
        userId: authSystem.getCurrentUser()?.id,
        title: `Quick ${duration}min Session`,
        date: sessionTime.toISOString().split('T')[0],
        time: sessionTime.toTimeString().slice(0, 5),
        duration: duration,
        category: 'study',
        notes: 'Quick session',
        notifications: true,
        recurring: false,
        status: 'upcoming',
        createdAt: new Date().toISOString()
    };
    
    app.sessions.push(session);
    app.saveSessions();
    app.showNotification(`Quick ${duration}-minute session scheduled!`, 'success');
    app.updateDashboard();
}

function resetForm() {
    if (app) {
        app.resetForm();
    }
}

// Global functions for timer integration
function closeTimer() {
    const modal = document.getElementById('timerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function pauseTimer() {
    if (typeof timer !== 'undefined') {
        timer.pause();
    }
}

function stopTimer() {
    if (typeof timer !== 'undefined') {
        timer.stop();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuietHoursApp();
});