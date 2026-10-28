require('dotenv').config();
const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const db = require('./db'), fs = require('fs'), path = require('path');
const UP = path.join(__dirname, 'uploads'); fs.mkdirSync(UP, { recursive: true });
const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(UP));
const SECRET = process.env.JWT_SECRET || 'change-me';

const q = async (sql, p = []) => (await db.query(sql, p))[0];
const fail = (m, s = 400) => { throw Object.assign(new Error(m), { status: s }); };
const wrap = f => (req, res) => f(req, res).catch(e => {
  if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Already exists (email, USN or application is a duplicate)' });
  res.status(e.status || 500).json({ error: e.message });
});
const auth = (...roles) => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').slice(7), SECRET);
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed for your role' });
    next();
  } catch { res.status(401).json({ error: 'Please log in again' }); }
};
const studentId = async r => (await q('SELECT student_id FROM student_profiles WHERE user_id=?', [r.user.id]))[0]?.student_id || fail('No student profile', 404);
const companyId = async r => (await q('SELECT company_id FROM companies WHERE owner_user_id=?', [r.user.id]))[0]?.company_id || fail('No company profile', 404);

/* ---------- AUTH ---------- */
app.post('/api/register', wrap(async (req, res) => {
  const b = req.body;
  if (!b.full_name || !b.email || !b.password || b.password.length < 6) fail('Name, email and a password of 6+ characters are required');
  if (!['STUDENT', 'COMPANY'].includes(b.role)) fail('Choose student or company');
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [u] = await c.query('INSERT INTO users(full_name,email,password_hash,phone,role) VALUES(?,?,?,?,?)',
      [b.full_name, b.email, await bcrypt.hash(b.password, 10), b.phone || null, b.role]);
    if (b.role === 'STUDENT') {
      if (!b.usn) fail('USN is required');
      await c.query('INSERT INTO student_profiles(user_id,usn,college_name,branch,graduation_year,cgpa,skills,resume_path) VALUES(?,?,?,?,?,?,?,?)',
        [u.insertId, b.usn, b.college_name, b.branch, b.graduation_year || null, b.cgpa || null, b.skills, b.resume_path]);
    } else {
      if (!b.company_name) fail('Company name is required');
      await c.query('INSERT INTO companies(owner_user_id,company_name,website,location,description) VALUES(?,?,?,?,?)',
        [u.insertId, b.company_name, b.website, b.location, b.description]);
    }
    await c.commit();
    res.json({ ok: true });
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
}));

app.post('/api/login', wrap(async (req, res) => {
  const [u] = await q('SELECT * FROM users WHERE email=?', [req.body.email]);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash))) fail('Wrong email or password', 401);
  if (!u.is_active) fail('This account has been disabled by the admin', 403);
  res.json({ token: jwt.sign({ id: u.user_id, role: u.role }, SECRET, { expiresIn: '8h' }), name: u.full_name, role: u.role });
}));

/* ---------- STUDENT ---------- */
app.get('/api/internships', auth(), wrap(async (req, res) => {
  let sql = `SELECT i.*, c.company_name FROM internships i JOIN companies c ON i.company_id=c.company_id
             WHERE i.status='OPEN' AND i.application_deadline>=CURDATE()`;
  const p = [], { q: text, mode, location } = req.query;
  if (text) { sql += ' AND (i.title LIKE ? OR i.required_skills LIKE ?)'; p.push(`%${text}%`, `%${text}%`); }
  if (mode) { sql += ' AND i.work_mode=?'; p.push(mode); }
  if (location) { sql += ' AND i.location LIKE ?'; p.push(`%${location}%`); }
  res.json(await q(sql + ' ORDER BY i.posted_at DESC', p));
}));

app.post('/api/applications', auth('STUDENT'), wrap(async (req, res) => {
  const sid = await studentId(req);
  const open = await q("SELECT 1 FROM internships WHERE internship_id=? AND status='OPEN' AND application_deadline>=CURDATE()", [req.body.internship_id]);
  if (!open.length) fail('This internship is closed or past its deadline');
  const [p] = await q('SELECT resume_path FROM student_profiles WHERE student_id=?', [sid]);
  if (!p.resume_path) fail('Please upload your resume first (use the My resume button).');
  await q('INSERT INTO applications(internship_id,student_id,cover_letter,resume_path) VALUES(?,?,?,?)',
    [req.body.internship_id, sid, req.body.cover_letter, p.resume_path]);
  res.json({ ok: true });
}));

app.get('/api/my/profile', auth('STUDENT'), wrap(async (req, res) => {
  res.json((await q('SELECT usn, resume_path FROM student_profiles WHERE user_id=?', [req.user.id]))[0] || {});
}));

app.post('/api/my/resume', auth('STUDENT'), express.raw({ type: '*/*', limit: '5mb' }), wrap(async (req, res) => {
  const name = decodeURIComponent(String(req.headers['x-filename'] || '')), ext = path.extname(name).toLowerCase();
  if (!['.pdf', '.doc', '.docx'].includes(ext)) fail('Please upload a PDF, DOC or DOCX file');
  if (!Buffer.isBuffer(req.body) || !req.body.length) fail('The file is empty');
  if (ext === '.pdf' && req.body.slice(0, 4).toString() !== '%PDF') fail('This does not look like a valid PDF');
  const sid = await studentId(req), file = `resume-${sid}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UP, file), req.body);
  await q('UPDATE student_profiles SET resume_path=? WHERE student_id=?', ['/uploads/' + file, sid]);
  res.json({ resume_path: '/uploads/' + file });
}));

app.get('/api/my/applications', auth('STUDENT'), wrap(async (req, res) => {
  res.json(await q(`SELECT a.application_id, i.title, c.company_name, a.application_status, a.feedback, a.applied_at, a.updated_at
    FROM applications a JOIN internships i ON a.internship_id=i.internship_id
    JOIN companies c ON i.company_id=c.company_id WHERE a.student_id=? ORDER BY a.applied_at DESC`, [await studentId(req)]));
}));

/* ---------- COMPANY ---------- */
app.post('/api/internships', auth('COMPANY'), wrap(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.description || !b.application_deadline) fail('Title, description and deadline are required');
  await q(`INSERT INTO internships(company_id,title,description,required_skills,location,work_mode,stipend,duration_months,application_deadline)
           VALUES(?,?,?,?,?,?,?,?,?)`,
    [await companyId(req), b.title, b.description, b.required_skills, b.location, b.work_mode || 'ONSITE', b.stipend || null, b.duration_months || null, b.application_deadline]);
  res.json({ ok: true });
}));

app.get('/api/company/internships', auth('COMPANY'), wrap(async (req, res) => {
  res.json(await q(`SELECT i.internship_id, i.title, i.status, i.application_deadline, COUNT(a.application_id) AS total_applications
    FROM internships i LEFT JOIN applications a ON i.internship_id=a.internship_id
    WHERE i.company_id=? GROUP BY i.internship_id ORDER BY i.posted_at DESC`, [await companyId(req)]));
}));

app.patch('/api/internships/:id/close', auth('COMPANY'), wrap(async (req, res) => {
  await q("UPDATE internships SET status='CLOSED' WHERE internship_id=? AND company_id=?", [req.params.id, await companyId(req)]);
  res.json({ ok: true });
}));

app.get('/api/company/applications', auth('COMPANY'), wrap(async (req, res) => {
  res.json(await q(`SELECT a.application_id, u.full_name, s.usn, s.cgpa, s.skills, a.resume_path, i.title,
      a.cover_letter, a.application_status, a.feedback, a.applied_at
    FROM applications a JOIN student_profiles s ON a.student_id=s.student_id
    JOIN users u ON s.user_id=u.user_id JOIN internships i ON a.internship_id=i.internship_id
    WHERE i.company_id=? ORDER BY a.applied_at DESC`, [await companyId(req)]));
}));

app.patch('/api/applications/:id', auth('COMPANY'), wrap(async (req, res) => {
  const { status, feedback } = req.body;
  if (!['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED'].includes(status)) fail('Invalid status');
  if (status === 'REJECTED' && (!feedback || feedback.trim().length < 5)) fail('Please write feedback for the student (at least 5 characters)');
  const [r] = await db.query(`UPDATE applications a JOIN internships i ON a.internship_id=i.internship_id
    SET a.application_status=?, a.feedback=? WHERE a.application_id=? AND i.company_id=?`,
    [status, status === 'REJECTED' ? feedback.trim() : null, req.params.id, await companyId(req)]);
  if (!r.affectedRows) fail('Application not found for your company', 404);
  res.json({ ok: true });
}));

/* ---------- ADMIN ---------- */
app.get('/api/admin/users', auth('ADMIN'), wrap(async (_, res) =>
  res.json(await q('SELECT user_id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'))));
app.patch('/api/admin/users/:id/toggle', auth('ADMIN'), wrap(async (req, res) => {
  await q("UPDATE users SET is_active = NOT is_active WHERE user_id=? AND role<>'ADMIN'", [req.params.id]);
  res.json({ ok: true });
}));
app.get('/api/admin/companies', auth('ADMIN'), wrap(async (_, res) =>
  res.json(await q('SELECT c.company_id, c.company_name, c.location, c.website, u.email FROM companies c JOIN users u ON c.owner_user_id=u.user_id'))));
app.get('/api/admin/internships', auth('ADMIN'), wrap(async (_, res) =>
  res.json(await q(`SELECT i.internship_id, i.title, c.company_name, i.status, i.application_deadline,
    COUNT(a.application_id) AS total_applications FROM internships i JOIN companies c ON i.company_id=c.company_id
    LEFT JOIN applications a ON i.internship_id=a.internship_id GROUP BY i.internship_id`))));
app.delete('/api/admin/internships/:id', auth('ADMIN'), wrap(async (req, res) => {
  await q('DELETE FROM internships WHERE internship_id=?', [req.params.id]);
  res.json({ ok: true });
}));
app.get('/api/admin/applications', auth('ADMIN'), wrap(async (_, res) =>
  res.json(await q(`SELECT a.application_id, u.full_name AS student, s.usn, i.title, c.company_name, a.application_status, a.applied_at
    FROM applications a JOIN student_profiles s ON a.student_id=s.student_id JOIN users u ON s.user_id=u.user_id
    JOIN internships i ON a.internship_id=i.internship_id JOIN companies c ON i.company_id=c.company_id
    ORDER BY a.applied_at DESC`))));

app.use((e, req, res, next) => res.status(e.status || 500).json({ error: e.status === 413 ? 'File too large (max 5 MB)' : e.message }));
const PORT = process.env.PORT || 3000;
require('./dbinit').init()
  .then(() => console.log('Database ready.'))
  .catch(e => {
    console.log('\n!! Cannot use the database: ' + e.message);
    console.log('!! Fix: make sure MySQL is running and DB_PASS in .env is correct.\n');
  })
  .finally(() => {
    const openBrowser = u => { try { require('child_process').exec(process.platform === 'win32' ? `start "" ${u}` : process.platform === 'darwin' ? `open ${u}` : `xdg-open ${u}`); } catch {} };
    const listen = (p, tries = 0) => {
      const srv = app.listen(p, () => { const u = 'http://localhost:' + p; console.log('\nWEBSITE READY -> open ' + u + ' in your browser (keep this window open)\n'); openBrowser(u); });
      srv.on('error', e => {
        if (e.code === 'EADDRINUSE' && tries < 10) { console.log('Port ' + p + ' is busy (another project is running). Trying ' + (p + 1) + '...'); listen(p + 1, tries + 1); }
        else console.log('Server error: ' + e.message);
      });
    };
    listen(Number(PORT));
  });
