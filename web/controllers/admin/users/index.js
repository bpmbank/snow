module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('.users')
    , $form = $el.find('.search-form')

    // Navigation partial
    $el.find('.nav-container').html(require('../header')('users').$el)

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $(itemTemplate(item))
            $item.attr('data-id', item.user_id)
            return $item
        }))
    }

    function refresh(query) {
        $form.addClass('is-loading')

        api.call('admin/users', null, { qs: query })
        .fail(app.alertXhrError)
        .always(function() {
                $form.removeClass('is-loading')
        })
        .done(itemsChanged)
    }

    $form.on('submit', function(e) {
        function parseField(val) {
            var val = val.replace(/^\s+|\s+$/g, '')
            return val.length ? val : null
        }

        e.preventDefault()

        refresh({
            all: parseField($form.find('.query').val())
        })
    })

    refresh()

    app.section('admin')
    $el.find('.nav a[href="#admin/users"]').parent().addClass('active')

    $el.find('.query').focusSoon()

    return controller
}
