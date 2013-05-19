var _ = require('lodash')

module.exports = function() {
    var routes = []
    , $window = $(window)

    $window.on('ready hashchange', function() {
        var hash = window.location.hash.substr(1)

        _.some(routes, function(route) {
            var match = route.expr.exec(hash)
            if (!match) return
            route.fn.apply(route, match.slice(1))
            return true
        })
    })

    var add = function(expr, fn) {
        routes.push({ expr: expr, fn: fn })
        return add
    }

    add.go = function(hash) {
        window.location.hash = hash
    }

    return add.add = add
}
