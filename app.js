const express = require('express');

const helmet = require('helmet');

const bodyParser = require('body-parser');

const mongoose = require('mongoose');

const { celebrate, Joi, errors } = require('celebrate');

const cors = require('cors');

const usersRouter = require('./routes/users');

const cardsRouter = require('./routes/cards');

const { createUser, login } = require('./controllers/users');

const auth = require('./middleware/auth');

const EmailConflictErr = require('./errors/email-conflict-err');

const NotFoundErr = require('./errors/not-found-err');

const { limiter } = require('./utils/limiter');

require('dotenv').config();

const { requestLogger, errorLogger } = require('./middleware/logger');

const app = express();

const { PORT = 3000 } = process.env;

app.use(cors());

app.options('*', cors());

app.use(helmet());

app.use(limiter);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(requestLogger);

app.get('/crash-test', () => {
  setTimeout(() => {
    throw new Error('Server will crash now');
  }, 0);
});

app.post(
  '/signin',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required().min(2).max(30),
    }),
  }),
  login,
);
app.post(
  '/signup',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required().min(2).max(30),
    }),
  }),
  createUser,
);

app.use('/', auth, usersRouter);

app.use('/', auth, cardsRouter);

app.get('*', () => {
  throw new NotFoundErr('Requested resource not found');
});

app.use(errorLogger);

app.use(errors());

app.use((err, req, res, next) => {
  const { statusCode = 500, message } = err;
  if (err.name === 'MongoError' || err.code === 11000) {
    throw new EmailConflictErr('An error occurred on the database');
  }
  res.status(statusCode).send({
    message: statusCode === 500 ? 'An error occurred on the server' : message,
  });
  next();
});

mongoose.connect('mongodb://localhost:27017/aroundb', {
  useNewUrlParser: true,
});
app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`);
});
