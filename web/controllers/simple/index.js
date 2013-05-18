var num = require('num')
, _ = require('lodash')
, debug = require('debug')('simple')

module.exports = function(app, api) {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $balance = $el.find('.balance')
    , $converted = $el.find('.balance-converted')
    , balance
    , last

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function formatNumber(n, p) {
        var s = num(n).set_precision(p || 2).toString()
        return numberWithCommas(s)
    }

    function balancesUpdated(balances) {
        var indexed = balances.reduce(function(p, c) {
            p[c.currency] = c.available
            return p
        }, {})

        balance = indexed.BTC
        $balance.html(formatNumber(balance) + ' BTC')
        recalculate()
    }

    app.on('balances', balancesUpdated)

    app.balances() && balancesUpdated(app.balances())

    function marketsUpdated(markets) {
        var market = _.find(markets, { id: 'BTCNOK' })
        last = market.last
        recalculate()
    }

    function recalculate() {
        if (!last) {
            debug('cannot convert without a last price')
            return
        }

        debug('market last %s', last)

        var converted = num(balance).mul(last)
        converted.set_precision(2)
        converted = converted.toString() + ' NOK'
        debug('converted %s', converted)

        $converted.html(converted)
    }

    function refreshMarkets() {
        debug('refreshing markets')

        api.call('v1/markets')
        .always(function() {
            setTimeout(refreshMarkets, 30e3)
        })
        .then(marketsUpdated)
    }

    refreshMarkets()

    return controller
}
