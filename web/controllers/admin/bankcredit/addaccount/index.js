var util = require('util')
, _ = require('lodash')

module.exports = function(app, api, userId) {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $form = $el.find('.bank-account-form')

    $form.find('.account-number input').focusSoon()

    $form.on('submit', function(e) {
        e.preventDefault()

        var data = {
            account_number: $form.find('.account-number input').val() || null,
            iban: $form.find('.iban input').val() || null,
            swiftbic: $form.find('.swiftbic input').val() || null,
            routing_number: $form.find('.routing-number input').val() || null,
        }

        var $button = $form.find('.add-button')
        $button.addClass('is-loading').enabled(false)

        var url = 'admin/users/' + userId + '/bankAccounts'
        api.call(url, data, { type: 'POST' })
        .always(function() {
            $button.addClass('is-loading').enabled(false)
        })
        .done(function() {
            $el.trigger('added')
            $el.modal('hide')
        })
    })

    $el.modal()

    return controller
}
