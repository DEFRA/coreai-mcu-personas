const routes = [].concat(
  require('../routes/healthy'),
  require('../routes/healthz'),
  require('../routes/personas')
)

module.exports = {
  plugin: {
    name: 'router',
    register: (server, _) => {
      server.route(routes)
    }
  }
}
