import IDBANK from './lib/idbank.js';
import assert from 'assert';

export default  {
  gateway: function (options) {
    assert(options.USER_NAME_API, 'USER_NAME_API is mandatory');
    assert(options.PASSWORD_API, 'PASSWORD_API is mandatory');
    assert(options.USER_NAME_API_BINDING, 'USER_NAME_API_BINDING is mandatory');
    assert(options.PASSWORD_API_BINDING, 'PASSWORD_API_BINDING is mandatory');
    options = options || {};
    const service = new IDBANK(options);
    return service;
  },
  IDBANK: IDBANK
};
