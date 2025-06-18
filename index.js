const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// MySQL connection pool
const db = mysql.createPool({
  host: 'b4q7tiv8asz8sga8sp6j-mysql.services.clever-cloud.com',
  user: 'up7yrisnuigxs5dd', // <-- Replace with your MySQL username
  password: 'wRdbxiDcPLrP17KKRznn', // <-- Replace with your MySQL password
  database: 'b4q7tiv8asz8sga8sp6j', // <-- Replace with your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET user by id
app.get('/api/user', (req, res) => {
  const { id } = req.query;
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// GET diagnoses by user_id
app.get('/api/diagnoses', (req, res) => {
  const { user_id } = req.query;
  console.log('Fetching diagnoses for user_id:', user_id);
  
  if (!user_id) {
    console.error('Missing user_id parameter');
    return res.status(400).json({ error: 'Missing user_id parameter' });
  }

  db.query('SELECT * FROM diagnoses WHERE patient_code = ?', [user_id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Query results:', results);
    res.json(results);
  });
});

// GET workouts by diagnosis_id
app.get('/api/workouts', (req, res) => {
  const { diagnosis_id } = req.query;
  db.query('SELECT * FROM workouts WHERE diagnosis_id = ?', [diagnosis_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST add diagnosis
app.post('/api/add_diagnosis', (req, res) => {
  const diagnosis = req.body;
  db.query('INSERT INTO diagnoses SET ?', diagnosis, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Create notification for the user
    const notification = {
      user_id: diagnosis.patient_code,
      message: `New diagnosis added: ${diagnosis.diagnosis}`,
      is_read: 0
    };
    
    db.query('INSERT INTO notifications SET ?', notification, (notifErr) => {
      if (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }
    });
    
    res.json({ success: true, id: result.insertId });
  });
});

// GET vitals by user_id
app.get('/api/vitals', (req, res) => {
  const { user_id } = req.query;
  db.query('SELECT * FROM vitals WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST add vitals
app.post('/api/add_vitals', (req, res) => {
  const vitals = req.body;
  db.query('INSERT INTO vitals SET ?', vitals, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

// POST register user
app.post('/api/register_user', (req, res) => {
  const user = req.body;
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: err.message });
    user.password = hash;
    db.query('INSERT INTO users SET ?', user, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    });
  });
});

// POST register doctor (with password hashing)
app.post('/api/register_doctor', (req, res) => {
  const doctor = req.body;
  if (!doctor.password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  // Map camelCase to snake_case for DB
  if (doctor.idVerified !== undefined) {
    doctor.id_verified = doctor.idVerified ? 1 : 0;
    delete doctor.idVerified;
  }
  bcrypt.hash(doctor.password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: err.message });
    doctor.password = hash;
    db.query('INSERT INTO doctors SET ?', doctor, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    });
  });
});

// GET all users
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET all doctors
app.get('/api/doctors', (req, res) => {
  db.query('SELECT * FROM doctors', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET diagnoses list
app.get('/api/diagnoses_list', (req, res) => {
  db.query('SELECT id, name, description, category FROM common_diseases ORDER BY category, name', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET medicines by disease_id
app.get('/api/medicines_by_disease', (req, res) => {
  const { disease_id } = req.query;
  db.query(
    'SELECT m.id, m.name, m.generic_name, dmm.dosage, dmm.frequency, dmm.duration FROM medicines m JOIN disease_medicine_mappings dmm ON m.id = dmm.medicine_id WHERE dmm.disease_id = ?',
    [disease_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// POST add feedback
app.post('/api/add_feedback', (req, res) => {
  const { user_id, feedback } = req.body;
  db.query('INSERT INTO feedback (user_id, feedback) VALUES (?, ?)', [user_id, feedback], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

// GET feedback by user_id
app.get('/api/feedback', (req, res) => {
  const { user_id } = req.query;
  db.query('SELECT * FROM feedback WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length > 0) {
      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (isMatch) {
          user.role = 'user';
          delete user.password;
          res.json({ success: true, user });
        } else {
          res.json({ success: false, error: 'Invalid password' });
        }
      });
    } else {
      // Optionally check doctors table for doctor login
      db.query('SELECT * FROM doctors WHERE email = ?', [email], (err, results2) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (results2.length > 0) {
          const doctor = results2[0];
          bcrypt.compare(password, doctor.password, (err, isMatch) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (isMatch) {
              doctor.role = 'doctor';
              delete doctor.password;
              res.json({ success: true, user: doctor });
            } else {
              res.json({ success: false, error: 'Invalid password' });
            }
          });
        } else {
          res.json({ success: false, error: 'No user found with this email' });
        }
      });
    }
  });
});

// GET workouts by disease_id
app.get('/api/workouts_by_disease', (req, res) => {
  const { disease_id } = req.query;
  console.log('[workouts_by_disease] Received disease_id:', disease_id);
  db.query('SELECT workout_name, description, duration, intensity, gif_url FROM disease_workouts WHERE disease_id = ?', [disease_id], (err, results) => {
    if (err) {
      console.error('[workouts_by_disease] DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[workouts_by_disease] Query results:', results);
    res.json(results);
  });
});

// POST user workout history
app.post('/api/user_workout_history', (req, res) => {
  const log = req.body;
  console.log('[user_workout_history][POST] Received log:', log);
  db.query('INSERT INTO user_workout_history SET ?', log, (err, result) => {
    if (err) {
      console.error('[user_workout_history][POST] DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[user_workout_history][POST] Insert result:', result);
    res.json({ success: true, id: result.insertId });
  });
});

// GET user workout history
app.get('/api/user_workout_history', (req, res) => {
  const { user_id, date, start_date, end_date } = req.query;
  console.log('[user_workout_history][GET] Params:', req.query);
  let sql = 'SELECT * FROM user_workout_history WHERE user_id = ?';
  let params = [user_id];
  if (date) {
    sql += ' AND date = ?';
    params.push(date);
  }
  if (start_date && end_date) {
    sql += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('[user_workout_history][GET] DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[user_workout_history][GET] Query results:', results);
    res.json(results);
  });
});

// POST reset user workout history
app.post('/api/reset_user_workout_history', (req, res) => {
  const { user_id } = req.body;
  console.log('[reset_user_workout_history] Received user_id:', user_id);
  db.query('DELETE FROM user_workout_history WHERE user_id = ?', [user_id], (err, result) => {
    if (err) {
      console.error('[reset_user_workout_history] DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[reset_user_workout_history] Delete result:', result);
    res.json({ success: true });
  });
});

// GET notifications by user_id
app.get('/api/notifications', (req, res) => {
  const { user_id } = req.query;
  db.query('SELECT * FROM notifications WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST mark notification as read
app.post('/api/mark_notification_read', (req, res) => {
  const { notification_id } = req.body;
  db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [notification_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// POST verify doctor id (image upload + OCR)
app.post('/api/verify_doctor_id', upload.single('idImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image uploaded' });
  }
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ success: false, error: 'Invalid file type. Only JPEG and PNG are allowed' });
  }
  try {
    // Run OCR
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    // Check for keywords
    const keywords = [
      'medical', 'license', 'physician', 'doctor', 'md', 'medical board', 'license number',
      'professional license', 'registered nurse', 'prc', 'republic of the philippines', 'commission', 'professional regulation commission', 'manila', 'nurse', 'date registered', 'valid until'
    ];
    let foundKeywords = 0;
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword)) {
        foundKeywords++;
      }
    }
    if (foundKeywords >= 1) {
      return res.json({ success: true, message: 'Medical license verified' });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid medical license ID' });
    }
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Error processing image: ' + e.message });
  }
});

app.post('/api/face_register', (req, res) => {
  const { userId, faceEmbedding } = req.body;
  if (!userId || !faceEmbedding) {
    return res.status(400).json({ success: false, error: 'Missing userId or faceEmbedding' });
  }
  // Check if user exists
  db.query('SELECT id FROM users WHERE id = ?', [userId], (err, userResults) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (userResults.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found for userId: ' + userId });
    }
    // Check if embedding exists
    db.query('SELECT id FROM face_embeddings WHERE user_id = ?', [userId], (err, embeddingResults) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (embeddingResults.length > 0) {
        // Update
        db.query('UPDATE face_embeddings SET face_embedding = ?, updated_at = NOW() WHERE user_id = ?', [faceEmbedding, userId], (err, updateResult) => {
          if (err) return res.status(500).json({ success: false, error: err.message });
          return res.json({ success: true, message: 'Face embedding registered' });
        });
      } else {
        // Insert
        db.query('INSERT INTO face_embeddings (user_id, face_embedding, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [userId, faceEmbedding], (err, insertResult) => {
          if (err) return res.status(500).json({ success: false, error: err.message });
          return res.json({ success: true, message: 'Face embedding registered' });
        });
      }
    });
  });
});

app.post('/api/face_verify', (req, res) => {
  let { faceEmbedding } = req.body;
  if (!faceEmbedding) {
    return res.status(400).json({ success: false, message: 'Invalid input: faceEmbedding missing', vitals: null });
  }
  // Accept both array and JSON string
  if (typeof faceEmbedding === 'string') {
    try {
      faceEmbedding = JSON.parse(faceEmbedding);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'faceEmbedding is not valid JSON', vitals: null });
    }
  }
  db.query('SELECT user_id, face_embedding FROM face_embeddings', (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message, vitals: null });
    let bestMatch = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const threshold = 0.4;
    for (const row of results) {
      let storedEmbedding = row.face_embedding;
      if (typeof storedEmbedding === 'string') {
        try {
          storedEmbedding = JSON.parse(storedEmbedding);
        } catch (e) {
          continue;
        }
      }
      const score = cosineDistance(faceEmbedding, storedEmbedding);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = row.user_id;
      }
    }
    if (bestScore < threshold && bestMatch) {
      // Get latest vitals for the matched user
      db.query(`SELECT v.*, u.name, u.email FROM vitals v JOIN users u ON v.user_id = u.id WHERE v.user_id = ? ORDER BY v.id DESC LIMIT 1`, [bestMatch], (err, vitalsResults) => {
        if (err) return res.status(500).json({ success: false, message: err.message, vitals: null });
        if (vitalsResults.length > 0) {
          const vitals = vitalsResults[0];
          vitals.oxygen_saturation = vitals.blood_oxygen;
          return res.json({ success: true, userId: bestMatch, message: 'Face verified successfully', vitals });
        } else {
          return res.json({ success: true, userId: bestMatch, message: 'Face verified but no vitals found', vitals: null });
        }
      });
    } else {
      return res.json({ success: false, userId: null, message: 'No matching face found', vitals: null });
    }
  });
});

function cosineDistance(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
}

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 