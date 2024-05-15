require('./insights').setup()
const createServer = require('./server')
const { initialiseTable } = require('./storage/repos/persona')

const init = async () => {
  const server = await createServer()
  await server.start()

  if (process.env.INIT_STORAGE) {
    await initialiseTable()
  }
  
  console.log('Server running on %s', server.info.uri)
}

init()
