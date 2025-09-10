// Main Application JavaScript
class QuietHoursApp {
    constructor() {
        this.sessions = JSON.parse(localStorage.getItem('quietHoursSessions')) || [];
        this.currentSession = null;
        this.currentTab = 'dashboard';
        this.theme = localStorage.getItem('theme') || 'light';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.updateDashboard();
        this.renderSessions();
        this.checkNotifications();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sessionDate').value = today;
        
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
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Form submission
        document.getElementById('scheduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.scheduleSession();
        });

        // Recurring checkbox
        document.getElementById('enableRecurring').addEventListener('change', (e) => {
            const recurringOptions = document.getElementById('recurringOptions');
            recurringOptions.style.display = e.target.checked ? 'block' : 'none';
        });

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
        themeIcon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Update content based on tab
        if (tabName === 'dashboard') {
            this.updateDashboard();
        } else if (tabName === 'sessions') {
            this.renderSessions();
        } else if (tabName === 'analytics') {
            this.updateAnalytics();
        }
    }

    scheduleSession() {
        const form = document.getElementById('scheduleForm');
        const formData = new FormData(form);
        
        const session = {
            id: Date.now().toString(),
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
            }

            // Increment date based on recurring type
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

    quickSchedule(duration) {
        const now = new Date();
        const startTime = new Date(now.getTime() + 5 * 60000); // Start in 5 minutes
        
        const session = {
            id: Date.now().toString(),
            title: `Quick ${duration}min Session`,
            date: startTime.toISOString().split('T')[0],
            time: startTime.toTimeString().slice(0, 5),
            duration: duration,
            category: 'study',
            notes: 'Quick session',
            notifications: true,
            recurring: false,
            status: 'upcoming',
            createdAt: new Date().toISOString()
        };

        if (this.hasOverlap(session)) {
            this.showNotification('Cannot schedule - time slot is occupied', 'error');
            return;
        }

        this.sessions.push(session);
        this.saveSessions();
        this.showNotification(`${duration}-minute session scheduled!`, 'success');
        this.updateDashboard();
    }

    startSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        session.status = 'active';
        session.startedAt = new Date().toISOString();
        this.currentSession = session;
        
        this.saveSessions();
        this.showTimer(session);
        this.showNotification('Session started!', 'success');
        this.updateDashboard();
    }

    completeSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        session.status = 'completed';
        session.completedAt = new Date().toISOString();
        
        if (this.currentSession && this.currentSession.id === sessionId) {
            this.currentSession = null;
        }

        this.saveSessions();
        this.showNotification('Session completed!', 'success');
        this.updateDashboard();
        this.renderSessions();
    }

    deleteSession(sessionId) {
        if (confirm('Are you sure you want to delete this session?')) {
            this.sessions = this.sessions.filter(s => s.id !== sessionId);
            this.saveSessions();
            this.showNotification('Session deleted', 'success');
            this.updateDashboard();
            this.renderSessions();
        }
    }

    filterSessions(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        const sessionsList = document.getElementById('sessionsList');
        const sessions = sessionsList.querySelectorAll('.session-card');

        sessions.forEach(card => {
            const status = card.dataset.status;
            if (filter === 'all' || status === filter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    updateDashboard() {
        this.updateStats();
        this.updateCurrentSession();
        this.updateUpcomingSessions();
    }

    updateStats() {
        const completedSessions = this.sessions.filter(s => s.status === 'completed');
        const totalHours = completedSessions.reduce((total, session) => {
            return total + session.duration;
        }, 0) / 60;

        const today = new Date().toISOString().split('T')[0];
        const todaySessions = this.sessions.filter(s => s.date === today);

        // Calculate streak
        const streak = this.calculateStreak();

        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('completedSessions').textContent = completedSessions.length;
        document.getElementById('currentStreak').textContent = streak;
        document.getElementById('todaySessions').textContent = todaySessions.length;
    }

    calculateStreak() {
        const completedSessions = this.sessions
            .filter(s => s.status === 'completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (completedSessions.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < completedSessions.length; i++) {
            const sessionDate = new Date(completedSessions[i].date);
            sessionDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === streak) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (daysDiff > streak) {
                break;
            }
        }

        return streak;
    }

    updateCurrentSession() {
        const currentSessionDiv = document.getElementById('currentSession');
        
        if (this.currentSession) {
            currentSessionDiv.innerHTML = `
                <div class="active-session">
                    <div class="session-info">
                        <h3>${this.currentSession.title}</h3>
                        <p>Duration: ${this.currentSession.duration} minutes</p>
                        <p>Started: ${new Date(this.currentSession.startedAt).toLocaleTimeString()}</p>
                    </div>
                    <div class="session-actions">
                        <button class="btn btn-primary" onclick="app.completeSession('${this.currentSession.id}')">
                            Complete Session
                        </button>
                    </div>
                </div>
            `;
        } else {
            currentSessionDiv.innerHTML = `
                <div class="no-session">
                    <i class="fas fa-moon"></i>
                    <p>No active session</p>
                    <button class="btn btn-primary" onclick="app.showTab('schedule')">
                        Schedule a Session
                    </button>
                </div>
            `;
        }
    }

    updateUpcomingSessions() {
        const upcomingDiv = document.getElementById('upcomingSessions');
        const upcoming = this.sessions
            .filter(s => s.status === 'upcoming')
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
            .slice(0, 5);

        if (upcoming.length === 0) {
            upcomingDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <p>No upcoming sessions</p>
                </div>
            `;
            return;
        }

        upcomingDiv.innerHTML = upcoming.map(session => {
            const sessionTime = new Date(`${session.date}T${session.time}`);
            const timeString = sessionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="upcoming-session">
                    <div class="upcoming-session-time">${timeString}</div>
                    <div class="upcoming-session-info">
                        <div class="upcoming-session-title">${session.title}</div>
                        <div class="upcoming-session-duration">${session.duration} minutes</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSessions() {
        const sessionsList = document.getElementById('sessionsList');
        
        if (this.sessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar"></i>
                    <h3>No sessions yet</h3>
                    <p>Create your first quiet study session</p>
                    <button class="btn btn-primary" onclick="app.showTab('schedule')">
                        Schedule Session
                    </button>
                </div>
            `;
            return;
        }

        const sortedSessions = this.sessions.sort((a, b) => {
            return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
        });

        sessionsList.innerHTML = sortedSessions.map(session => {
            const sessionDateTime = new Date(`${session.date}T${session.time}`);
            const now = new Date();
            
            // Update status if needed
            if (session.status === 'upcoming' && sessionDateTime < now) {
                session.status = 'missed';
                this.saveSessions();
            }

            return this.renderSessionCard(session);
        }).join('');
    }

    renderSessionCard(session) {
        const sessionDateTime = new Date(`${session.date}T${session.time}`);
        const dateString = sessionDateTime.toLocaleDateString();
        const timeString = sessionDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const statusClass = session.status;
        const statusIcon = {
            upcoming: 'fas fa-clock',
            active: 'fas fa-play',
            completed: 'fas fa-check',
            missed: 'fas fa-times'
        }[session.status];

        const actions = session.status === 'upcoming' ? `
            <button class="session-btn start" onclick="app.startSession('${session.id}')">
                <i class="fas fa-play"></i> Start
            </button>
            <button class="session-btn edit" onclick="app.editSession('${session.id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="session-btn delete" onclick="app.deleteSession('${session.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        ` : `
            <button class="session-btn delete" onclick="app.deleteSession('${session.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;

        return `
            <div class="session-card ${statusClass}" data-status="${session.status}">
                <div class="session-header">
                    <div>
                        <div class="session-title">${session.title}</div>
                        <span class="session-category">${session.category}</span>
                    </div>
                    <i class="${statusIcon}"></i>
                </div>
                <div class="session-time">
                    <i class="fas fa-calendar"></i>
                    ${dateString} at ${timeString}
                </div>
                <div class="session-duration">
                    <i class="fas fa-clock"></i>
                    ${session.duration} minutes
                </div>
                ${session.notes ? `<div class="session-notes">${session.notes}</div>` : ''}
                <div class="session-actions">
                    ${actions}
                </div>
            </div>
        `;
    }

    checkNotifications() {
        const now = new Date();
        const notificationTime = 10 * 60 * 1000; // 10 minutes in milliseconds

        this.sessions.forEach(session => {
            if (session.status !== 'upcoming' || !session.notifications) return;

            const sessionTime = new Date(`${session.date}T${session.time}`);
            const timeDiff = sessionTime.getTime() - now.getTime();

            // Notify 10 minutes before
            if (timeDiff > 0 && timeDiff <= notificationTime && !session.notified) {
                this.showNotification(
                    `Upcoming session: ${session.title} in 10 minutes`,
                    'warning'
                );
                session.notified = true;
                this.saveSessions();
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icon = notification.querySelector('.notification-icon');
        const messageEl = notification.querySelector('.notification-message');

        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        icon.className = `notification-icon ${icons[type]}`;
        messageEl.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    resetForm() {
        document.getElementById('scheduleForm').reset();
        document.getElementById('recurringOptions').style.display = 'none';
        
        // Reset date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sessionDate').value = today;
    }

    saveSessions() {
        localStorage.setItem('quietHoursSessions', JSON.stringify(this.sessions));
    }

    // Make methods available globally
    showTab(tabName) {
        this.showTab(tabName);
    }
}

// Global functions for HTML onclick handlers
function showTab(tabName) {
    app.showTab(tabName);
}

function quickSchedule(duration) {
    app.quickSchedule(duration);
}

function resetForm() {
    app.resetForm();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuietHoursApp();
});

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuietHoursApp;
}