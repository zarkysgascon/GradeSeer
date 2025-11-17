## Email System Setup for Collaborators

### Development Mode (Default)
- The system runs in **simulation mode** by default
- All email notifications are logged to the console
- No real emails are sent
- Perfect for testing and development

### Testing Email System
1. Login to the app
2. Go to Notifications tab
3. Click "Test Email System"
4. Check browser console for simulation results

### Switching to Production
To send real emails, set in `.env`:
```env
NODE_ENV=production