const NotFoundErr = require('../errors/not-found-err');
const BadRequestErr = require('../errors/bad-request-err');
const ForbiddenErr = require('../errors/forbidden-err');
const Card = require('../models/card');

const getCards = (req, res, next) => {
  Card.find({})
    .orFail()
    .then((cards) => res.status(200).send(cards))
    .catch(next);
};

const createCard = (req, res, next) => {
  const { name, link } = req.body;
  Card.create({ name, link, owner: req.user._id })
    .then((card) => res.status(201).res.send(card))
    .catch((err) => {
      if (err.name === 'ValidationError') next(new BadRequestErr('Validation failed. Check your request format'));
      else next(err);
    });
};

const deleteCard = (req, res, next) => {
  Card.findByIdAndRemove(req.params.cardId)
    .orFail(() => {
      throw new NotFoundErr('The requested card was not found');
    })
    .then((card) => {
      if (card.owner.equals(req.user._id)) res.send({card });
      else {
        throw new ForbiddenErr(
          'You cannot delete a card that does not belong to you',
        );
      }
    })
    .catch((err) => {
      if (err.name === 'CastError') next(new BadRequestErr('Invalid data.'));
      else next(err);
    });
};

const likeCard = (req, res, next) => {
  Card.findByIdAndUpdate(
    req.params.cardId,
    { $addToSet: { likes: req.user._id } },
    { new: true },
  )
    .orFail(() => {
      throw new NotFoundErr('The requested card was not found');
    })
    .then((cards) => res.status(200).send(cards))
    .catch((err) => {
      if (err.name === 'CastError') next(new BadRequestErr('Invalid data.'));
      else next(err);
    });
};

const dislikeCard = (req, res, next) => {
  Card.findByIdAndUpdate(
    req.params.cardId,
    { $pull: { likes: req.user._id } },
    { new: true },
  )
    .orFail(() => {
      throw new NotFoundErr('The requested card was not found');
    })
    .then((cards) => res.status(200).send(cards))
    .catch((err) => {
      if (err.name === 'CastError') next(new BadRequestErr('Invalid data.'));
      else next(err);
    });
};

module.exports = {
  getCards,
  createCard,
  deleteCard,
  likeCard,
  dislikeCard,
};
