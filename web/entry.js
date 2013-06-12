var api = require('./api')()
, $app = $('body')
, app = window.app = require('./app')
, debug = require('./util/debug')('snow:entry')

require('./helpers/jquery')

if (window.analytics) {
    require('./segment')(app, api)
}

app.on('user', function(user) {
    $app.toggleClass('is-logged-in', !!user)
    $app.toggleClass('is-admin', user && user.admin)

    var checkPhone = function(next) {
        if (user.phone) return next()
        var verifyphone = require('./controllers/verifyphone')(app, api)
        $app.append(verifyphone.$el)
        verifyphone.$el.modal({
            keyboard: false,
            backdrop: 'static'
        })
        verifyphone.$el.on('hidden', next)
    }

    var checkEmail = function(next) {
        if (user.emailVerified) return next()
        var verifyemail = require('./controllers/verifyemail')(app, api)
        $app.append(verifyemail.$el)
        verifyemail.$el.modal({
            keyboard: false,
            backdrop: 'static'
        })
        verifyemail.$el.on('hidden', next)
    }

    checkEmail(function() {
        checkPhone(function() {
            debug('verifications done')
        })
    })
})

app.bitcoinAddress = (function() {
    var address
    return function() {
        var d = $.Deferred()
        if (address) d.resolve(address)
        return api.call('v1/BTC/address')
        .then(function(result) {
            return result.address
        })
    }
})()

app.litecoinAddress = (function() {
    var address
    return function() {
        var d = $.Deferred()
        if (address) d.resolve(address)
        return api.call('v1/LTC/address')
        .then(function(result) {
            return result.address
        })
    }
})()

app.rippleAddress = (function() {
    var address
    return function() {
        var d = $.Deferred()
        if (address) d.resolve(address)
        return api.call('v1/ripple/address')
        .then(function(result) {
            return result.address
        })
    }
})()

window.numbers = require('./util/numbers')

function i18n() {
    var language = $.cookie('language') || null
    app.i18n = window.i18n = require('./i18n')(language)

    var moment = require('moment')
    require('moment/lang/es')
    require('moment/lang/nb')

    if (app.i18n.lang == 'nb-NO') moment.lang('nb')
    else if (app.i18n.lang == 'es-ES') moment.lang('es')
    else moment.lang('en')

    $.fn.i18n = function() {
        $(this).html(app.i18n.apply(app.i18n, arguments))
    }

    if (!language) {
        api.call('v1/language')
        .fail(app.reportErrorFromXhr)
        .done(function(res) {
            if (!res.language) {
                debug('API failed to guess our language')
            } else {
                $.cookie('language', res.language, { expires: 365 * 10 })

                if (res.language.toLowerCase() == app.i18n.lang.toLowerCase()) {
                    debug('Already using the language suggested by the API')
                } else {
                    debug('Should switch language to %s', res.language)
                    setLanguageAndRefresh(res.language)
                }
            }
        })
    }
}

i18n()

var top = require('./controllers/top')(app, api)
$app.find('.top').replaceWith(top.$el)

function setLanguageAndRefresh(language) {
    debug('changing language to ' + language + ' with cookie')
    $.cookie('language', language, { expires: 365 * 10 })
    window.location.reload()
}

$app.on('click', 'a[href="#set-language"]', function(e) {
    e.preventDefault()
    var language = $(this).attr('data-language')
})

var apiKey = $.cookie('apiKey')

if (apiKey) {
    debug('using cached credentials')
    api.loginWithKey(apiKey)
    .done(startRouter)
} else {
    debug('no cached credentials')
    startRouter()

    if ($.cookie('existingUser')) {
        app.router.go('login')
    }
}

$(window).on('hashchange', function() {
    if (typeof analytics != 'undefined') {
        analytics.pageview()
    }
})

function startRouter() {
    debug('starting router')
    var router = require('./router')()
    app.router = router
    require('./routes')(app, api, router)
    router.now()
}
