/* global alertify */
var num = require('num')
, _ = require('lodash')
, footerTemplate = require('../footer.html')
, header = require('../header')

module.exports = function() {
    var $el = $('<div class="simple-send simple">').html($(require('./template.html')()))
    , controller = {
        $el: $el
    }
    , $sendForm = $el.find('.send-form')
    , $balance = $el.find('.balance')
    , balance
    , $amount = $el.find('.amount')
    , $address = $el.find('.address')
    , amountValidateTimer
    , addressValidateTimer
    , $button = $el.find('.sell-button')

    // Insert header
    $el.find('.header-placeholder').replaceWith(header().$el)

    // Insert footer
    $el.find('.footer-placeholder').replaceWith(footerTemplate())


    function balancesUpdated(balances) {
        var indexed = _.reduce(balances, function(p, c) {
            p[c.currency] = c.available
            return p
        }, {})

        balance = indexed.BTC
        $balance.html(numbers.format(balance, { ts: ',', maxPrecision: 8 }) + ' BTC')
    }

    api.on('balances', balancesUpdated)
    api.balances()

    function validateAmount(emptyIsError) {
        var amount = $amount.find('input').val()
        $amount.removeClass('error is-invalid is-empty')

        if (!amount.length) {
            $amount.addClass('is-empty')
            if (emptyIsError === true) $amount.addClass('error')
            return
        }

        // NaN or <= 0
        if (amount <= 0 || isNaN(amount)) {
            $amount.addClass('is-invalid error')
            return
        }

        if (_.isUndefined(balance)) {
            throw new Error('balance is undefined')
        }

        if (num(amount).gt(balance)) {
            $amount.addClass('is-invalid error')
            return
        }

        return true
    }

    function validateAddress(emptyIsError) {
        var address = $address.find('input').val()
        $address.removeClass('error is-invalid is-empty')

        if (!address.length) {
            $address.addClass('is-empty')
            if (emptyIsError === true) $address.addClass('error')
            return
        }

        if (!address.match(/^1[1-9a-zA-z]{26,33}$/)) {
            $address.addClass('is-invalid error')
            return
        }

        return true
    }

    $amount.on('change keyup leave', function() {
        $amount.removeClass('error is-invalid is-empty')
        amountValidateTimer && clearTimeout(amountValidateTimer)
        amountValidateTimer = setTimeout(validateAmount, 750)
    })


    $address.on('change keyup leave', function() {
        $address.removeClass('error is-invalid is-empty')
        addressValidateTimer && clearTimeout(addressValidateTimer)
        addressValidateTimer = setTimeout(validateAddress, 750)
    })

    $sendForm.on('submit', function(e) {
        e.preventDefault()

        if (!validateAddress(true)) {
            $address.find('input').focus()
        }

        if (!validateAmount(true)) {
            $amount.find('input').focus()
        }

        if ($sendForm.find('.is-empty, .is-invalid').length) {
            return
        }

        $amount.find('input')
        .add($address.find('input'))
        .enabled(false)

        $button.loading(true)

        api.call('v1/btc/out', {
            amount: $amount.find('input').val(),
            address: $address.find('input').val()
        })
        .fail(errors.alertFromXhr)
        .done(function() {
            alertify.log(i18n('withdrawbtc.confirmation'))
            api.balances()
            window.location.hash = '#simple'
        })
    })

    controller.destroy = function() {
        addressValidateTimer && clearTimeout(addressValidateTimer)
        amountValidateTimer && clearTimeout(amountValidateTimer)
        api.off('balances', balancesUpdated)
    }

    $amount.find('input').focusSoon()

    return controller
}