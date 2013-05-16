var _ = require('lodash')

module.exports = function(app, api) {
    function attach(user) {
        console.log('Fetching Intercom settings')
        api.call('v1/intercom')
        .done(function(settings) {
            console.log('Intercom settings', settings)
            console.log('Identifying with segment.io')

            analytics.identify(user.id.toString(), {
                email: user.email,
                created: settings.created_at
            }, {
                intercom: settings
            })
        })
    }

    app.on('user', attach)
}
