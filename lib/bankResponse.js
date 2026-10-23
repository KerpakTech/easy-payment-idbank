// EPG returns the same REST methods as the old iPay host, with two response quirks:
// errorCode may be 0 or "0" (and register.do may omit it on success), and
// getOrderStatus.do uses PascalCase (OrderStatus, ErrorCode) while
// getOrderStatusExtended.do uses camelCase.

const normalizeBankData = data => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  if (data.errorCode == null && data.ErrorCode != null) {
    data.errorCode = data.ErrorCode;
  }
  if (data.errorMessage == null && data.ErrorMessage != null) {
    data.errorMessage = data.ErrorMessage;
  }
  if (data.orderStatus == null && data.OrderStatus != null) {
    data.orderStatus = data.OrderStatus;
  }
  if (data.orderNumber == null && data.OrderNumber != null) {
    data.orderNumber = data.OrderNumber;
  }
  if (data.orderStatus != null && data.orderStatus !== '') {
    const status = Number(data.orderStatus);
    if (!Number.isNaN(status)) {
      data.orderStatus = status;
    }
  }
  if (data.approvalCode == null && data.authorizationResponseId != null) {
    data.approvalCode = data.authorizationResponseId;
  }
  if (data.cardAuthInfo && typeof data.cardAuthInfo === 'object') {
    if (data.cardAuthInfo.approvalCode == null && data.cardAuthInfo.authorizationResponseId != null) {
      data.cardAuthInfo.approvalCode = data.cardAuthInfo.authorizationResponseId;
    }
  }
  if (!data.bindingInfo && (data.bindingId || data.clientId)) {
    data.bindingInfo = {
      clientId: data.clientId,
      bindingId: data.bindingId,
    };
  }
  return data;
};

// allowMissingWhenOrderId: register.do success example is { orderId, formUrl } with no errorCode.
const isSuccessCode = (data, { allowMissingWhenOrderId = false } = {}) => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const code = data.errorCode ?? data.ErrorCode;
  if (code === undefined || code === null || code === '') {
    return allowMissingWhenOrderId && Boolean(data.orderId);
  }
  const numeric = Number(code);
  return !Number.isNaN(numeric) && numeric === 0;
};

const orderStatusOf = data => {
  if (!data || data.orderStatus == null || data.orderStatus === '') {
    return undefined;
  }
  const status = Number(data.orderStatus);
  return Number.isNaN(status) ? undefined : status;
};

export { normalizeBankData, isSuccessCode, orderStatusOf };
