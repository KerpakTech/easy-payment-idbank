# easy-payment-idbank

## Installation ##


    $ npm install -save easy-payment @easy-payment/idbank

## Usage

```javascript

const Gateways = require('easy-payment');
const IDBANK = require('@easy-payment/idbank').gateway;

const settings = {
    USER_NAME_API: 'USER_NAME',
    PASSWORD_API: 'PASSWORD',
    USER_NAME_API_BINDING: 'USER_NAME_API_BINDING',
    PASSWORD_API_BINDING: 'PASSWORD_API_BINDING',

};
const client = Gateways.create(IDBANK, settings);

```

## Gateway API

This is an adaptor of IDBANK APIs for [easy-payment](https://github.com/KerpakTech/easy-payment-main).
It implements the [BaseGateway](https://github.com/KerpakTech/easy-payment-base) API.
