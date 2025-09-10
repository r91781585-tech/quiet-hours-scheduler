// Analytics and data visualization
class Analytics {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        // Initialize charts when analytics tab is shown
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for tab changes
        document.addEventListener('tabChanged', (e) => {
            if (e.detail.tab === 'analytics') {
                this.updateAnalytics();
            }
        });
    }

    updateAnalytics() {
        this.updatePatternStats();
        this.createWeeklyChart();
        this.createCategoryChart();
        this.createMonthlyCalendar();
    }

    updatePatternStats() {
        const sessions = app.sessions.filter(s => s.status === 'completed');
        
        if (sessions.length === 0) {
            document.getElementById('mostProductiveHour').textContent = '--';
            document.getElementById('avgSessionLength').textContent = '--';
            document.getElementById('completionRate').textContent = '--';
            return;
        }

        // Most productive hour
        const hourCounts = {};
        sessions.forEach(session => {
            const hour = new Date(`${session.date}T${session.time}`).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const mostProductiveHour = Object.keys(hourCounts).reduce((a, b) => 
            hourCounts[a] > hourCounts[b] ? a : b
        );

        const hourString = new Date(2000, 0, 1, mostProductiveHour).toLocaleTimeString([], {
            hour: 'numeric',
            hour12: true
        });

        document.getElementById('mostProductiveHour').textContent = hourString;

        // Average session length
        const avgLength = sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length;
        document.getElementById('avgSessionLength').textContent = `${Math.round(avgLength)} min`;

        // Completion rate
        const totalSessions = app.sessions.length;
        const completionRate = (sessions.length / totalSessions) * 100;
        document.getElementById('completionRate').textContent = `${Math.round(completionRate)}%`;
    }

    createWeeklyChart() {
        const canvas = document.getElementById('weeklyChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get last 7 days of data
        const weekData = this.getWeeklyData();
        
        // Chart dimensions
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        const barWidth = chartWidth / 7;
        const maxValue = Math.max(...weekData.map(d => d.hours), 1);

        // Draw axes
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        ctx.lineWidth = 1;
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.stroke();
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw bars
        weekData.forEach((data, index) => {
            const barHeight = (data.hours / maxValue) * chartHeight;
            const x = padding + index * barWidth + barWidth * 0.1;
            const y = canvas.height - padding - barHeight;
            const width = barWidth * 0.8;

            // Bar
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            ctx.fillRect(x, y, width, barHeight);

            // Label
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(data.day, x + width / 2, canvas.height - padding + 20);

            // Value
            if (data.hours > 0) {
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
                ctx.fillText(`${data.hours.toFixed(1)}h`, x + width / 2, y - 5);
            }
        });

        // Title
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Study Hours This Week', canvas.width / 2, 20);
    }

    createCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const categoryData = this.getCategoryData();
        
        if (categoryData.length === 0) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Pie chart
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        
        const colors = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
        ];

        let currentAngle = -Math.PI / 2;
        const total = categoryData.reduce((sum, item) => sum + item.hours, 0);

        categoryData.forEach((item, index) => {
            const sliceAngle = (item.hours / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();

            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(item.category, labelX, labelY);
            ctx.fillText(`${item.hours.toFixed(1)}h`, labelX, labelY + 15);

            currentAngle += sliceAngle;
        });

        // Title
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Study Time by Category', canvas.width / 2, 20);
    }

    createMonthlyCalendar() {
        const calendar = document.getElementById('monthlyCalendar');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Get session data for the month
        const monthSessions = this.getMonthSessions(year, month);
        
        // Clear calendar
        calendar.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            header.style.fontWeight = '600';
            header.style.fontSize = '0.75rem';
            header.style.color = 'var(--text-secondary)';
            header.style.textAlign = 'center';
            header.style.padding = '0.5rem 0';
            calendar.appendChild(header);
        });
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayData = monthSessions[dateString];
            
            if (dayData && dayData.sessions > 0) {
                dayElement.classList.add('has-session');
                dayElement.title = `${dayData.sessions} session(s), ${dayData.hours.toFixed(1)} hours`;
            }
            
            // Highlight today
            if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                dayElement.style.background = 'var(--accent-color)';
                dayElement.style.color = 'white';
            }
            
            calendar.appendChild(dayElement);
        }
    }

    getWeeklyData() {
        const weekData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const daySessions = app.sessions.filter(session => 
                session.date === dateString && session.status === 'completed'
            );
            
            const hours = daySessions.reduce((sum, session) => sum + session.duration, 0) / 60;
            
            weekData.push({
                day: date.toLocaleDateString([], { weekday: 'short' }),
                date: dateString,
                hours: hours,
                sessions: daySessions.length
            });
        }
        
        return weekData;
    }

    getCategoryData() {
        const categories = {};
        
        app.sessions
            .filter(session => session.status === 'completed')
            .forEach(session => {
                const category = session.category || 'other';
                if (!categories[category]) {
                    categories[category] = { hours: 0, sessions: 0 };
                }
                categories[category].hours += session.duration / 60;
                categories[category].sessions += 1;
            });
        
        return Object.entries(categories)
            .map(([category, data]) => ({
                category: category.charAt(0).toUpperCase() + category.slice(1),
                hours: data.hours,
                sessions: data.sessions
            }))
            .sort((a, b) => b.hours - a.hours);
    }

    getMonthSessions(year, month) {
        const monthSessions = {};
        
        app.sessions
            .filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate.getFullYear() === year && 
                       sessionDate.getMonth() === month &&
                       session.status === 'completed';
            })
            .forEach(session => {
                const dateString = session.date;
                if (!monthSessions[dateString]) {
                    monthSessions[dateString] = { sessions: 0, hours: 0 };
                }
                monthSessions[dateString].sessions += 1;
                monthSessions[dateString].hours += session.duration / 60;
            });
        
        return monthSessions;
    }

    exportData() {
        const data = {
            sessions: app.sessions,
            exported: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiet-hours-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        app.showNotification('Data exported successfully!', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.sessions && Array.isArray(data.sessions)) {
                    if (confirm('This will replace all existing data. Continue?')) {
                        app.sessions = data.sessions;
                        app.saveSessions();
                        app.updateDashboard();
                        app.renderSessions();
                        this.updateAnalytics();
                        app.showNotification('Data imported successfully!', 'success');
                    }
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                app.showNotification('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    generateReport() {
        const sessions = app.sessions.filter(s => s.status === 'completed');
        const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
        const avgSessionLength = sessions.length > 0 ? totalHours / sessions.length * 60 : 0;
        
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalSessions: sessions.length,
                totalHours: totalHours.toFixed(2),
                averageSessionLength: avgSessionLength.toFixed(0) + ' minutes',
                completionRate: ((sessions.length / app.sessions.length) * 100).toFixed(1) + '%'
            },
            weeklyData: this.getWeeklyData(),
            categoryData: this.getCategoryData(),
            streak: app.calculateStreak()
        };
        
        return report;
    }

    // Productivity insights
    getProductivityInsights() {
        const sessions = app.sessions.filter(s => s.status === 'completed');
        const insights = [];
        
        if (sessions.length === 0) {
            return ['Start completing sessions to get personalized insights!'];
        }
        
        // Best time of day
        const hourCounts = {};
        sessions.forEach(session => {
            const hour = new Date(`${session.date}T${session.time}`).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const bestHour = Object.keys(hourCounts).reduce((a, b) => 
            hourCounts[a] > hourCounts[b] ? a : b
        );
        
        const timeString = new Date(2000, 0, 1, bestHour).toLocaleTimeString([], {
            hour: 'numeric',
            hour12: true
        });
        
        insights.push(`Your most productive time is around ${timeString}`);
        
        // Session length preference
        const avgLength = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;
        if (avgLength < 45) {
            insights.push('You prefer shorter, focused sessions');
        } else if (avgLength > 90) {
            insights.push('You excel at longer, deep work sessions');
        } else {
            insights.push('You maintain good balance with medium-length sessions');
        }
        
        // Consistency
        const streak = app.calculateStreak();
        if (streak >= 7) {
            insights.push(`Excellent consistency! You're on a ${streak}-day streak`);
        } else if (streak >= 3) {
            insights.push(`Good momentum with a ${streak}-day streak`);
        }
        
        // Category focus
        const categoryData = this.getCategoryData();
        if (categoryData.length > 0) {
            const topCategory = categoryData[0];
            insights.push(`You focus most on ${topCategory.category.toLowerCase()} sessions`);
        }
        
        return insights;
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new Analytics();
});

// Add analytics methods to app
if (typeof window !== 'undefined') {
    window.updateAnalytics = function() {
        analytics.updateAnalytics();
    };
}

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}