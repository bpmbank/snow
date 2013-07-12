var debug = require('debug')('snow:email:notify')
, _ = require('lodash')
, async = require('async')
, notify = module.exports = function(conn, emailer) {
    notify.conn = conn
    notify.emailer = emailer
    notify.schedule()
}

function stripZeroes(x) {
    return ~x.indexOf('.') ? x.replace(/\.?0+$/, '') : x
}

notify.process = function(row, cb) {
    var template
    , locals = {
        userId: row.user_id,
        firstName: row.first_name,
        language: row.language,
        email: row.email
    }

    var details = row.details = JSON.parse(row.details)

    if (row.type == 'FillOrder') {
        template = 'fill-order'
        locals.market = details.market
        locals.type = details.type ? 'ask' : 'bid'
        locals.base = details.market.substr(0, 3)
        locals.quote = details.market.substr(3)
        locals.price = locals.price ? stripZeroes(details.price) : null
        locals.original = stripZeroes(details.original)
        locals.total = stripZeroes(details.total)
    } else if (row.type == 'WithdrawComplete') {
        template = 'withdraw-complete'
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
        locals.method = details.method
    } else if (row.type == 'ReceiveFromUser') {
        template = 'receive-from-user'
        locals.from = details.from
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
    } else if (row.type == 'Credit') {
        template = 'credit'
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
    } else if (row.type == 'ChangePassword') {
        template = 'change-password'
    }

    if (!template) {
        // TODO: Raven
        console.error('Not sure how to send activity of type %s', row.type)
        return cb()
    }

    notify.emailer.send(row.user_id, template, locals, cb)
}

notify.schedule = function() {
    // TODO: Remove magic number
    return setTimeout(notify.tick, 5e3)
}

notify.tick = function() {
    debug('ticking...')

    var query = 'SELECT * FROM pending_email_notify'

    notify.conn.read.query(query, function(err, dr) {
        if (err) {
            // TODO: Raven
            console.error('Failed to check for new email notifications')
            console.error(err)
            return notify.schedule()
        }

        debug('processing %s rows', dr.rowCount || 'no')

        async.each(dr.rows, notify.process, function() {
            if (!dr.rowCount) {
                // TODO: Remove magic number
                return notify.schedule()
            }

            var tip = _.max(dr.rows, 'activity_id').activity_id

            debug('setting tip to %s', tip)

            notify.conn.write.query({
                text: [
                    'UPDATE settings SET notify_tip = $1',
                    'WHERE notify_tip < $1'
                ].join('\n'),
                values: [tip]
            }, function(err) {
                if (err) {
                    console.error('Failed to set notify tip')
                    console.error(err)
                } else {
                    debug('set tip to %s', tip)
                }

                notify.schedule()
            })
        })
    })
}
