module.exports = { 
    resolvers: { 
        SetPaymentMethodOnCartOutput : 
        { 
            isOrderPlaced: {
                selectionSet: '{    cart { id prices { grand_total { value } } } }',
                resolve:async (root,args,context, info) => {
                    const paymentPayload = {
                        payment_method: 'stripe',
                        amount: root.cart.prices.grand_total.value
                    }
                    try {
                        let paymentResponse = await context.stripe.Mutation.stripe_PostPaymentIntents({
                            root,
                            args: { input: {
                                amount: `${paymentPayload.amount}`,
                                currency: "USD",
                                payment_method: "pm_card_visa",
                                confirm: true,
                                automatic_payment_methods: {
                                    enabled: true,
                                    allow_redirects: "never"
                                }
                            }},
                            context,
                            info,
                            selectionSet: "{... on stripe_PaymentIntent {amount amount_received } ... on stripe_error {error { message}}}" 
                        });

                        let result = {};
                        try {
                            result = JSON.parse(paymentResponse);
                        } catch(e) {
                            result = paymentResponse;
                        }
                        
                        if (result['__typename'] == 'stripe_PaymentIntent') {
                            let placeOrderResponse = await context.commerceGraphql.Mutation.placeOrder(
                                {
                                    root,
                                    context,
                                    info,
                                    args: {
                                        input: {
                                            cart_id: root.cart.id,
                                            payment_payload: JSON.stringify(paymentPayload)
                                        }
                                    },
                                    selectionSet: "{ order { order_number} }"
                                }
                            );

                            return placeOrderResponse.order.order_number;
                        } else {
                            return 'stripe payment failed';
                        }
                    } catch(error) {
                        return `${JSON.stringify(paymentPayload)} error ${JSON.stringify(error)}`;
                    }
                }

            }
        }
    }
}
