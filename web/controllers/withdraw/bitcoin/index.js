var template = require('./index.html')
, _ = require('lodash')

module.exports = function() {
    var $el = $('<div class="withdraw-bitcoin is-entry">').html($(template()))
    , controller = {
        $el: $el
    }
    , amount = require('../../shared/amount-input')({
        fixedCurrency: true,
        currency: 'BTC'
    })
    , $address = $el.find('.entry .address')
    , $button = $el.find('.entry .submit')
    , $status = $el.find('.summary .status')
    , timer

    $el.find('.amount-placeholder').replaceWith(amount.$el)

    function validateAddress(emptyIsError) {
        var val = $el.field('address').val()
        , empty = !val.length

        if (empty) {
            $address.toggleClass('error is-invalid', emptyIsError === true)
            return
        }

        if (!val.match(/^(1|3)[a-z0-9]{26,33}$/i)){
            $address.addClass('error is-invalid')
            return
        }

        $address.removeClass('error is-invalid')
        return true
    }

    function updateRequestStatus(requestId, delay) {
        $status.addClass('is-updating')

        api.call('v1/withdraws')
        .fail(function() {
            timer = setTimeout(function() {
                updateRequestStatus(requestId, delay * 2)
            }, delay)
        })
        .done(function(res) {
            var wr = _.find(res, { id: requestId })
            $status.removeClasses(/^is-/)
            .addClass('is-' + wr.state)

            if (wr.state == 'requested' || wr.state == 'processing') {
                timer = setTimeout(function() {
                    updateRequestStatus(requestId, delay * 2)
                }, delay)
            }

            if (wr.state == 'cancelled') {
                $status.find('.cancelled-reason').html(wr.error)
            }

            if (wr.state == 'cancelled' || wr.state == 'completed') {
                api.balances()
            }
        })
    }

    function showSummary(requestId) {
        $el.toggleClass('is-review is-summary')

        $status.addClass('is-requested')

        updateRequestStatus(requestId, 2e3)
    }

    $el.field('address').on('keyup', validateAddress)

    $el.on('submit', '.entry', function(e) {
        e.preventDefault()

        validateAddress(true)
        amount.validate(true)

        var $invalid = $el.find('.entry .is-invalid')

        if ($invalid.length) {
            $button.shake()
            $invalid.filter(':first').find('.field:visible:first').focus()
            return
        }

        $el.toggleClass('is-entry is-review')

        $el.find('.review .amount, .summary .amount')
        .html($el.field('amount').val())

        $el.find('.review .address, .summary .address')
        .html($el.field('address').val())
    })

    $el.on('click', '.review .confirm', function(e) {
        e.preventDefault()

        $el.find('.review .submit').loading(true, 'Confirming...')
        api.call('v1/btc/out', {
            amount: $el.field('amount').parseNumber(),
            address: $el.field('address').val()
        })
        .fail(errors.alertFromXhr)
        .done(function(res) {
            showSummary(res.id)
            api.balances()
        })
    })

    controller.destroy = function() {
        timer && clearTimeout(timer)
    }

    return controller
}
