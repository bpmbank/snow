require('../../vendor/shake')

var _ = require('lodash')
, validateEmailTimer
, validatePasswordTimer
, validateRepeatTimer

module.exports = function() {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $form = $el.find('.register-form')
    , $email = $form.find('.control-group.email')
    , $password = $form.find('.control-group.password')
    , $repeat = $form.find('.control-group.repeat')
    , $submit = $form.find('button')
    , $advanced = $el.find('.modal.advanced')

    $email.find('.help-inline').html(i18n('register.hints.email'))
    $password.find('.help-inline').html(i18n('register.hints.password'))
    $repeat.find('.help-inline').html(i18n('register.hints.repeat'))

    $email.add($repeat).add($password)
    .on('focus keyup', 'input', function() {
        // Show initial hint on focus
        $(this)
        .closest('.control-group')
        .find('.help-inline')
        .css('visibility', 'visible')
    })
    .on('keyup', function(e) {
        if (e.which == 13 || e.which == 9) return

        // Revert to the original hint
        var group = $(this).closest('.control-group')
        group.removeClass('error warning success is-valid')
        .find('.help-inline')
        .html(i18n('register.hints.' + group.find('input').attr('name')))
    })

    function validateEmail() {
        var email = $email.find('input').val()
        , expression = /^\S+@\S+$/
        , $hint = $email.find('.help-inline')

        var valid = !!email.match(expression)

        if (valid) {
            $email.removeClass('error').addClass('success')
            $hint.html(i18n('register.successes.email'))
        } else {
            $email.removeClass('success').addClass('error')
            $hint.html(i18n('register.errors.email.badFormat'))
        }

        $email.toggleClass('is-valid', valid)

        return valid
    }

    function validatePassword() {
        var password = $password.find('input').val()
        , $hint = $password.find('.help-inline')

        var valid = password.length >= 6

        if (valid) {
            $password.removeClass('error').addClass('success')
            $hint.html(i18n('register.successes.password'))
        } else {
            $password.removeClass('success').addClass('error')
            $hint.html(i18n('register.errors.password.tooShort'))
        }

        $password.toggleClass('is-valid', valid)

        return valid
    }

    function validateRepeat() {
        var repeat = $repeat.find('input').val()
        , $hint = $repeat.find('.help-inline')
        , password = $password.find('input').val()

        if (!$password.hasClass('is-valid')) {
            $repeat.removeClass('success error is-valid')
            $hint.html('')
            return
        }

        var valid = repeat == password

        if (valid) {
            $repeat.removeClass('error').addClass('success')
            $hint.html(i18n('register.successes.repeat'))
        } else {
            $repeat.removeClass('success').addClass('error')
            $hint.html(i18n('register.errors.repeat.notSame'))
        }

        $repeat.toggleClass('is-valid', valid)

        return valid
    }

    $email.on('change keyup blur', 'input', function(e) {
        if (e.which == 9) return
        validateEmailTimer && clearTimeout(validateEmailTimer)
        validateEmailTimer = setTimeout(function() {
            validateEmail()
        }, 750)
    })

    $password.on('change keyup blur', 'input', function(e) {
        if (e.which == 9) return
        validatePasswordTimer && clearTimeout(validatePasswordTimer)
        validatePasswordTimer = setTimeout(function() {
            validatePassword()
            validateRepeat()
        }, 750)
    })

    $repeat.on('change keyup blur', 'input', function(e) {
        if (e.which == 9) return
        validateRepeatTimer && clearTimeout(validateRepeatTimer)
        validateRepeatTimer = setTimeout(function() {
            validateRepeat()
        }, 750)
    })

    $form.on('submit', function(e) {
        e.preventDefault()

        validateEmail()
        validatePassword()
        validateRepeat()

        var fields = [$email, $password, $repeat]
        , invalid

        _.some(fields, function($e) {
            if ($e.hasClass('is-valid')) return
            $submit.shake()
            $e.find('input').focus()
            invalid = true
            return
        })

        if (invalid) return

        $submit.prop('disabled', true)
        .addClass('is-loading')
        .html(i18n('register.create button.creating'))


        $advanced.modal({
            keyboard: false,
            backdrop: 'static'
        })
    })

    function register(simple) {
        api.register($email.find('input').val(), $password.find('input').val(), simple)
        .always(function() {
            $submit.prop('disabled', false)
            .removeClass('is-loading')
            .html(i18n('register.create button'))
        }).done(function() {
            window.location.hash = '#'
        }).fail(function(xhr) {
            var err = errors.fromXhr(xhr)

            if (err !== null && err.name == 'EmailFailedCheck') {
                $email.find('input').focus()

                $email
                .removeClass('success')
                .addClass('error')
                .find('.help-inline')
                .html(i18n('register.errors.email.checkFailed'))

                $submit.shake()
                return
            }

            errors.alertFromXhr(xhr)
        })
    }

    $advanced.on('click', '.normal-user', function(e) {
        e.preventDefault()
        $advanced.modal('hide')
        register(true)
    })

    $advanced.on('click', '.expert-user', function(e) {
        e.preventDefault()
        $advanced.modal('hide')
        register(false)
    })

    $email.find('input').focusSoon()

    return controller
}
