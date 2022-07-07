const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { NODE_ENV, JWT_SECRET } = process.env;
const User = require('../models/user');
const NotFoundErr = require('../errors/not-found-err');
const BadRequestErr = require('../errors/bad-request-err');
const LoginErr = require('../errors/login-err');
const EmailConflictErr = require('../errors/email-conflict-err');

const getUsers = (req, res, next) => {
  User.find({})
    .then((users) => res.send(users))
    .catch(next);
};
const getCurrentUser = (req, res, next) => {
  User.findById(req.user._id)
    .then((users) => res.status(200).send(users))
    .catch((err) => {
      if (err.name === 'CastError') {
        next(
          new BadRequestErr('Validation failed. Check your request format.'),
        );
      } else next(err);
    });
};

const createUser = (req, res, next) => {
  const {
    name, about, avatar, email, password,
  } = req.body;
  bcrypt
    .hash(password, 10)
    .then((hash) => User.create({
      name, about, avatar, email, password: hash,
    }))
    .then((user) => res.status(201).send({
      _id: user._id,
      email: user.email,
      name: user.name,
      about: user.about,
      avatar: user.avatar,
    }))
    .catch((err) => {
      if (err.name === 'ValidationError') next(new BadRequestErr('Validation failed. Check your request format'));
      if (err.code === 11000) next(new EmailConflictErr('This email has already been registered'));
      else next(err);
    });
};

const updateUser = (req, res, next) => {
  const { name, about } = req.body;
  User.findByIdAndUpdate(
    req.user._id,
    { name, about },
    { new: true, runValidators: true },
  )
    .orFail(() => {
      throw new NotFoundErr('User not found');
    })
    .then((user) => {
      res.status(200).send(user);
    })
    .catch((err) => {
      if (err.name === 'ValidationError') next(new BadRequestErr('Validation failed. Check your request format'));
      else next(err);
    });
};
const updateUserAvatar = (req, res, next) => {
  const { avatar } = req.body;

  User.findByIdAndUpdate(
    req.user._id,
    { avatar },
    { new: true, runValidators: true },
  )
    .orFail(() => {
      throw new NotFoundErr('User not found');
    })
    .then((user) => {
      res.status(200).send(user);
    })
    .catch((err) => {
      if (err.name === 'ValidationError') next(new BadRequestErr('Invalid avatar link'));
      else next(err);
    });
};
const login = (req, res, next) => {
  const { email, password } = req.body;
  return User.findUserByCredentials(email, password)
    .then((user) => {
      if (!user) {
        throw new NotFoundErr('User not found');
      }
      const token = jwt.sign(
        { _id: user._id },
        NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret',
        { expiresIn: '7d' },
      );

      res.cookie('token', token, { httpOnly: true });
      res.status(201).send({
        token,
        user: {
          name: user.name,
          about: user.about,
          avatar: user.avatar,
          email: user.email,
        },
      });
    })
    .catch(() => {
      next(new LoginErr('Authorization Required'));
    });
};

module.exports = {
  getUsers,
  getCurrentUser,
  createUser,
  updateUser,
  updateUserAvatar,
  login,
};
