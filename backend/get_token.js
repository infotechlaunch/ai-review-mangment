require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'some-user-id',
    role: 'ADMIN',
    slug: 'sweats123',
    tenantSlug: 'sweats123'
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log(token);
