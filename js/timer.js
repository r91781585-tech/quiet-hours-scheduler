// Timer functionality for active sessions
class SessionTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeRemaining = 0;
        this.totalTime = 0;
        this.timerInterval = null;
        this.currentSession = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal when clicking outside
        document.getElementById('timerModal').addEventListener('click', (e) => {
            if (e.target.id === 'timerModal') {
                this.closeTimer();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isRunning) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.togglePause();
                } else if (e.code === 'Escape') {
                    this.closeTimer();
                }
            }
        });
    }

    startTimer(session) {
        this.currentSession = session;
        this.totalTime = session.duration * 60; // Convert to seconds
        this.timeRemaining = this.totalTime;
        this.isRunning = true;
        this.isPaused = false;

        this.showTimerModal();
        this.updateTimerDisplay();
        this.startCountdown();

        // Request notification permission
        this.requestNotificationPermission();
    }

    startCountdown() {
        this.timerInterval = setInterval(() => {
            if (!this.isPaused && this.timeRemaining > 0) {
                this.timeRemaining--;
                this.updateTimerDisplay();
                this.updateProgress();

                // Check for warnings
                if (this.timeRemaining === 300) { // 5 minutes left
                    this.showWarning();
                    this.sendNotification('5 minutes remaining in your study session');
                } else if (this.timeRemaining === 60) { // 1 minute left
                    this.showDanger();
                    this.sendNotification('1 minute remaining in your study session');
                } else if (this.timeRemaining === 0) {
                    this.completeTimer();
                }
            }
        }, 1000);
    }

    pauseTimer() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        const icon = pauseBtn.querySelector('i');
        
        if (this.isPaused) {
            icon.className = 'fas fa-play';
            pauseBtn.title = 'Resume';
            this.showNotification('Timer paused', 'warning');
        } else {
            icon.className = 'fas fa-pause';
            pauseBtn.title = 'Pause';
            this.showNotification('Timer resumed', 'success');
        }
    }

    stopTimer() {
        if (confirm('Are you sure you want to stop the session?')) {
            this.isRunning = false;
            this.isPaused = false;
            clearInterval(this.timerInterval);
            
            // Mark session as incomplete
            if (this.currentSession) {
                this.currentSession.status = 'incomplete';
                this.currentSession.stoppedAt = new Date().toISOString();
                this.currentSession.timeSpent = this.totalTime - this.timeRemaining;
                app.saveSessions();
            }

            this.closeTimer();
            this.showNotification('Session stopped', 'warning');
            app.updateDashboard();
        }
    }

    completeTimer() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        
        // Mark session as completed
        if (this.currentSession) {
            app.completeSession(this.currentSession.id);
        }

        this.showCompletionModal();
        this.sendNotification('Study session completed! Great job!');
        this.playCompletionSound();
    }

    showTimerModal() {
        const modal = document.getElementById('timerModal');
        modal.classList.add('active');
        
        // Update session info
        const modalHeader = modal.querySelector('.modal-header h2');
        modalHeader.textContent = this.currentSession.title;
        
        // Reset timer styles
        const timerProgress = document.getElementById('timerProgress');
        timerProgress.classList.remove('timer-warning', 'timer-danger');
        timerProgress.parentElement.classList.add('timer-active');
    }

    closeTimer() {
        const modal = document.getElementById('timerModal');
        modal.classList.remove('active');
        
        if (this.isRunning) {
            this.stopTimer();
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timerTime').textContent = timeString;
        
        // Update document title
        document.title = `${timeString} - ${this.currentSession.title} | Quiet Hours`;
        
        // Update label based on time remaining
        const label = document.getElementById('timerLabel');
        if (this.timeRemaining > 300) {
            label.textContent = 'Focus Time';
        } else if (this.timeRemaining > 60) {
            label.textContent = 'Almost Done';
        } else {
            label.textContent = 'Final Minute';
        }
    }

    updateProgress() {
        const progress = ((this.totalTime - this.timeRemaining) / this.totalTime) * 283;
        const timerProgress = document.getElementById('timerProgress');
        timerProgress.style.strokeDashoffset = 283 - progress;
    }

    showWarning() {
        const timerProgress = document.getElementById('timerProgress');
        timerProgress.classList.add('timer-warning');
        
        // Add pulsing animation
        const timerCircle = document.querySelector('.timer-circle');
        timerCircle.classList.add('animate-pulse');
    }

    showDanger() {
        const timerProgress = document.getElementById('timerProgress');
        timerProgress.classList.remove('timer-warning');
        timerProgress.classList.add('timer-danger');
        
        // Add more intense animation
        const timerCircle = document.querySelector('.timer-circle');
        timerCircle.classList.remove('animate-pulse');
        timerCircle.classList.add('animate-glow');
    }

    showCompletionModal() {
        const modal = document.getElementById('timerModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div class="completion-celebration">
                <div class="completion-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <h3>Session Completed!</h3>
                <p>Congratulations! You've successfully completed your ${this.currentSession.duration}-minute study session.</p>
                <div class="completion-stats">
                    <div class="stat">
                        <span class="stat-value">${this.currentSession.duration}</span>
                        <span class="stat-label">Minutes Focused</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.currentSession.category}</span>
                        <span class="stat-label">Category</span>
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="btn btn-primary" onclick="timer.closeTimer()">
                        <i class="fas fa-check"></i>
                        Done
                    </button>
                    <button class="btn btn-secondary" onclick="timer.scheduleBreak()">
                        <i class="fas fa-coffee"></i>
                        Take a Break
                    </button>
                </div>
            </div>
        `;

        // Add celebration animation
        setTimeout(() => {
            modalBody.querySelector('.completion-celebration').classList.add('animate-bounce');
        }, 100);

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.classList.contains('active')) {
                this.closeTimer();
            }
        }, 10000);
    }

    scheduleBreak() {
        const breakDuration = Math.min(15, Math.floor(this.currentSession.duration / 4));
        
        const breakSession = {
            id: Date.now().toString(),
            title: `Break after ${this.currentSession.title}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            duration: breakDuration,
            category: 'break',
            notes: 'Scheduled break',
            notifications: true,
            recurring: false,
            status: 'upcoming',
            createdAt: new Date().toISOString()
        };

        app.sessions.push(breakSession);
        app.saveSessions();
        app.showNotification(`${breakDuration}-minute break scheduled!`, 'success');
        
        this.closeTimer();
        app.updateDashboard();
    }

    togglePause() {
        if (this.isRunning) {
            this.pauseTimer();
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    sendNotification(message) {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Quiet Hours Scheduler', {
                body: message,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }

        // In-app notification
        app.showNotification(message, 'info');
    }

    playCompletionSound() {
        // Create a simple completion sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a sequence of tones
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime + index * 0.15);
                oscillator.stop(audioContext.currentTime + index * 0.15 + 0.3);
            });
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    showNotification(message, type) {
        app.showNotification(message, type);
    }

    // Pomodoro technique integration
    startPomodoro(workMinutes = 25, breakMinutes = 5) {
        const pomodoroSession = {
            id: Date.now().toString(),
            title: 'Pomodoro Session',
            duration: workMinutes,
            category: 'pomodoro',
            notes: `Pomodoro: ${workMinutes}min work, ${breakMinutes}min break`,
            status: 'active'
        };

        this.startTimer(pomodoroSession);
        
        // Schedule break after completion
        this.pomodoroBreakDuration = breakMinutes;
    }

    // Focus mode - blocks distractions
    enableFocusMode() {
        // Hide non-essential UI elements
        document.body.classList.add('focus-mode');
        
        // Show focus overlay
        const focusOverlay = document.createElement('div');
        focusOverlay.className = 'focus-overlay';
        focusOverlay.innerHTML = `
            <div class="focus-message">
                <h2>Focus Mode Active</h2>
                <p>Stay focused on your study session</p>
                <div class="focus-timer" id="focusTimer"></div>
            </div>
        `;
        document.body.appendChild(focusOverlay);
    }

    disableFocusMode() {
        document.body.classList.remove('focus-mode');
        const focusOverlay = document.querySelector('.focus-overlay');
        if (focusOverlay) {
            focusOverlay.remove();
        }
    }
}

// Global timer functions
function pauseTimer() {
    timer.pauseTimer();
}

function stopTimer() {
    timer.stopTimer();
}

function closeTimer() {
    timer.closeTimer();
}

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.timer = new SessionTimer();
});

// Add timer methods to app
if (typeof window !== 'undefined') {
    window.showTimer = function(session) {
        timer.startTimer(session);
    };
}

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionTimer;
}