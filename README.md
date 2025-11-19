# LAN Quiz Application with Anti-Malpractice Security

A complete quiz/examination system that runs on your Local Area Network (LAN) with built-in anti-malpractice features.

## Features

### For Students:
- ✅ User registration with name
- ✅ Full-screen exam mode (mandatory)
- ✅ Real-time malpractice detection:
  - Tab switching detection
  - Window switching detection
  - Full-screen exit detection
  - Browser minimization detection
- ✅ Warning system for violations
- ✅ Progress tracking
- ✅ Live scoreboard after completion

### For Administrators:
- ✅ Start/Stop exam sessions
- ✅ Add/Delete questions
- ✅ View all questions
- ✅ Live scoreboard with malpractice counts
- ✅ Exam status monitoring

## Installation Guide

### Prerequisites

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MySQL** (v5.7 or higher)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP which includes MySQL

### Step 1: Setup MySQL Database

1. Start MySQL server
2. Open MySQL command line or MySQL Workbench
3. Run these commands:

```sql
CREATE DATABASE quiz_app;
```

4. Note your MySQL credentials:
   - Username (usually `root`)
   - Password (set during MySQL installation)

### Step 2: Project Setup

1. **Create project folder:**
```bash
mkdir lan-quiz-app
cd lan-quiz-app
```

2. **Create folder structure:**
```bash
mkdir public
```

3. **Save the files:**
   - Save `server.js` in the root folder
   - Save `package.json` in the root folder
   - Save `index.html` in the `public` folder
   - Save `admin.html` in the `public` folder

4. **Update database credentials in server.js:**

Open `server.js` and update line 20-21:
```javascript
user: 'root',           // Your MySQL username
password: 'your_password',  // Your MySQL password
```

### Step 3: Install Dependencies

Open terminal/command prompt in the project folder and run:

```bash
npm install
```

This will install:
- Express (web framework)
- MySQL2 (database driver)
- Express-session (session management)

### Step 4: Start the Server

```bash
npm start
```

You should see output like:
```
=================================
Quiz App Server Running
=================================
Local: http://localhost:3000
LAN: http://192.168.1.100:3000
Admin Panel: http://192.168.1.100:3000/admin
=================================
```

## Usage

### For Server Computer:

1. Start the application: `npm start`
2. Note the LAN IP address shown (e.g., `192.168.1.100`)
3. Keep the server running during the exam

### For Admin:

1. Open browser and go to: `http://YOUR_LAN_IP:3000/admin`
2. Add questions using the form
3. Click "Start Exam" when ready
4. Monitor the scoreboard
5. Click "End Exam" when finished

### For Students:

1. Open browser and go to: `http://YOUR_LAN_IP:3000`
2. Wait for exam to be active (green status)
3. Enter your name and click "Start Exam"
4. Answer questions (full-screen mode will activate)
5. Navigate using Previous/Next buttons
6. Click "Submit Exam" when finished
7. View your score and the scoreboard

## Anti-Malpractice Features

The system detects and warns about:
- **Tab Switching**: Student switches to another browser tab
- **Window Switching**: Student switches to another application
- **Full-screen Exit**: Student exits full-screen mode
- **Browser Minimization**: Student minimizes the browser

Each violation is:
- Recorded in the database
- Shown as a warning to the student
- Displayed on the scoreboard
- Counted in the student's final record

## Network Setup

### Finding Your LAN IP:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

### Firewall Settings:

Make sure port 3000 is allowed:

**Windows Firewall:**
1. Windows Security → Firewall & Network Protection
2. Advanced Settings → Inbound Rules → New Rule
3. Port → TCP → 3000 → Allow

**Mac Firewall:**
1. System Preferences → Security & Privacy → Firewall
2. Firewall Options → Add application (Node.js)

## Troubleshooting

### Students can't connect:
- Check if server computer and student computers are on same network
- Verify firewall allows port 3000
- Try pinging the server IP from student computer
- Ensure server is running (check terminal)

### Database errors:
- Verify MySQL is running
- Check MySQL credentials in server.js
- Ensure database `quiz_app` exists
- Check MySQL user has proper permissions

### Full-screen not working:
- Must be triggered by user interaction (button click)
- Some browsers require HTTPS for full-screen API
- Try different browsers (Chrome/Firefox recommended)

### Malpractice detection not working:
- Ensure JavaScript is enabled
- Test with Chrome or Firefox
- Check browser console for errors

## Database Schema

The application creates these tables automatically:

- **questions**: Stores quiz questions and answers
- **exam_sessions**: Tracks active/inactive exam sessions
- **participants**: Stores student information and scores
- **answers**: Records all submitted answers

## Security Recommendations

1. **Change session secret** in server.js (line 14)
2. **Use strong MySQL password**
3. **Run on private LAN only** (not exposed to internet)
4. **Backup database** before each exam
5. **Clear old data** periodically

## Customization

### Change port (default 3000):
```javascript
const PORT = 3000; // Change this in server.js line 7
```

### Session duration:
```javascript
cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours in server.js line 17
```

### Exam time limit:
Add timer functionality in index.html (requires code modification)

## Support

For issues:
1. Check server terminal for error messages
2. Check browser console (F12) for client errors
3. Verify MySQL connection and credentials
4. Ensure all files are in correct locations

## Production Tips

1. **Test before exam day**: Run a mock exam with friends
2. **Stable network**: Use wired connections when possible
3. **Backup power**: UPS for server computer
4. **Monitor during exam**: Keep admin panel open
5. **Student instructions**: Print/display connection URL clearly

## License

MIT License - Free to use and modify

---

**Important**: This is an educational tool. For high-stakes exams, consider professional proctoring solutions.
