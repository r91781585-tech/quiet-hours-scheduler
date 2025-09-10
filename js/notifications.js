// Notification system for reminders and alerts
class NotificationSystem {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem('quietHoursNotifications')) || [];
        this.permission = 'default';
        this.serviceWorker = null;
        
        this.init();
    }

    async init() {
        await this.requestPermission();
        this.setupServiceWorker();
        this.scheduleNotifications();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for visibility changes to handle notifications when app is not visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.clearPendingNotifications();
            }
        });

        // Listen for session changes
        document.addEventListener('sessionUpdated', (e) => {
            this.scheduleSessionNotification(e.detail.session);
        });
    }

    async requestPermission() {
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
            
            if (this.permission === 'granted') {
                app.showNotification('Notifications enabled!', 'success');
            } else if (this.permission === 'denied') {
                app.showNotification('Notifications blocked. Enable in browser settings.', 'warning');
            }
        } else {
            console.log('This browser does not support notifications');
        }
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.serviceWorker = registration;
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    scheduleNotifications() {
        // Clear existing scheduled notifications
        this.clearScheduledNotifications();
        
        // Schedule notifications for upcoming sessions
        app.sessions
            .filter(session => session.status === 'upcoming' && session.notifications)
            .forEach(session => {
                this.scheduleSessionNotification(session);
            });
    }

    scheduleSessionNotification(session) {
        if (!session.notifications || this.permission !== 'granted') return;

        const sessionTime = new Date(`${session.date}T${session.time}`);
        const notificationTime = new Date(sessionTime.getTime() - 10 * 60 * 1000); // 10 minutes before
        const now = new Date();

        if (notificationTime > now) {
            const timeoutId = setTimeout(() => {
                this.showSessionReminder(session);
            }, notificationTime.getTime() - now.getTime());

            // Store notification for cleanup
            this.notifications.push({
                id: `session_${session.id}`,
                sessionId: session.id,
                timeoutId: timeoutId,
                scheduledFor: notificationTime.toISOString(),
                type: 'session_reminder'
            });

            this.saveNotifications();
        }
    }

    showSessionReminder(session) {
        const title = 'Quiet Hours Reminder';
        const body = `Your "${session.title}" session starts in 10 minutes`;
        const options = {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `session_${session.id}`,
            requireInteraction: true,
            actions: [
                {
                    action: 'start',
                    title: 'Start Now'
                },
                {
                    action: 'snooze',
                    title: 'Snooze 5min'
                }
            ],
            data: {
                sessionId: session.id,
                type: 'session_reminder'
            }
        };

        // Show browser notification
        if (this.permission === 'granted') {
            const notification = new Notification(title, options);
            
            notification.onclick = () => {
                window.focus();
                app.startSession(session.id);
                notification.close();
            };

            // Auto-close after 30 seconds
            setTimeout(() => {
                notification.close();
            }, 30000);
        }

        // Show in-app notification
        app.showNotification(body, 'warning');

        // Play notification sound
        this.playNotificationSound();

        // Remove from scheduled notifications
        this.notifications = this.notifications.filter(n => n.sessionId !== session.id);
        this.saveNotifications();
    }

    showBreakReminder(duration = 15) {
        const title = 'Time for a Break!';
        const body = `Take a ${duration}-minute break to recharge`;
        const options = {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'break_reminder',
            requireInteraction: false,
            data: {
                type: 'break_reminder',
                duration: duration
            }
        };

        if (this.permission === 'granted') {
            new Notification(title, options);
        }

        app.showNotification(body, 'info');
        this.playNotificationSound('break');
    }

    showCompletionCelebration(session) {
        const title = 'Session Completed! 🎉';
        const body = `Great job! You completed "${session.title}"`;
        const options = {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'completion',
            requireInteraction: false,
            data: {
                type: 'completion',
                sessionId: session.id
            }
        };

        if (this.permission === 'granted') {
            new Notification(title, options);
        }

        app.showNotification(body, 'success');
        this.playNotificationSound('success');
    }

    showStreakNotification(streak) {
        if (streak < 3) return; // Only show for meaningful streaks

        const title = `${streak}-Day Streak! 🔥`;
        const body = `You're on fire! Keep up the great work!`;
        const options = {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'streak',
            requireInteraction: false,
            data: {
                type: 'streak',
                streak: streak
            }
        };

        if (this.permission === 'granted') {
            new Notification(title, options);
        }

        app.showNotification(body, 'success');
        this.playNotificationSound('achievement');
    }

    showDailyGoalNotification(completed, goal) {
        const title = 'Daily Goal Achieved! 🎯';
        const body = `You've completed ${completed} out of ${goal} sessions today!`;
        const options = {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'daily_goal',
            requireInteraction: false,
            data: {
                type: 'daily_goal',
                completed: completed,
                goal: goal
            }
        };

        if (this.permission === 'granted') {
            new Notification(title, options);
        }

        app.showNotification(body, 'success');
        this.playNotificationSound('achievement');
    }

    playNotificationSound(type = 'default') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            let frequencies;
            switch (type) {
                case 'success':
                    frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - success chord
                    break;
                case 'break':
                    frequencies = [440, 554.37]; // A4, C#5 - gentle reminder
                    break;
                case 'achievement':
                    frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 - celebration
                    break;
                default:
                    frequencies = [800, 1000]; // Simple notification
            }
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime + index * 0.1);
                oscillator.stop(audioContext.currentTime + index * 0.1 + 0.2);
            });
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    clearScheduledNotifications() {
        this.notifications.forEach(notification => {
            if (notification.timeoutId) {
                clearTimeout(notification.timeoutId);
            }
        });
        this.notifications = [];
        this.saveNotifications();
    }

    clearPendingNotifications() {
        // Clear any pending browser notifications when app becomes visible
        if ('serviceWorker' in navigator && this.serviceWorker) {
            this.serviceWorker.getNotifications().then(notifications => {
                notifications.forEach(notification => {
                    if (notification.tag && notification.tag.startsWith('session_')) {
                        notification.close();
                    }
                });
            });
        }
    }

    snoozeNotification(sessionId, minutes = 5) {
        const session = app.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
        
        const timeoutId = setTimeout(() => {
            this.showSessionReminder(session);
        }, minutes * 60 * 1000);

        this.notifications.push({
            id: `snooze_${sessionId}`,
            sessionId: sessionId,
            timeoutId: timeoutId,
            scheduledFor: snoozeTime.toISOString(),
            type: 'snooze_reminder'
        });

        this.saveNotifications();
        app.showNotification(`Reminder snoozed for ${minutes} minutes`, 'info');
    }

    // Smart notifications based on user behavior
    analyzeAndSuggest() {
        const sessions = app.sessions.filter(s => s.status === 'completed');
        const now = new Date();
        const currentHour = now.getHours();
        
        // Suggest optimal study time based on past performance
        const hourPerformance = {};
        sessions.forEach(session => {
            const hour = new Date(`${session.date}T${session.time}`).getHours();
            hourPerformance[hour] = (hourPerformance[hour] || 0) + 1;
        });

        const bestHours = Object.entries(hourPerformance)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));

        if (bestHours.includes(currentHour) && !this.hasActiveSession()) {
            this.suggestStudySession();
        }

        // Suggest break if studying for too long
        if (this.hasActiveSession() && this.getActiveSessionDuration() > 90) {
            this.suggestBreak();
        }
    }

    suggestStudySession() {
        const title = 'Perfect Time to Study!';
        const body = 'Based on your patterns, now is a great time for a study session';
        
        app.showNotification(body, 'info');
    }

    suggestBreak() {
        const title = 'Consider Taking a Break';
        const body = 'You\'ve been studying for a while. A short break might help!';
        
        app.showNotification(body, 'warning');
    }

    hasActiveSession() {
        return app.currentSession !== null;
    }

    getActiveSessionDuration() {
        if (!app.currentSession || !app.currentSession.startedAt) return 0;
        
        const startTime = new Date(app.currentSession.startedAt);
        const now = new Date();
        return (now.getTime() - startTime.getTime()) / (1000 * 60); // minutes
    }

    // Notification preferences
    updatePreferences(preferences) {
        const settings = {
            sessionReminders: preferences.sessionReminders ?? true,
            breakReminders: preferences.breakReminders ?? true,
            completionCelebrations: preferences.completionCelebrations ?? true,
            streakNotifications: preferences.streakNotifications ?? true,
            smartSuggestions: preferences.smartSuggestions ?? true,
            soundEnabled: preferences.soundEnabled ?? true,
            reminderMinutes: preferences.reminderMinutes ?? 10
        };

        localStorage.setItem('notificationPreferences', JSON.stringify(settings));
        app.showNotification('Notification preferences updated', 'success');
    }

    getPreferences() {
        return JSON.parse(localStorage.getItem('notificationPreferences')) || {
            sessionReminders: true,
            breakReminders: true,
            completionCelebrations: true,
            streakNotifications: true,
            smartSuggestions: true,
            soundEnabled: true,
            reminderMinutes: 10
        };
    }

    saveNotifications() {
        // Only save non-timeout data
        const saveData = this.notifications.map(n => ({
            id: n.id,
            sessionId: n.sessionId,
            scheduledFor: n.scheduledFor,
            type: n.type
        }));
        localStorage.setItem('quietHoursNotifications', JSON.stringify(saveData));
    }

    // Test notification
    testNotification() {
        const title = 'Test Notification';
        const body = 'Notifications are working correctly!';
        
        if (this.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
        }
        
        app.showNotification(body, 'success');
        this.playNotificationSound();
    }
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notifications = new NotificationSystem();
    
    // Run smart analysis every 30 minutes
    setInterval(() => {
        notifications.analyzeAndSuggest();
    }, 30 * 60 * 1000);
});

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}