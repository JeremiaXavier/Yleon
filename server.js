const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'quiz-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'toor', // Change this
  database: 'quiz_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please check:');
    console.error('1. MySQL is running');
    console.error('2. Database "quiz_app" exists');
    console.error('3. Username and password are correct in server.js');
  });

// Initialize database
async function initDatabase() {
  try {
    const conn = await pool.getConnection();
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        option_a VARCHAR(255) NOT NULL,
        option_b VARCHAR(255) NOT NULL,
        option_c VARCHAR(255) NOT NULL,
        option_d VARCHAR(255) NOT NULL,
        correct_answer CHAR(1) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        is_active BOOLEAN DEFAULT FALSE,
        duration_minutes INT DEFAULT 60,
        started_at TIMESTAMP NULL,
        ended_at TIMESTAMP NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        score INT DEFAULT 0,
        total_questions INT DEFAULT 0,
        exam_session_id INT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        auto_submitted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (exam_session_id) REFERENCES exam_sessions(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        participant_id INT,
        question_id INT,
        selected_answer CHAR(1),
        is_correct BOOLEAN,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (participant_id) REFERENCES participants(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    // Insert initial exam session if not exists
    const [sessions] = await conn.query('SELECT * FROM exam_sessions LIMIT 1');
    if (sessions.length === 0) {
      await conn.query('INSERT INTO exam_sessions (is_active, duration_minutes) VALUES (FALSE, 60)');
    }

    conn.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Check if exam is active
app.get('/api/exam-status', async (req, res) => {
  try {
    const [sessions] = await pool.query(
      'SELECT is_active, duration_minutes, started_at FROM exam_sessions ORDER BY id DESC LIMIT 1'
    );
    
    if (sessions.length === 0) {
      await pool.query('INSERT INTO exam_sessions (is_active, duration_minutes) VALUES (FALSE, 60)');
      return res.json({ 
        isActive: false,
        duration: 60,
        startedAt: null
      });
    }
    
    res.json({ 
      isActive: sessions[0]?.is_active || false,
      duration: sessions[0]?.duration_minutes || 60,
      startedAt: sessions[0]?.started_at
    });
  } catch (error) {
    console.error('Exam status error:', error);
    res.status(500).json({ error: 'Failed to check exam status: ' + error.message });
  }
});

// Set exam duration (Admin)
app.post('/api/admin/set-duration', async (req, res) => {
  const { duration } = req.body;
  
  try {
    const [sessions] = await pool.query('SELECT id FROM exam_sessions ORDER BY id DESC LIMIT 1');
    if (sessions.length > 0) {
      await pool.query('UPDATE exam_sessions SET duration_minutes = ? WHERE id = ?', [duration, sessions[0].id]);
    }
    res.json({ success: true, message: 'Duration updated successfully' });
  } catch (error) {
    console.error('Set duration error:', error);
    res.status(500).json({ error: 'Failed to set duration' });
  }
});

// Start exam (Admin)
app.post('/api/admin/start-exam', async (req, res) => {
  try {
    await pool.query('UPDATE exam_sessions SET is_active = TRUE, started_at = NOW()');
    res.json({ success: true, message: 'Exam started successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start exam' });
  }
});

// End exam (Admin)
app.post('/api/admin/end-exam', async (req, res) => {
  try {
    await pool.query('UPDATE exam_sessions SET is_active = FALSE, ended_at = NOW()');
    res.json({ success: true, message: 'Exam ended successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end exam' });
  }
});

// Reset database (Admin)
app.post('/api/admin/reset-all', async (req, res) => {
  try {
    await pool.query('DELETE FROM answers');
    await pool.query('DELETE FROM participants');
    await pool.query('ALTER TABLE answers AUTO_INCREMENT = 1');
    await pool.query('ALTER TABLE participants AUTO_INCREMENT = 1');
    res.json({ success: true, message: 'All answers and participants deleted' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Reset questions (Admin)
app.post('/api/admin/reset-questions', async (req, res) => {
  try {
    await pool.query('DELETE FROM answers');
    await pool.query('DELETE FROM participants');
    await pool.query('DELETE FROM questions');
    await pool.query('ALTER TABLE answers AUTO_INCREMENT = 1');
    await pool.query('ALTER TABLE participants AUTO_INCREMENT = 1');
    await pool.query('ALTER TABLE questions AUTO_INCREMENT = 1');
    res.json({ success: true, message: 'All data deleted including questions' });
  } catch (error) {
    console.error('Reset questions error:', error);
    res.status(500).json({ error: 'Failed to reset questions' });
  }
});

// Add question (Admin)
app.post('/api/admin/questions', async (req, res) => {
  const { question, option_a, option_b, option_c, option_d, correct_answer } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
      [question, option_a, option_b, option_c, option_d, correct_answer]
    );
    res.json({ success: true, message: 'Question added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Get all questions (Admin)
app.get('/api/admin/questions', async (req, res) => {
  try {
    const [questions] = await pool.query('SELECT * FROM questions ORDER BY id ASC');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Delete question (Admin)
app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Register participant
app.post('/api/register', async (req, res) => {
  const { name } = req.body;
  
  try {
    const [session] = await pool.query(
      'SELECT id FROM exam_sessions WHERE is_active = TRUE LIMIT 1'
    );
    
    if (session.length === 0) {
      return res.status(400).json({ error: 'No active exam session' });
    }

    const [result] = await pool.query(
      'INSERT INTO participants (name, exam_session_id) VALUES (?, ?)',
      [name, session[0].id]
    );
    
    req.session.participantId = result.insertId;
    req.session.participantName = name;
    
    res.json({ success: true, participantId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register participant' });
  }
});

// Get questions for exam
app.get('/api/questions', async (req, res) => {
  if (!req.session.participantId) {
    return res.status(401).json({ error: 'Not registered' });
  }

  try {
    const [questions] = await pool.query(
      'SELECT id, question, option_a, option_b, option_c, option_d FROM questions ORDER BY id ASC'
    );
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Submit answer
app.post('/api/submit-answer', async (req, res) => {
  const { questionId, answer } = req.body;
  const participantId = req.session.participantId;

  if (!participantId) {
    return res.status(401).json({ error: 'Not registered' });
  }

  try {
    const [question] = await pool.query(
      'SELECT correct_answer FROM questions WHERE id = ?',
      [questionId]
    );

    if (question.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isCorrect = question[0].correct_answer.toLowerCase() === answer.toLowerCase();

    const [existing] = await pool.query(
      'SELECT id FROM answers WHERE participant_id = ? AND question_id = ?',
      [participantId, questionId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE answers SET selected_answer = ?, is_correct = ? WHERE participant_id = ? AND question_id = ?',
        [answer, isCorrect, participantId, questionId]
      );
    } else {
      await pool.query(
        'INSERT INTO answers (participant_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)',
        [participantId, questionId, answer, isCorrect]
      );
    }

    res.json({ success: true, isCorrect });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Complete exam
app.post('/api/complete-exam', async (req, res) => {
  const participantId = req.session.participantId;
  const { autoSubmitted } = req.body;

  if (!participantId) {
    return res.status(401).json({ error: 'Not registered' });
  }

  try {
    const [participant] = await pool.query(
      'SELECT completed_at FROM participants WHERE id = ?',
      [participantId]
    );

    if (participant[0]?.completed_at) {
      return res.json({ success: true, message: 'Already submitted' });
    }

    const [answers] = await pool.query(
      'SELECT COUNT(*) as total, SUM(is_correct) as correct FROM answers WHERE participant_id = ?',
      [participantId]
    );

    const score = answers[0].correct || 0;
    const total = answers[0].total || 0;

    await pool.query(
      'UPDATE participants SET score = ?, total_questions = ?, completed_at = NOW(), auto_submitted = ? WHERE id = ?',
      [score, total, autoSubmitted || false, participantId]
    );

    res.json({ success: true, score, total });
  } catch (error) {
    console.error('Complete exam error:', error);
    res.status(500).json({ error: 'Failed to complete exam' });
  }
});

// Get scoreboard
app.get('/api/scoreboard', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT 
        name, 
        score, 
        total_questions, 
        auto_submitted,
        completed_at
      FROM participants 
      WHERE completed_at IS NOT NULL
      ORDER BY score DESC, completed_at ASC
      LIMIT 100
    `);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scoreboard' });
  }
});

// Get statistics (Admin)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as count FROM participants WHERE completed_at IS NOT NULL');
    const [avgScore] = await pool.query('SELECT AVG(score) as avg FROM participants WHERE completed_at IS NOT NULL');
    const [questions] = await pool.query('SELECT COUNT(*) as count FROM questions');
    
    res.json({
      totalParticipants: total[0].count,
      averageScore: avgScore[0].avg ? parseFloat(avgScore[0].avg).toFixed(2) : 0,
      totalQuestions: questions[0].count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  await initDatabase();
  const localIP = getLocalIP();
  console.log(`\n=================================`);
  console.log(`Quiz App Server Running`);
  console.log(`=================================`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`LAN: http://${localIP}:${PORT}`);
  console.log(`Admin Panel: http://${localIP}:${PORT}/admin`);
  console.log(`=================================\n`);
});