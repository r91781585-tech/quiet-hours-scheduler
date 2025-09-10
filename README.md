# Quiet Hours Scheduler

A comprehensive web application for scheduling and managing quiet study time blocks with automated notifications, analytics, and advanced scheduling features.

![Quiet Hours Scheduler](https://img.shields.io/badge/Status-Active-brightgreen) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ Features

### 📅 Smart Scheduling
- **Intuitive Session Creation**: Easy-to-use form for scheduling study sessions
- **Recurring Sessions**: Support for daily, weekly, and monthly recurring patterns
- **Conflict Detection**: Automatic overlap prevention with smart conflict resolution
- **Quick Schedule**: One-click scheduling for 30min, 1hr, and 2hr sessions
- **Template System**: Save and reuse session templates

### ⏰ Advanced Timer
- **Visual Timer**: Beautiful circular progress timer with animations
- **Session Management**: Start, pause, and stop sessions with keyboard shortcuts
- **Focus Mode**: Distraction-free environment during active sessions
- **Completion Celebrations**: Animated celebrations and achievement notifications
- **Break Scheduling**: Automatic break suggestions based on session length

### 🔔 Smart Notifications
- **Browser Notifications**: Native browser notifications with permission management
- **10-Minute Reminders**: Configurable pre-session notifications
- **Sound Alerts**: Custom audio notifications for different events
- **Smart Suggestions**: AI-powered suggestions based on usage patterns
- **Streak Notifications**: Celebrate study streaks and achievements

### 📊 Comprehensive Analytics
- **Visual Charts**: Weekly progress and category distribution charts
- **Study Patterns**: Identify your most productive hours and habits
- **Monthly Calendar**: Visual overview of study sessions
- **Progress Tracking**: Monitor completion rates and study streaks
- **Productivity Insights**: Personalized recommendations based on your data

### 🎨 Modern UI/UX
- **Dark/Light Theme**: Toggle between themes with smooth transitions
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Polished animations and micro-interactions
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Progressive Web App**: Install as a native app on any device

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server setup required - runs entirely in the browser!

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/r91781585-tech/quiet-hours-scheduler.git
   cd quiet-hours-scheduler
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   open index.html
   # or
   python -m http.server 8000  # For local development server
   ```

3. **Start scheduling!**
   - Navigate to the Schedule tab
   - Create your first study session
   - Enable notifications for the best experience

## 📱 Usage Guide

### Creating Your First Session

1. **Navigate to Schedule Tab**
   - Click the "Schedule" button in the navigation

2. **Fill Session Details**
   - **Title**: Give your session a descriptive name
   - **Date & Time**: When you want to study
   - **Duration**: How long you want to study (30min - 3hrs)
   - **Category**: Organize by subject or type
   - **Notes**: Optional additional information

3. **Configure Options**
   - ✅ Enable notifications for reminders
   - ✅ Set up recurring sessions if needed

4. **Schedule Session**
   - Click "Schedule Session" to save
   - View in Dashboard or Sessions tab

### Using the Timer

1. **Start a Session**
   - Click "Start" on any upcoming session
   - Or use Quick Actions for immediate sessions

2. **Timer Controls**
   - **Spacebar**: Pause/Resume
   - **Escape**: Close timer
   - **Visual Progress**: Watch the circular progress indicator

3. **Session Completion**
   - Automatic completion when timer reaches zero
   - Celebration animation and sound
   - Option to schedule a break

### Viewing Analytics

1. **Navigate to Analytics Tab**
   - View weekly study hours chart
   - See category distribution
   - Check study patterns and insights

2. **Monthly Calendar**
   - Visual overview of study sessions
   - Hover for session details
   - Identify study patterns

## 🛠️ Technical Architecture

### Frontend Technologies
- **HTML5**: Semantic markup with modern standards
- **CSS3**: Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript**: ES6+ features, modular architecture
- **Canvas API**: Custom charts and visualizations
- **Web APIs**: Notifications, Local Storage, Service Workers

### File Structure
```
quiet-hours-scheduler/
├── index.html              # Main application entry point
├── styles/
│   ├── main.css            # Core styles and layout
│   ├── components.css      # Component-specific styles
│   └── animations.css      # Animation definitions
├── js/
│   ├── app.js             # Main application logic
│   ├── scheduler.js       # Advanced scheduling system
│   ├── timer.js           # Session timer functionality
│   ├── analytics.js       # Data visualization and insights
│   └── notifications.js   # Notification system
└── README.md              # This file
```

### Key Features Implementation

#### Smart Scheduling System
```javascript
// Conflict detection and resolution
const conflicts = this.findConflicts(newSession);
if (conflicts.length > 0) {
    return this.handleConflicts(newSession, conflicts);
}
```

#### Advanced Timer
```javascript
// Circular progress timer with animations
const progress = ((this.totalTime - this.timeRemaining) / this.totalTime) * 283;
timerProgress.style.strokeDashoffset = 283 - progress;
```

#### Analytics Engine
```javascript
// Pattern analysis for productivity insights
const hourCounts = {};
sessions.forEach(session => {
    const hour = new Date(`${session.date}T${session.time}`).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
});
```

## 🎯 Advanced Features

### Recurring Sessions
- **Daily**: Every day at the same time
- **Weekly**: Same day of the week
- **Monthly**: Same date each month
- **Weekdays**: Monday through Friday only
- **Custom**: Define your own pattern

### Conflict Resolution
- **Automatic Detection**: Prevents scheduling overlaps
- **Smart Suggestions**: Proposes alternative times
- **Session Splitting**: Breaks sessions around conflicts
- **Batch Operations**: Handle multiple sessions at once

### Productivity Insights
- **Peak Hours**: Identify your most productive times
- **Study Streaks**: Track consecutive study days
- **Category Analysis**: See which subjects you focus on most
- **Completion Rates**: Monitor your consistency

### Notification System
- **Pre-session Reminders**: Configurable advance notifications
- **Break Suggestions**: Smart break recommendations
- **Achievement Alerts**: Celebrate milestones and streaks
- **Sound Customization**: Different sounds for different events

## 🔧 Customization

### Themes
The app supports both light and dark themes with CSS custom properties:

```css
:root {
    --primary-color: #6366f1;
    --bg-primary: #ffffff;
    --text-primary: #1e293b;
    /* ... more variables */
}

[data-theme="dark"] {
    --bg-primary: #0f172a;
    --text-primary: #f8fafc;
    /* ... dark theme overrides */
}
```

### Adding New Categories
Extend the category options in the HTML:

```html
<select id="sessionCategory">
    <option value="study">Study</option>
    <option value="work">Work</option>
    <option value="reading">Reading</option>
    <!-- Add your custom categories here -->
</select>
```

### Custom Notification Sounds
Modify the notification sound generation in `notifications.js`:

```javascript
playNotificationSound(type = 'default') {
    // Customize frequencies for different notification types
    let frequencies;
    switch (type) {
        case 'success':
            frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            break;
        // Add your custom sound patterns
    }
}
```

## 📊 Data Management

### Local Storage
All data is stored locally in your browser:
- **Sessions**: `quietHoursSessions`
- **Notifications**: `quietHoursNotifications`
- **Preferences**: `notificationPreferences`
- **Templates**: `sessionTemplates`

### Data Export/Import
```javascript
// Export your data
analytics.exportData();

// Import data from file
analytics.importData(file);
```

## 🌟 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 80+     | ✅ Full |
| Firefox | 75+     | ✅ Full |
| Safari  | 13+     | ✅ Full |
| Edge    | 80+     | ✅ Full |

### Required Features
- ES6+ JavaScript support
- CSS Grid and Flexbox
- Local Storage API
- Notification API (optional)
- Canvas API for charts

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and patterns
- Add comments for complex functionality
- Test on multiple browsers
- Ensure responsive design works
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Font Awesome** for beautiful icons
- **Google Fonts** for the Inter font family
- **Canvas API** for custom chart rendering
- **Web APIs** for modern browser features

## 📞 Support

If you encounter any issues or have questions:

1. **Check the Issues**: Look for existing solutions
2. **Create an Issue**: Describe your problem clearly
3. **Provide Details**: Include browser, OS, and steps to reproduce

## 🚀 Future Enhancements

- [ ] **Cloud Sync**: Sync data across devices
- [ ] **Team Features**: Shared study sessions
- [ ] **Integration**: Calendar and task management apps
- [ ] **AI Insights**: Advanced productivity recommendations
- [ ] **Mobile App**: Native iOS and Android apps
- [ ] **Pomodoro Integration**: Built-in Pomodoro technique
- [ ] **Study Groups**: Collaborative study sessions
- [ ] **Progress Sharing**: Social features for motivation

---

**Made with ❤️ for productive studying**

Start your focused study journey today! 🎓✨