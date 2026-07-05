import crypto from 'crypto';

function csrfMiddleware(req, res, next) {
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
}

export default csrfMiddleware;
