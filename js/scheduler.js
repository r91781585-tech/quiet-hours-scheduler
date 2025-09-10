// Advanced scheduling functionality with CRON-like features
class AdvancedScheduler {
    constructor() {
        this.scheduledTasks = JSON.parse(localStorage.getItem('scheduledTasks')) || [];
        this.recurringPatterns = new Map();
        this.conflictResolver = new ConflictResolver();
        
        this.init();
    }

    init() {
        this.setupRecurringPatterns();
        this.processScheduledTasks();
        this.startScheduler();
    }

    setupRecurringPatterns() {
        // Define recurring patterns similar to CRON
        this.recurringPatterns.set('daily', {
            name: 'Daily',
            description: 'Every day at the same time',
            generator: (baseDate, endDate) => this.generateDailyDates(baseDate, endDate)
        });

        this.recurringPatterns.set('weekly', {
            name: 'Weekly',
            description: 'Same day of the week',
            generator: (baseDate, endDate) => this.generateWeeklyDates(baseDate, endDate)
        });

        this.recurringPatterns.set('monthly', {
            name: 'Monthly',
            description: 'Same date each month',
            generator: (baseDate, endDate) => this.generateMonthlyDates(baseDate, endDate)
        });

        this.recurringPatterns.set('weekdays', {
            name: 'Weekdays',
            description: 'Monday through Friday',
            generator: (baseDate, endDate) => this.generateWeekdayDates(baseDate, endDate)
        });

        this.recurringPatterns.set('custom', {
            name: 'Custom',
            description: 'Custom pattern',
            generator: (baseDate, endDate, pattern) => this.generateCustomDates(baseDate, endDate, pattern)
        });
    }

    scheduleSession(sessionData) {
        // Validate session data
        if (!this.validateSessionData(sessionData)) {
            throw new Error('Invalid session data');
        }

        // Check for conflicts
        const conflicts = this.findConflicts(sessionData);
        if (conflicts.length > 0) {
            return this.handleConflicts(sessionData, conflicts);
        }

        // Create session(s)
        if (sessionData.recurring) {
            return this.createRecurringSessions(sessionData);
        } else {
            return this.createSingleSession(sessionData);
        }
    }

    validateSessionData(data) {
        const required = ['title', 'date', 'time', 'duration'];
        return required.every(field => data[field] !== undefined && data[field] !== '');
    }

    findConflicts(newSession) {
        const newStart = new Date(`${newSession.date}T${newSession.time}`);
        const newEnd = new Date(newStart.getTime() + newSession.duration * 60000);

        return app.sessions.filter(session => {
            if (session.status === 'completed' || session.status === 'cancelled') {
                return false;
            }

            const existingStart = new Date(`${session.date}T${session.time}`);
            const existingEnd = new Date(existingStart.getTime() + session.duration * 60000);

            // Check for overlap
            return (newStart < existingEnd && newEnd > existingStart);
        });
    }

    handleConflicts(newSession, conflicts) {
        const resolution = this.conflictResolver.resolve(newSession, conflicts);
        
        switch (resolution.action) {
            case 'reject':
                throw new Error(`Scheduling conflict: ${resolution.message}`);
            
            case 'adjust':
                return this.scheduleSession(resolution.adjustedSession);
            
            case 'replace':
                // Remove conflicting sessions
                conflicts.forEach(conflict => {
                    app.deleteSession(conflict.id);
                });
                return this.scheduleSession(newSession);
            
            case 'split':
                // Split the session around conflicts
                return this.splitAroundConflicts(newSession, conflicts);
            
            default:
                throw new Error('Unknown conflict resolution action');
        }
    }

    splitAroundConflicts(session, conflicts) {
        const sessions = [];
        const sessionStart = new Date(`${session.date}T${session.time}`);
        let currentStart = sessionStart;
        let remainingDuration = session.duration;

        // Sort conflicts by start time
        conflicts.sort((a, b) => {
            const aStart = new Date(`${a.date}T${a.time}`);
            const bStart = new Date(`${b.date}T${b.time}`);
            return aStart - bStart;
        });

        conflicts.forEach((conflict, index) => {
            const conflictStart = new Date(`${conflict.date}T${conflict.time}`);
            const conflictEnd = new Date(conflictStart.getTime() + conflict.duration * 60000);

            // Create session before conflict if there's time
            if (currentStart < conflictStart) {
                const beforeDuration = Math.min(
                    (conflictStart - currentStart) / 60000,
                    remainingDuration
                );

                if (beforeDuration >= 15) { // Minimum 15 minutes
                    sessions.push({
                        ...session,
                        id: `${session.id}_part${sessions.length + 1}`,
                        time: currentStart.toTimeString().slice(0, 5),
                        duration: beforeDuration,
                        title: `${session.title} (Part ${sessions.length + 1})`
                    });

                    remainingDuration -= beforeDuration;
                }
            }

            currentStart = new Date(Math.max(conflictEnd, currentStart));
        });

        // Create final session if there's remaining time
        if (remainingDuration >= 15) {
            sessions.push({
                ...session,
                id: `${session.id}_part${sessions.length + 1}`,
                time: currentStart.toTimeString().slice(0, 5),
                duration: remainingDuration,
                title: `${session.title} (Part ${sessions.length + 1})`
            });
        }

        return sessions;
    }

    createSingleSession(sessionData) {
        const session = {
            ...sessionData,
            id: this.generateSessionId(),
            status: 'upcoming',
            createdAt: new Date().toISOString()
        };

        app.sessions.push(session);
        app.saveSessions();
        
        return [session];
    }

    createRecurringSessions(sessionData) {
        const pattern = this.recurringPatterns.get(sessionData.recurringType);
        if (!pattern) {
            throw new Error('Invalid recurring pattern');
        }

        const baseDate = new Date(sessionData.date);
        const endDate = sessionData.recurringEnd ? new Date(sessionData.recurringEnd) : 
                       new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default

        const dates = pattern.generator(baseDate, endDate, sessionData.customPattern);
        const sessions = [];

        dates.forEach((date, index) => {
            const session = {
                ...sessionData,
                id: `${this.generateSessionId()}_${index}`,
                date: date.toISOString().split('T')[0],
                status: 'upcoming',
                createdAt: new Date().toISOString(),
                recurringGroup: sessionData.id || this.generateSessionId()
            };

            // Check for conflicts on this specific date
            const conflicts = this.findConflicts(session);
            if (conflicts.length === 0) {
                sessions.push(session);
            }
        });

        app.sessions.push(...sessions);
        app.saveSessions();

        return sessions;
    }

    // Date generation methods
    generateDailyDates(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    generateWeeklyDates(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 7);
        }

        return dates;
    }

    generateMonthlyDates(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            dates.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }

        return dates;
    }

    generateWeekdayDates(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                dates.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    generateCustomDates(startDate, endDate, pattern) {
        // Custom pattern format: "2,4,6" for specific days of week
        // or "1,15" for specific days of month
        const dates = [];
        
        if (!pattern) return dates;

        const parts = pattern.split(',').map(p => parseInt(p.trim()));
        const current = new Date(startDate);

        if (pattern.includes('w')) {
            // Weekly pattern: "1w,3w,5w" (Monday, Wednesday, Friday)
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                if (parts.includes(dayOfWeek)) {
                    dates.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            }
        } else {
            // Monthly pattern: "1,15" (1st and 15th of each month)
            while (current <= endDate) {
                const dayOfMonth = current.getDate();
                if (parts.includes(dayOfMonth)) {
                    dates.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            }
        }

        return dates;
    }

    // Smart scheduling features
    findOptimalTime(date, duration, preferences = {}) {
        const {
            preferredHours = [9, 10, 11, 14, 15, 16], // Default preferred hours
            avoidHours = [12, 13], // Lunch time
            minGap = 30, // Minimum gap between sessions in minutes
            maxSessionsPerDay = 4
        } = preferences;

        const dateString = date.toISOString().split('T')[0];
        const existingSessions = app.sessions.filter(s => s.date === dateString);

        // Check if we've reached the daily limit
        if (existingSessions.length >= maxSessionsPerDay) {
            return null;
        }

        // Try each preferred hour
        for (const hour of preferredHours) {
            if (avoidHours.includes(hour)) continue;

            const proposedTime = new Date(date);
            proposedTime.setHours(hour, 0, 0, 0);

            if (this.isTimeSlotAvailable(proposedTime, duration, minGap)) {
                return proposedTime.toTimeString().slice(0, 5);
            }
        }

        return null;
    }

    isTimeSlotAvailable(startTime, duration, minGap) {
        const endTime = new Date(startTime.getTime() + duration * 60000);
        const dateString = startTime.toISOString().split('T')[0];
        
        const existingSessions = app.sessions.filter(s => 
            s.date === dateString && s.status !== 'completed' && s.status !== 'cancelled'
        );

        return !existingSessions.some(session => {
            const sessionStart = new Date(`${session.date}T${session.time}`);
            const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);
            
            // Check for overlap with minimum gap
            const gapStart = new Date(startTime.getTime() - minGap * 60000);
            const gapEnd = new Date(endTime.getTime() + minGap * 60000);
            
            return (gapStart < sessionEnd && gapEnd > sessionStart);
        });
    }

    // Batch operations
    batchSchedule(sessions) {
        const results = {
            successful: [],
            failed: [],
            conflicts: []
        };

        sessions.forEach(sessionData => {
            try {
                const scheduled = this.scheduleSession(sessionData);
                results.successful.push(...scheduled);
            } catch (error) {
                results.failed.push({
                    session: sessionData,
                    error: error.message
                });
            }
        });

        return results;
    }

    // Template system
    saveTemplate(name, sessionData) {
        const templates = JSON.parse(localStorage.getItem('sessionTemplates')) || {};
        templates[name] = {
            ...sessionData,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('sessionTemplates', JSON.stringify(templates));
    }

    loadTemplate(name) {
        const templates = JSON.parse(localStorage.getItem('sessionTemplates')) || {};
        return templates[name] || null;
    }

    getTemplates() {
        return JSON.parse(localStorage.getItem('sessionTemplates')) || {};
    }

    // Scheduling suggestions
    suggestSchedule(preferences) {
        const suggestions = [];
        const today = new Date();
        
        // Suggest based on historical patterns
        const historicalData = this.analyzeHistoricalPatterns();
        
        // Suggest optimal times for the next 7 days
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            const optimalTime = this.findOptimalTime(date, 60, preferences);
            if (optimalTime) {
                suggestions.push({
                    date: date.toISOString().split('T')[0],
                    time: optimalTime,
                    confidence: this.calculateConfidence(date, optimalTime, historicalData)
                });
            }
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    analyzeHistoricalPatterns() {
        const completedSessions = app.sessions.filter(s => s.status === 'completed');
        const patterns = {
            hourPreferences: {},
            dayPreferences: {},
            durationPreferences: {},
            categoryPreferences: {}
        };

        completedSessions.forEach(session => {
            const sessionDate = new Date(`${session.date}T${session.time}`);
            const hour = sessionDate.getHours();
            const day = sessionDate.getDay();

            patterns.hourPreferences[hour] = (patterns.hourPreferences[hour] || 0) + 1;
            patterns.dayPreferences[day] = (patterns.dayPreferences[day] || 0) + 1;
            patterns.durationPreferences[session.duration] = (patterns.durationPreferences[session.duration] || 0) + 1;
            patterns.categoryPreferences[session.category] = (patterns.categoryPreferences[session.category] || 0) + 1;
        });

        return patterns;
    }

    calculateConfidence(date, time, patterns) {
        const hour = parseInt(time.split(':')[0]);
        const day = date.getDay();
        
        const hourScore = patterns.hourPreferences[hour] || 0;
        const dayScore = patterns.dayPreferences[day] || 0;
        
        const maxHourScore = Math.max(...Object.values(patterns.hourPreferences), 1);
        const maxDayScore = Math.max(...Object.values(patterns.dayPreferences), 1);
        
        return (hourScore / maxHourScore + dayScore / maxDayScore) / 2;
    }

    // Utility methods
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    processScheduledTasks() {
        // Process any scheduled tasks that need to be executed
        const now = new Date();
        
        this.scheduledTasks.forEach(task => {
            const taskTime = new Date(task.scheduledFor);
            if (taskTime <= now && !task.executed) {
                this.executeTask(task);
                task.executed = true;
            }
        });

        this.saveScheduledTasks();
    }

    executeTask(task) {
        switch (task.type) {
            case 'session_reminder':
                notifications.showSessionReminder(task.data.session);
                break;
            case 'break_reminder':
                notifications.showBreakReminder(task.data.duration);
                break;
            default:
                console.log('Unknown task type:', task.type);
        }
    }

    startScheduler() {
        // Run scheduler every minute
        setInterval(() => {
            this.processScheduledTasks();
        }, 60000);
    }

    saveScheduledTasks() {
        localStorage.setItem('scheduledTasks', JSON.stringify(this.scheduledTasks));
    }
}

// Conflict resolution system
class ConflictResolver {
    resolve(newSession, conflicts) {
        // Simple resolution strategy - can be made more sophisticated
        const totalConflictDuration = conflicts.reduce((sum, c) => sum + c.duration, 0);
        
        if (totalConflictDuration >= newSession.duration) {
            return {
                action: 'reject',
                message: 'Too many conflicts to resolve automatically'
            };
        }

        // Try to find a nearby time slot
        const adjustedTime = this.findNearbySlot(newSession);
        if (adjustedTime) {
            return {
                action: 'adjust',
                adjustedSession: {
                    ...newSession,
                    time: adjustedTime
                }
            };
        }

        return {
            action: 'split',
            message: 'Session will be split around conflicts'
        };
    }

    findNearbySlot(session) {
        const sessionDate = new Date(`${session.date}T${session.time}`);
        
        // Try slots 30 minutes before and after
        for (let offset of [-30, 30, -60, 60, -90, 90]) {
            const testTime = new Date(sessionDate.getTime() + offset * 60000);
            const testTimeString = testTime.toTimeString().slice(0, 5);
            
            const testSession = { ...session, time: testTimeString };
            const conflicts = scheduler.findConflicts(testSession);
            
            if (conflicts.length === 0) {
                return testTimeString;
            }
        }
        
        return null;
    }
}

// Initialize scheduler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.scheduler = new AdvancedScheduler();
});

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedScheduler, ConflictResolver };
}