import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connect.js';
import appRoutes from './routes/appRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.cookies.csrftoken) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie('csrftoken', token, { httpOnly: false });
    req.cookies.csrftoken = token;
  }

  if (req.method !== 'GET') {
    const headerToken = req.headers['x-csrf-token'];
    if (!headerToken || headerToken !== req.cookies.csrftoken) {
      return res.status(403).json({
        error: 'Invalid CSRF token'
      });
    }
  }

  next();
});

app.use(appRoutes);
app.use(questionRoutes);
app.use(commentRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export { app, db };