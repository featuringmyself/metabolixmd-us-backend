const { expect } = require('chai');
const sinon = require('sinon');
const paymentService = require('../services/payment.service');
const webhookController = require('../controllers/webhook.controller');

describe('Payment Service', () => {
  describe('createPayment', () => {
    it('should create a payment with valid source ID', async () => {
      const sourceId = 'cnon:card-nonce-ok';
      const amount = 1000; // $10.00
      
      const result = await paymentService.createPayment(sourceId, amount);
      
      expect(result).to.have.property('id');
      expect(result.status).to.equal('COMPLETED');
      expect(result.amountMoney.amount).to.equal(amount);
    });

    it('should throw error for invalid source ID', async () => {
      const sourceId = 'invalid-source';
      const amount = 1000;
      
      try {
        await paymentService.createPayment(sourceId, amount);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const paymentId = 'test-payment-id';
      const result = await paymentService.getPaymentStatus(paymentId);
      
      expect(result).to.have.property('id', paymentId);
      expect(result).to.have.property('status');
    });
  });
});

describe('Webhook Controller', () => {
  let req, res;

  beforeEach(() => {
    const webhookPayload = {
      type: 'payment.updated',
      data: {
        object: {
          payment: {
            id: 'test-payment-id',
            status: 'COMPLETED',
            order_id: 'test-order-id'
          }
        }
      }
    };

    req = {
      headers: {
        'x-square-hmacsha256-signature': 'valid-signature'
      },
      originalUrl: '/webhook',
      body: Buffer.from(JSON.stringify(webhookPayload))
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
  });

  describe('handleWebhook', () => {
    it('should validate webhook signature', async () => {
      const validateStub = sinon.stub(webhookController, 'validateWebhookSignature')
        .returns(true);

      await webhookController.handleWebhook(req, res);

      expect(validateStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });

    it('should handle invalid signature', async () => {
      const validateStub = sinon.stub(webhookController, 'validateWebhookSignature')
        .returns(false);

      await webhookController.handleWebhook(req, res);

      expect(validateStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ error: 'Invalid webhook signature' })).to.be.true;
    });
  });

  describe('processPaymentUpdate', () => {
    it('should process completed payment', async () => {
      const payment = {
        id: 'test-payment-id',
        status: 'COMPLETED',
        order_id: 'test-order-id'
      };

      const getPaymentStatusStub = sinon.stub(paymentService, 'getPaymentStatus')
        .resolves({ ...payment, status: 'COMPLETED' });

      await webhookController.processPaymentUpdate(payment);

      expect(getPaymentStatusStub.calledOnce).to.be.true;
      expect(getPaymentStatusStub.calledWith('test-payment-id')).to.be.true;
    });

    it('should not process non-completed payment', async () => {
      const payment = {
        id: 'test-payment-id',
        status: 'PENDING',
        order_id: 'test-order-id'
      };

      const getPaymentStatusStub = sinon.stub(paymentService, 'getPaymentStatus');

      await webhookController.processPaymentUpdate(payment);

      expect(getPaymentStatusStub.called).to.be.false;
    });
  });

  describe('processOrderUpdate', () => {
    it('should process order with payments', async () => {
      const order = {
        id: 'test-order-id',
        payments: [
          {
            id: 'test-payment-id',
            status: 'COMPLETED'
          }
        ]
      };

      const processPaymentUpdateStub = sinon.stub(webhookController, 'processPaymentUpdate');

      await webhookController.processOrderUpdate(order);

      expect(processPaymentUpdateStub.calledOnce).to.be.true;
      expect(processPaymentUpdateStub.calledWith(order.payments[0])).to.be.true;
    });

    it('should handle order without payments', async () => {
      const order = {
        id: 'test-order-id',
        payments: []
      };

      const processPaymentUpdateStub = sinon.stub(webhookController, 'processPaymentUpdate');

      await webhookController.processOrderUpdate(order);

      expect(processPaymentUpdateStub.called).to.be.false;
    });
  });
}); 