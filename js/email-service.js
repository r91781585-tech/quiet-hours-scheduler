// Email Service for sending notifications
class EmailService {
    constructor() {
        this.emailQueue = JSON.parse(localStorage.getItem('emailQueue')) || [];
        this.init();
    }

    init() {
        // Process email queue every minute
        setInterval(() => {
            this.processEmailQueue();
        }, 60000);
    }

    // Simulate email sending (in real app, this would use EmailJS or backend API)
    async sendEmail(to, subject, body, type = 'reminder') {
        try {
            // For demo purposes, we'll simulate email sending
            console.log('Sending email:', { to, subject, body, type });
            
            // In a real application, you would use a service like EmailJS:
            // await emailjs.send('service_id', 'template_id', {
            //     to_email: to,
            //     subject: subject,
            //     message: body
            // });

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Log email for demo
            this.logEmail(to, subject, body, type);
            
            return { success: true, message: 'Email sent successfully' };
        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, message: 'Failed to send email' };
        }
    }

    scheduleEmail(to, subject, body, sendTime, type = 'reminder') {
        const emailItem = {
            id: Date.now().toString(),
            to: to,
            subject: subject,
            body: body,
            sendTime: sendTime,
            type: type,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };

        this.emailQueue.push(emailItem);
        this.saveEmailQueue();
        
        console.log('Email scheduled:', emailItem);
        return emailItem.id;
    }

    async processEmailQueue() {
        const now = new Date();
        const emailsToSend = this.emailQueue.filter(email => 
            email.status === 'scheduled' && new Date(email.sendTime) <= now
        );

        for (const email of emailsToSend) {
            const result = await this.sendEmail(email.to, email.subject, email.body, email.type);
            
            // Update email status
            email.status = result.success ? 'sent' : 'failed';
            email.sentAt = new Date().toISOString();
            
            if (!result.success) {
                email.error = result.message;
            }
        }

        if (emailsToSend.length > 0) {
            this.saveEmailQueue();
        }
    }

    scheduleSessionReminder(session, user) {
        if (!user.preferences.emailNotifications) {
            return null;
        }

        const sessionTime = new Date(`${session.date}T${session.time}`);
        const reminderTime = new Date(sessionTime.getTime() - user.preferences.reminderTime * 60 * 1000);
        
        // Don't schedule if reminder time is in the past
        if (reminderTime <= new Date()) {
            return null;
        }

        const subject = `Reminder: ${session.title} starts soon`;
        const body = this.generateReminderEmail(session, user);

        return this.scheduleEmail(user.email, subject, body, reminderTime.toISOString(), 'session_reminder');
    }

    generateReminderEmail(session, user) {
        const sessionTime = new Date(`${session.date}T${session.time}`);
        const formattedTime = sessionTime.toLocaleString();

        return `
Hi ${user.name},

This is a friendly reminder that your study session "${session.title}" is starting soon.

Session Details:
• Title: ${session.title}
• Date & Time: ${formattedTime}
• Duration: ${session.duration} minutes
• Category: ${session.category}
${session.notes ? `• Notes: ${session.notes}` : ''}

Get ready to focus and make the most of your study time!

Best regards,
Quiet Hours Scheduler

---
You can manage your notification preferences in your profile settings.
        `.trim();
    }

    generateSessionSummaryEmail(sessions, user, period = 'weekly') {
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === 'completed').length;
        const totalHours = sessions.reduce((sum, s) => sum + (s.actualDuration || s.duration), 0) / 60;

        const subject = `Your ${period} study summary`;
        const body = `
Hi ${user.name},

Here's your ${period} study summary:

📊 Statistics:
• Total Sessions: ${totalSessions}
• Completed Sessions: ${completedSessions}
• Total Study Hours: ${totalHours.toFixed(1)}
• Completion Rate: ${totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%

Keep up the great work!

Best regards,
Quiet Hours Scheduler
        `.trim();

        return this.scheduleEmail(user.email, subject, body, new Date().toISOString(), 'summary');
    }

    logEmail(to, subject, body, type) {
        const emailLog = JSON.parse(localStorage.getItem('emailLog')) || [];
        emailLog.push({
            to: to,
            subject: subject,
            body: body,
            type: type,
            sentAt: new Date().toISOString()
        });

        // Keep only last 100 emails in log
        if (emailLog.length > 100) {
            emailLog.splice(0, emailLog.length - 100);
        }

        localStorage.setItem('emailLog', JSON.stringify(emailLog));
    }

    saveEmailQueue() {
        localStorage.setItem('emailQueue', JSON.stringify(this.emailQueue));
    }

    getEmailHistory() {
        return JSON.parse(localStorage.getItem('emailLog')) || [];
    }

    cancelScheduledEmail(emailId) {
        const emailIndex = this.emailQueue.findIndex(email => email.id === emailId);
        if (emailIndex !== -1) {
            this.emailQueue[emailIndex].status = 'cancelled';
            this.saveEmailQueue();
            return true;
        }
        return false;
    }

    // Integration with EmailJS (uncomment and configure for real email sending)
    /*
    async initEmailJS() {
        // Initialize EmailJS with your public key
        emailjs.init("YOUR_PUBLIC_KEY");
    }

    async sendRealEmail(to, subject, body) {
        try {
            const result = await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
                to_email: to,
                subject: subject,
                message: body,
                from_name: "Quiet Hours Scheduler"
            });
            return { success: true, result };
        } catch (error) {
            return { success: false, error };
        }
    }
    */
}

// Initialize email service
const emailService = new EmailService();