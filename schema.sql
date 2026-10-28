DROP DATABASE IF EXISTS job_internship_portal;
CREATE DATABASE job_internship_portal;
USE job_internship_portal;

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  role ENUM('STUDENT','COMPANY','ADMIN') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_profiles (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  usn VARCHAR(30) NOT NULL UNIQUE,
  college_name VARCHAR(150),
  branch VARCHAR(80),
  graduation_year YEAR,
  cgpa DECIMAL(4,2),
  skills TEXT,
  resume_path VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE companies (
  company_id INT PRIMARY KEY AUTO_INCREMENT,
  owner_user_id INT NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  website VARCHAR(200),
  location VARCHAR(100),
  description TEXT,
  FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE internships (
  internship_id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  required_skills VARCHAR(255),
  location VARCHAR(100),
  work_mode ENUM('REMOTE','ONSITE','HYBRID') DEFAULT 'ONSITE',
  stipend DECIMAL(10,2),
  duration_months INT,
  application_deadline DATE NOT NULL,
  status ENUM('OPEN','CLOSED') DEFAULT 'OPEN',
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  INDEX idx_internship_open (status, application_deadline)
);

CREATE TABLE applications (
  application_id INT PRIMARY KEY AUTO_INCREMENT,
  internship_id INT NOT NULL,
  student_id INT NOT NULL,
  cover_letter TEXT,
  resume_path VARCHAR(255),
  application_status ENUM('APPLIED','SHORTLISTED','REJECTED','SELECTED') DEFAULT 'APPLIED',
  feedback TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (internship_id) REFERENCES internships(internship_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_profiles(student_id) ON DELETE CASCADE,
  CONSTRAINT unique_application UNIQUE (internship_id, student_id)
);
