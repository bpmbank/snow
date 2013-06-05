var EventEmitter = require('events').EventEmitter
, _ = require('lodash')
, app = module.exports = new EventEmitter()
, debug = require('./util/debug')('app')

app.user = function(value) {
    if (!_.isUndefined(value)) {
        app._user = value
        app.emit('user', value)
    }
    return app._user
}

app.section = function(name) {
    $('.top .nav .' + name).addClass('active').siblings().removeClass('active')
}

app.balances = function(value) {
    if (!_.isUndefined(value)) {
        app._balances = value
        app.emit('balances', value)
    }
    return app._balances
}

app.alertXhrError = function(xhr) {
    app.reportErrorFromXhr(xhr)
    alert(JSON.stringify(app.bodyFromXhr(xhr), null, 4))
}

app.authorize = function() {
    if (app._user) return true
    window.location.hash = '#login?after=' + window.location.hash.substr(1)
    return false
}

app.reportErrorFromXhr = function(xhr) {
    if (typeof Raven != 'undefined') {
        var tags = {
            hash: window.location.hash,
            readyState: xhr.readyState,
            body: app.bodyFromXhr(xhr),
            status: xhr.status,
            request: xhr.settings
        }

        debug('Sending message to Raven', tags)

        Raven.captureMessage('Exception alert()\'ed to the user', { tags: tags })
    }
}

app.errorFromXhr = function(xhr) {
    if (xhr.getAllResponseHeaders().match(/Content-Type: application\/json/i)) {
        try {
            return JSON.parse(xhr.responseText)
        } catch (err) {
        }
    }

    return null
}

app.bodyFromXhr = function(xhr) {
    if (xhr.getAllResponseHeaders().match(/Content-Type: application\/json/i)) {
        try {
            return JSON.parse(xhr.responseText)
        } catch (err) {
        }
    }

    return xhr.responseText
}
