-- Set Ahmed Boughdiri as super_admin
-- Run this once against your auth_db database

UPDATE users
SET role = 'super_admin'
WHERE email = 'ahmed.boughdiri.it@gmail.com';

-- Verify
SELECT id, email, first_name, last_name, role
FROM users
WHERE email = 'ahmed.boughdiri.it@gmail.com';
