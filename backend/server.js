const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const db = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const homeRoutes = require('./src/routes/home.routes');
const repairRoutes = require('./src/routes/repairRequest.routes');
const storeRoutes = require('./src/routes/storeRoutes');
const productRoutes = require('./src/routes/productRoutes');
const mapRoutes = require('./src/routes/map.routes');
const userRoutes = require('./src/routes/user.routes');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'iems_secret_key';

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails?.[0]?.value || null;

        db.query(
          'SELECT * FROM users WHERE email = ? OR google_id = ?',
          [email, googleId],
          (err, results) => {
            if (err) return done(err);

            if (results.length > 0) {
              const user = results[0];
              db.query(
                'UPDATE users SET google_id = ? WHERE id = ?',
                [googleId, user.id],
                (updateErr) => {
                  if (updateErr) return done(updateErr);
                  return done(null, { ...user, google_id: googleId });
                }
              );
            } else {
              db.query(
                'INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)',
                [name, email, googleId, 'USER'],
                (insertErr, result) => {
                  if (insertErr) return done(insertErr);
                  return done(null, {
                    id: result.insertId,
                    name,
                    email,
                    google_id: googleId,
                    role: 'USER',
                  });
                }
              );
            }
          }
        );
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/', (req, res) => {
  res.send('IEMS API Running');
});

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api', repairRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 