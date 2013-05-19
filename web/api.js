var _ = require('lodash')
, app = require('./app')

module.exports = function() {
    var api = {}

    function keyFromCredentials(email, password) {
        var concat = email.toLowerCase() + password
        , bits = sjcl.hash.sha256.hash(concat)
        , hex = sjcl.codec.hex.fromBits(bits)
        return hex
    }

    api.call = function(method, data, options) {
        var settings = {
            url: '/api/' + method,
            dataType: 'json'
        }

        options = options || {}

        if (options.key || api.key) {
            settings.url += '?key=' + (options.key || api.key)
        }

        if (options.type) settings.type = options.type
        else if (data) settings.type = 'POST'

        settings.data = data

        return $.ajax(settings)
    }

    api.login = function(email, password) {
        var key = keyFromCredentials(email, password)
        return api.call('v1/whoami', null, { key: key })
        .then(function(user) {
            api.key = key
            app.user(user)
        })
    }

    api.register = function(email, password) {
        return api.call('v1/users', {
            email: email,
            key: keyFromCredentials(email, password)
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
