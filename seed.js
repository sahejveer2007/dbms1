// Demo data. Password for every demo account: Pass@123
const db = require('./db'), bcrypt = require('bcryptjs');
const day = n => `DATE_ADD(CURDATE(), INTERVAL ${n} DAY)`;
async function run() {
  const h = await bcrypt.hash('Pass@123', 10);
  const user = async (n, e, ph, r) => (await db.query('INSERT INTO users(full_name,email,password_hash,phone,role) VALUES(?,?,?,?,?)', [n, e, h, ph, r]))[0].insertId;
  await user('Portal Admin', 'admin@portal.com', null, 'ADMIN');

  const students = [
    ['Rohit Biradar', 'rohit@student.com', '1AB23CS001', 'Computer Science', 2027, 8.40, 'Java, C++, MySQL, HTML, CSS', 'rohit'],
    ['Ananya Rao', 'ananya@student.com', '1AB23CS014', 'Computer Science', 2027, 8.90, 'Python, Machine Learning, SQL, Pandas', 'ananya'],
    ['Karan Patil', 'karan@student.com', '1AB23IS022', 'Information Science', 2026, 7.80, 'JavaScript, React, Node.js', 'karan'],
    ['Sneha Kulkarni', 'sneha@student.com', '1AB23EC035', 'Electronics', 2027, 8.10, 'Figma, Photoshop, HTML, CSS', 'sneha']];
  const sid = [], resume = [];
  for (const [n, e, usn, br, yr, cg, sk, f] of students) {
    const u = await user(n, e, '98765' + Math.floor(10000 + Math.random() * 89999), 'STUDENT');
    const [r] = await db.query('INSERT INTO student_profiles(user_id,usn,college_name,branch,graduation_year,cgpa,skills,resume_path) VALUES(?,?,?,?,?,?,?,?)',
      [u, usn, 'ABC Engineering College', br, yr, cg, sk, `/uploads/seed-${f}.pdf`]);
    sid.push(r.insertId); resume.push(`/uploads/seed-${f}.pdf`);
  }

  const companies = [
    ['TechNova Solutions', 'hr@technova.com', 'https://technova.example', 'Bengaluru', 'Software development company building web and mobile products.'],
    ['CloudPeak Systems', 'hr@cloudpeak.com', 'https://cloudpeak.example', 'Pune', 'Cloud infrastructure and backend engineering.'],
    ['DataWise Analytics', 'hr@datawise.com', 'https://datawise.example', 'Hyderabad', 'Data analytics and machine learning consultancy.'],
    ['PixelCraft Studio', 'hr@pixelcraft.com', 'https://pixelcraft.example', 'Mumbai', 'Design and frontend studio for startups.'],
    ['FinEdge Capital', 'hr@finedge.com', 'https://finedge.example', 'Pune', 'Fintech company building banking tools.'],
    ['SecureNet Labs', 'hr@securenet.com', 'https://securenet.example', 'Bengaluru', 'Cyber security products and services.']];
  const cid = [];
  for (const [n, e, w, l, d] of companies) {
    const u = await user(n.split(' ')[0] + ' HR', e, '9876500000', 'COMPANY');
    cid.push((await db.query('INSERT INTO companies(owner_user_id,company_name,website,location,description) VALUES(?,?,?,?,?)', [u, n, w, l, d]))[0].insertId);
  }

  // [company, title, description, skills, location, mode, stipend, months, deadline days]
  const jobs = [
    [0, 'Web Development Intern', 'Build and test web application modules with our product team.', 'HTML, CSS, JavaScript, MySQL', 'Bengaluru', 'HYBRID', 10000, 3, 90],
    [0, 'Mobile App Developer Intern', 'Help build cross-platform mobile apps used by thousands of customers.', 'Flutter, Dart, Firebase', 'Bengaluru', 'REMOTE', 12000, 4, 60],
    [0, 'QA and Testing Intern', 'Write test cases and run manual and automated tests on new releases.', 'Selenium, Java, Test Cases', 'Bengaluru', 'ONSITE', 8000, 3, 45],
    [1, 'Backend Developer Intern', 'Design REST APIs and database tables for our cloud dashboard.', 'Node.js, Express, MySQL, REST APIs', 'Pune', 'HYBRID', 15000, 6, 75],
    [1, 'DevOps Intern', 'Work on build pipelines, containers and server monitoring.', 'Linux, Docker, Git, CI/CD', 'Pune', 'ONSITE', 12000, 3, 50],
    [1, 'Cloud Support Intern', 'Support customers with cloud setup and troubleshooting.', 'AWS, Linux, Networking', 'Remote', 'REMOTE', 9000, 3, 40],
    [2, 'Data Analyst Intern', 'Clean data, build reports and find insights for client projects.', 'Python, SQL, Excel, Statistics', 'Hyderabad', 'HYBRID', 14000, 4, 80],
    [2, 'Machine Learning Intern', 'Train and evaluate simple models on real business data.', 'Python, scikit-learn, Pandas, NumPy', 'Hyderabad', 'REMOTE', 18000, 6, 70],
    [2, 'Business Intelligence Intern', 'Create dashboards that help managers track key numbers.', 'Power BI, SQL, Excel', 'Hyderabad', 'ONSITE', 10000, 3, 35],
    [3, 'UI/UX Design Intern', 'Design app screens, wireframes and prototypes with senior designers.', 'Figma, Wireframing, User Research', 'Mumbai', 'HYBRID', 11000, 3, 55],
    [3, 'Frontend Developer Intern', 'Turn designs into fast, responsive web pages.', 'React, JavaScript, CSS, Git', 'Mumbai', 'REMOTE', 13000, 4, 65],
    [3, 'Graphic Design Intern', 'Create social media posts, banners and brand material.', 'Photoshop, Illustrator, Canva', 'Mumbai', 'ONSITE', 7000, 2, 30],
    [4, 'Finance Analytics Intern', 'Analyse transaction data and prepare weekly finance reports.', 'Excel, SQL, Python', 'Pune', 'ONSITE', 12000, 3, 60],
    [4, 'Fintech Developer Intern', 'Build secure features for our banking web application.', 'Java, Spring Boot, MySQL', 'Pune', 'HYBRID', 16000, 6, 85],
    [5, 'Cyber Security Intern', 'Assist the team with vulnerability scanning and security reports.', 'Networking, Linux, Python, Ethical Hacking', 'Bengaluru', 'ONSITE', 14000, 4, 50]];
  for (const [c, t, d, sk, l, m, st, mo, dl] of jobs)
    await db.query(`INSERT INTO internships(company_id,title,description,required_skills,location,work_mode,stipend,duration_months,application_deadline) VALUES(?,?,?,?,?,?,?,?,${day(dl)})`, [cid[c], t, d, sk, l, m, st, mo]);

  const F = {
    backend: "Thank you for applying. Your resume shows Java and MySQL, but we could not find any backend project.\n\nWhat to improve:\n1. Add 1-2 projects with GitHub links, for example a REST API you built.\n2. Mention Node.js or Express if you have used them.\n3. Describe each project in one line with numbers (e.g. 5 API endpoints, 3 tables).\n\nPlease apply again once you have a project to show.",
    data: "Your CGPA is good, but the resume does not show Python or statistics.\n\nWhat to improve:\n1. Add a data project or a Kaggle notebook.\n2. List tools like Pandas and Excel under a clear Skills heading.\n3. Keep the resume to one page and remove the generic objective line.",
    cyber: "We look for some hands-on security exposure, which your resume does not show yet.\n\nWhat to improve:\n1. Complete labs on TryHackMe or Hack The Box and mention them.\n2. List networking basics such as TCP/IP and common Linux commands.\n3. Add a certification or CTF participation.\n\nYour resume layout is neat, keep that.",
    web: "This role needs JavaScript and MySQL, and both are missing from your resume.\n\nWhat to improve:\n1. Learn basic JavaScript and build a small portfolio website.\n2. Add the project link to your resume.\n\nYour design skills are a strength, so do apply to our design roles too."};
  // [student index, job number, status, feedback]
  const apps = [
    [0, 1, 'SHORTLISTED'], [0, 4, 'REJECTED', F.backend], [0, 7, 'REJECTED', F.data], [0, 15, 'REJECTED', F.cyber], [0, 10, 'APPLIED'],
    [1, 7, 'SELECTED'], [1, 8, 'SHORTLISTED'], [1, 1, 'APPLIED'],
    [2, 1, 'SELECTED'], [2, 11, 'APPLIED'], [2, 4, 'SHORTLISTED'],
    [3, 10, 'SHORTLISTED'], [3, 12, 'APPLIED'], [3, 1, 'REJECTED', F.web]];
  for (const [s, j, st, fb] of apps)
    await db.query('INSERT INTO applications(internship_id,student_id,cover_letter,resume_path,application_status,feedback) VALUES(?,?,?,?,?,?)',
      [j, sid[s], 'I am very interested in this internship and eager to learn.', resume[s], st, fb || null]);

  console.log('Demo data ready: 15 internships, 14 applications.');
  console.log('Logins (password Pass@123): rohit@student.com | hr@technova.com | admin@portal.com');
}
module.exports = { run };
if (require.main === module) run().then(() => process.exit()).catch(e => { console.error(e.message); process.exit(1); });
