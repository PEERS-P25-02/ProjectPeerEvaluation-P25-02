// AI feature endpoints controller (stubs for now)
exports.summarize = async (req, res, next) => {
  const err = new Error('Summarize not implemented.');
  err.code = 'NOT_IMPLEMENTED';
  err.status = 501;
  next(err);
};

exports.redFlags = async (req, res, next) => {
  const err = new Error('Red flags not implemented.');
  err.code = 'NOT_IMPLEMENTED';
  err.status = 501;
  next(err);
};

exports.sentiment = async (req, res, next) => {
  const err = new Error('Sentiment not implemented.');
  err.code = 'NOT_IMPLEMENTED';
  err.status = 501;
  next(err);
};
