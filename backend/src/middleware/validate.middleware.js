const { ApiError } = require('../utils/apiResponse');

const validate = (schema) => (req, res, next) => {
  try {
    const parsedData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Assign validated and parsed data back to the request
    req.body = parsedData.body;
    req.query = parsedData.query;
    req.params = parsedData.params;
    
    next();
  } catch (error) {
    const errors = error.errors ? error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    })) : [];
    
    next(new ApiError(400, 'Validation Error', errors));
  }
};

module.exports = validate;
