var crypto = require('crypto')
, intercom = module.exports = {}

intercom.configure = function(app, conn, auth) {
    app.get('/v1/intercom', auth, intercom.intercom.bind(intercom, conn, app.config))
}

intercom.intercom = function(conn, config, req, res, next) {
    conn.read.query({
        text: [
            'SELECT user_id, email_lower, FLOOR(EXTRACT(epoch FROM created))::int created',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dres) {
        if (err) return next(err)
        var hmac = crypto.createHmac('sha256', config.intercom_secret)
        , user = dres.rows[0]
        hmac.update('' + user.user_id)

        res.send({
            app_id: config.intercom_app_id,
            user_id: user.user_id,
            email: user.email_lower,
            user_hash: hmac.digest('hex'),
            created_at: user.created
        })
    })
}
