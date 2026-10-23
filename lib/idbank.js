import { BaseGateway } from '@easy-payment/base';
import Got from 'got';
import { isSuccessCode, normalizeBankData, orderStatusOf } from './bankResponse.js';

// EPG replaces jsonParams FORCE_3DS2 with features. FORCE_TDS is 3DS2; FORCE_SSL is no 3DS.
// Pass FEATURES: '' to omit the field. Unset keeps the previous force-3DS behavior.
const DEFAULT_FEATURES = 'FORCE_TDS';

class IDBANK extends BaseGateway {
  constructor(options) {
    super();
    this._timeout = options.TIMEOUT || 120000;
    this._endpoint = (options.ID_BANK_URL || 'https://ipay.arca.am/payment/rest/').replace(/\/?$/, '/');
    this._bindingUserName = options.USER_NAME_API_BINDING
    this._bindingUserPassword = options.PASSWORD_API_BINDING
    this._APIUserName = options.USER_NAME_API
    this._APIUserPassword = options.PASSWORD_API
    this._features = options.FEATURES === undefined || options.FEATURES === null ? DEFAULT_FEATURES : options.FEATURES;
  }

  _formBody = (body) => {
    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item));
        }
      });
    });
    return params.toString();
  };

  _applyFeatures = (payload) => {
    if (this._features) {
      payload.features = this._features;
    }
    return payload;
  };

  _requestToBank = async (url, body) => {
    try {
      const { body: data } = await Got.post(url, {
        timeout: {
          request: this._timeout
        },
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        body: this._formBody(body),
      });
      return { hasError: false, data: normalizeBankData(JSON.parse(data)) };
    } catch (err) {
      return { hasError: true, err: err };
    }
  };

  _register = async (order, registerMethod) => {
    const payload = (({ orderNumber, language, pageView, amount, returnUrl, description, clientId, currency }) => ({ orderNumber, language, pageView, amount, returnUrl, description, clientId, currency }))(order);
    payload.userName = this._bindingUserName;
    payload.password = this._bindingUserPassword;
    this._applyFeatures(payload);
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _attachCard = async (order, registerMethod) => {
    const payload = (({ orderNumber, language, pageView, amount, returnUrl, description, clientId, currency }) => ({ orderNumber, language, pageView, amount, returnUrl, description, clientId, currency }))(order);
    payload.userName = this._APIUserName;
    payload.password = this._APIUserPassword;
    this._applyFeatures(payload);
    // Add-card only. Without paymentWay, EPG sees the clientId's saved card and opens
    // the binding page (masked pan, name filled, CVV only). CARD forces a blank entry form.
    // FORCE_CREATE_BINDING stores the new card even when the save checkbox is off.
    if (order.createBinding) {
      payload.jsonParams = JSON.stringify({ paymentWay: 'CARD' });
      const features = payload.features ? [payload.features] : [];
      features.push('FORCE_CREATE_BINDING');
      payload.features = features;
    }
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _payOrderBinging = async (order, registerMethod, orderId) => {
    const payload = (({ bindingId }) => ({ bindingId }))(order);
    payload.mdOrder = orderId;
    payload.userName = this._bindingUserName;
    payload.password = this._bindingUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _getOrderStatus = async (registerMethod, orderId, useBinding) => {
    const payload = {
      orderId: orderId,
    };
    payload.userName = useBinding ? this._bindingUserName : this._APIUserName;
    payload.password = useBinding ? this._bindingUserPassword : this._APIUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _freezeOrder = async (order, registerMethod) => {
    const payload = (({ orderNumber, language, pageView, currency, amount, returnUrl, description, clientId }) => ({ orderNumber, language, pageView, currency, amount, returnUrl, description, clientId }))(order);
    payload.userName = this._bindingUserName;
    payload.password = this._bindingUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _reverseOrder = async (order, registerMethod) => {
    const payload = (({ orderId, language, currency }) => ({ orderId, language, currency }))(order);
    payload.userName = this._bindingUserName;
    payload.password = this._bindingUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _depositOrder = async (order, registerMethod) => {
    const payload = (({ orderId, language, currency, pageView, amount }) => ({ orderId, language, currency, pageView, amount }))(order);
    payload.userName = this._bindingUserName;
    payload.password = this._bindingUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _refundOrder = async (order, registerMethod) => {
    const payload = (({ orderId, language, currency, amount }) => ({ orderId, language, currency, amount }))(order);
    const useBinding = order.useBinding !== false;
    payload.userName = useBinding ? this._bindingUserName : this._APIUserName;
    payload.password = useBinding ? this._bindingUserPassword : this._APIUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _getBindings = async (registerMethod, clientId, useBinding = true) => {
    const payload = {
      clientId
    };
    payload.userName = useBinding ? this._bindingUserName : this._APIUserName;
    payload.password = useBinding ? this._bindingUserPassword : this._APIUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  _unBindCard = async (registerMethod, bindingId) => {
    const payload = {
      bindingId
    };
    payload.userName = this._APIUserName;
    payload.password = this._APIUserPassword;
    return await this._requestToBank(`${this._endpoint}${registerMethod}`, payload);
  }

  attachCard = async (order) => {
    const registerResponse = await this._attachCard(order, `register.do`);
    if (registerResponse.hasError || !isSuccessCode(registerResponse.data, { allowMissingWhenOrderId: true })) {
      registerResponse.hasError = true;
      registerResponse.errorStep = `register.do`;
    }

    return registerResponse;
  }

  payOrder = async (order) => {
    const payload = (({ useBinding }) => ({ useBinding }))(order);

    if (!payload.useBinding) {
      return new Error('pay order without binding not implemented');
    }

    const registerResponse = await this._register(order, `register.do`);
    if (registerResponse.hasError || !isSuccessCode(registerResponse.data, { allowMissingWhenOrderId: true })) {
      registerResponse.hasError = true;
      registerResponse.errorStep = `register.do`;
      return registerResponse;
    }
    let res = {
      register: registerResponse.data
    }

    const orderId = registerResponse.data.orderId;
    const payOrderWithBingingPayload = await this._payOrderBinging(order, 'paymentOrderBinding.do', orderId);
    if (payOrderWithBingingPayload.hasError || !isSuccessCode(payOrderWithBingingPayload.data)) {
      payOrderWithBingingPayload.hasError = true;
      payOrderWithBingingPayload.errorStep = 'paymentOrderBinding.do';
      return {
        ...res,
        ...payOrderWithBingingPayload,
      };
    }
    res.paymentOrderBinding = payOrderWithBingingPayload.data;

    const data = await this._getOrderStatus('getOrderStatus.do', orderId, true);
    res = Object.assign(res, data)
    if (data.hasError || orderStatusOf(data.data) !== 2) {
      res.hasError = true;
      res.errorStep = 'getOrderStatus.do';
    }

    return res;
  }

  getOrderStatus = async (order) => {
    const payload = (({ orderId, extended, useBinding }) => ({ orderId, extended, useBinding }))(order);

    const method = payload.extended ? 'getOrderStatusExtended.do' : 'getOrderStatus.do';
    const data = await this._getOrderStatus(method, payload.orderId, payload.useBinding);
    if (data.hasError) {
      data.hasError = true;
      data.errorStep = method;
    }

    return data;
  }

  removeCard = async (bindingId) => {
    const data = await this._unBindCard('unBindCard.do', bindingId);
    if (data.hasError || !isSuccessCode(data.data)) {
      data.hasError = true;
      data.errorStep = 'unBindCard.do';
    }

    return data;
  }

  getBindings = async (clientId, options = {}) => {
    const useBinding = options.useBinding !== false;
    const data = await this._getBindings('getBindings.do', clientId, useBinding);

    if (data.hasError || !isSuccessCode(data.data)) {
      data.hasError = true;
      data.errorStep = 'getBindings.do';
    }

    return data;
  }

  freezeOrder = async (order) => {
    const payload = (({ useBinding }) => ({ useBinding }))(order);

    if (!payload.useBinding) {
      return new Error('freeze order without binding not implemented');
    }

    const freezeResponse = await this._freezeOrder(order, `registerPreAuth.do`);
    if (freezeResponse.hasError || !isSuccessCode(freezeResponse.data, { allowMissingWhenOrderId: true })) {
      freezeResponse.hasError = true;
      freezeResponse.errorStep = `registerPreAuth.do`;
      return freezeResponse;
    }
    let res = {
      registerPreAuth: freezeResponse.data
    };

    const orderId = freezeResponse.data.orderId;
    const payOrderWithBingingResponse = await this._payOrderBinging(order, 'paymentOrderBinding.do', orderId);
    if (payOrderWithBingingResponse.hasError || !isSuccessCode(payOrderWithBingingResponse.data)) {
      payOrderWithBingingResponse.hasError = true;
      payOrderWithBingingResponse.errorStep = 'paymentOrderBinding.do';
      return {
        ...res,
        ...payOrderWithBingingResponse,
      };
    }
    res.paymentOrderBinding = payOrderWithBingingResponse.data;

    const data = await this._getOrderStatus('getOrderStatus.do', orderId, true);
    res = Object.assign(res, data)
    if (data.hasError || orderStatusOf(data.data) !== 1) {
      res.hasError = true;
      res.errorStep = 'getOrderStatus.do';
    }

    return res;
  }

  reverseOrderProfile = async (order) => {
    const payload = (({ orderId }) => ({ orderId }))(order);

    const reverseResponse = await this._reverseOrder(order, 'reverse.do');
    if (reverseResponse.hasError || !isSuccessCode(reverseResponse.data)) {
      reverseResponse.hasError = true;
      reverseResponse.errorStep = 'reverse.do';
      return reverseResponse;
    }
    let res = {
      reverse: reverseResponse.data
    };

    const data = await this._getOrderStatus('getOrderStatus.do', payload.orderId, true);
    res = Object.assign(res, data);
    if (data.hasError || orderStatusOf(data.data) !== 3) {
      res.hasError = true;
      res.errorStep = 'getOrderStatus.do';
    }

    return res;
  }

  depositOrder = async (order) => {
    const payload = (({ orderId }) => ({ orderId }))(order);

    const depositResponse = await this._depositOrder(order, 'deposit.do');
    if (depositResponse.hasError || !isSuccessCode(depositResponse.data)) {
      depositResponse.hasError = true;
      depositResponse.errorStep = 'deposit.do';
      return depositResponse;
    }
    let res = {
      deposit: depositResponse.data
    };

    const data = await this._getOrderStatus('getOrderStatus.do', payload.orderId, true);
    res = Object.assign(res, data);
    if (data.hasError || orderStatusOf(data.data) !== 2) {
      res.hasError = true;
      res.errorStep = 'getOrderStatus.do';
      return res;
    }

    return res;
  }

  refundOrder = async (order) => {
    const payload = (({ orderId, useBinding }) => ({ orderId, useBinding }))(order);
    const useBinding = payload.useBinding !== false;

    const refundResponse = await this._refundOrder(order, 'refund.do');
    if (refundResponse.hasError || !isSuccessCode(refundResponse.data)) {
      refundResponse.hasError = true;
      refundResponse.errorStep = 'refund.do';
      return refundResponse;
    }
    let res = {
      refund: refundResponse.data
    };

    const data = await this._getOrderStatus('getOrderStatus.do', payload.orderId, useBinding);
    res = Object.assign(res, data);
    if (data.hasError || orderStatusOf(data.data) !== 4) {
      res.hasError = true;
      res.errorStep = 'getOrderStatus.do';
    }

    return res;
  }
}

export default IDBANK;