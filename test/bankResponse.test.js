import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSuccessCode, normalizeBankData, orderStatusOf } from '../lib/bankResponse.js';

describe('EPG bank response', () => {
  it('accepts numeric and string success codes', () => {
    assert.equal(isSuccessCode({ errorCode: 0 }), true);
    assert.equal(isSuccessCode({ errorCode: '0' }), true);
    assert.equal(isSuccessCode({ ErrorCode: '0' }), true);
    assert.equal(isSuccessCode({ errorCode: '5' }), false);
    assert.equal(isSuccessCode({ errorCode: 5 }), false);
  });

  it('treats register.do without errorCode as success only when orderId is present', () => {
    assert.equal(isSuccessCode({ orderId: 'abc', formUrl: 'https://pay' }, { allowMissingWhenOrderId: true }), true);
    assert.equal(isSuccessCode({ errorMessage: 'Access is denied' }, { allowMissingWhenOrderId: true }), false);
    assert.equal(isSuccessCode({}), false);
  });

  it('copies getOrderStatus.do PascalCase fields onto the camelCase names callers use', () => {
    const data = normalizeBankData({
      ErrorCode: '0',
      ErrorMessage: 'Success',
      OrderStatus: 2,
      OrderNumber: '26122017090903',
      authorizationResponseId: '077807',
      bindingId: 'bind-1',
      clientId: 'client-1',
      cardAuthInfo: { pan: '400001**0050', authorizationResponseId: '077807' },
    });
    assert.equal(data.errorCode, '0');
    assert.equal(data.orderStatus, 2);
    assert.equal(data.orderNumber, '26122017090903');
    assert.equal(data.approvalCode, '077807');
    assert.equal(data.cardAuthInfo.approvalCode, '077807');
    assert.equal(data.bindingInfo.bindingId, 'bind-1');
    assert.equal(data.bindingInfo.clientId, 'client-1');
    assert.equal(orderStatusOf(data), 2);
  });

  it('keeps an existing bindingInfo block', () => {
    const data = normalizeBankData({
      bindingId: 'top',
      bindingInfo: { bindingId: 'nested', clientId: 'c' },
    });
    assert.equal(data.bindingInfo.bindingId, 'nested');
  });
});
