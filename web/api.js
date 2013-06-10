var _ = require('lodash')
, app = require('./app')

module.exports = function() {
    var api = {}

    api.keyFromCredentials = function(email, password) {
        var concat = email.toLowerCase() + password
        , bits = sjcl.hash.sha256.hash(concat)
        , hex = sjcl.codec.hex.fromBits(bits)
        return hex
    }

    api.call = function(method, data, options) {
        var settings = {
            url: '/api/' + method
        }

        options = options || {}
        options.qs = options.qs || {}
        options.qs.ts = +new Date()

        if (options.key || api.key) {
            options.qs.key = options.key || api.key
        }

        if (options.type) settings.type = options.type
        else if (data) settings.type = 'POST'

        if (data) {
            settings.contentType = 'application/json; charset=utf-8'
            settings.data = JSON.stringify(data)
        }

        if (_.size(options.qs)) {
            var params = _.map(options.qs, function(v, k) {
                // this is a little hackish. to send a key without a value
                if (v === null) return null
                if (_.isString(v) && !v.length) return k
                return k + '=' + encodeURIComponent(v)
            })

            params = _.filter(params, function(x) {
                return x !== null
            })

            settings.url += '?' + params.join('&')
        }

        var xhr = $.ajax(settings)
        xhr.settings = settings
        return xhr
    }

    api.loginWithKey = function(key) {
        return api.call('v1/whoami', null, { key: key })
        .then(function(user) {
            $.cookie('apiKey', key)
            $.cookie('existingUser', true, { expires: 365 * 10 })
            api.key = key
            app.user(user)
        })
    }

    api.login = function(email, password) {
        var key = api.keyFromCredentials(email, password)
        return api.loginWithKey(key)
    }

    api.register = function(email, password, simple) {
        return api.call('v1/users', {
            email: email,
            key: api.keyFromCredentials(email, password),
            simple: simple
        })
        .then(function() {
            return api.login(email, password)
        })
    }

    api.balances = function() {
        api.call('v1/balances')
        .done(_.bind(app.balances, app))
    }

    return api
}