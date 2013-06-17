var Q = require('q')
, activities = require('./activities')
, validate = require('./validate')
, transfer = module.exports = {}

transfer.configure = function(app, conn, auth) {
    app.post('/v1/transfer', auth, transfer.transfer.bind(transfer, conn))
}

transfer.transfer = function(conn, req, res, next) {
    if (!validate(req.body, 'transfer', res)) return
    if (req.body.currency == 'NOK') return next(new Error('Cannot transfer NOK'))

    Q.ninvoke(conn.write, 'query', {
        text: [
            'SELECT user_transfer_to_email($1, $2, $3, from_decimal($4, $3)) transaction_id, su.email sender_email, ru.email receiver_email,',
            'ru.user_id receiver_user_id',
            'FROM "user" su, "user" ru',
            'WHERE su.user_id = $1 AND ru.email_lower = $2'
        ].join('\n'),
        values: [req.user, req.body.email, req.body.currency, req.body.amount]
    })
    .then(function(dres) {
        var row = dres.rows[0]

        if (!row) {
            return res.send(400, {
                name: 'UserNotFound',
                message: 'The user ' + req.body.email + ' does not exist'
            })
        }

        activities.log(conn, req.user, 'SendToUser', {
            to: req.body.email,
            amount: req.body.amount,
            currency: req.body.currency
        })

        activities.log(conn, row.receiver_user_id, 'ReceiveFomUser', {
            from:  row.sender_email,
            amount: req.body.amount,
            currency: req.body.currency
        })

        res.send(204)
    }, function(err) {
        if (err.message.match(/^User with email/)) {
            return res.send(400, {
                name: 'UserNotFound',
                message: 'The user ' + req.body.email + ' does not exist'
            })
        }

        if (err.message == 'new row for relation "transaction" violates check constraint "transaction_debit_credit_not_same"') {
            return res.send(400, {
                name: 'CannotTransferToSelf',
                message: 'Cannot transfer to yourself'
            })
        }

        if (err.message == 'new row for relation "transaction" violates check constraint "transaction_amount_check"') {
            return res.send(400, {
                name: 'InvalidAmount',
                message: 'The requested transfer amount is invalid/out of range'
            })
        }

        if (err.message == 'new row for relation "account" violates check constraint "non_negative_available"') {
            return res.send(400, {
                name: 'InsufficientFunds',
                message: 'Insufficient funds'
            })
        }

        return next(err)
    })
}
