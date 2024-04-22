const tableConfig = require('../../config/storage')
const { getTableClient } = require('../table-client')

const tableClient = getTableClient(tableConfig.personaTable)

const initialiseTable = async () => {
  await tableClient.createTable(tableConfig.personaTable)
}

const calculateRowKey = (name, version) => {
  const escaped = name.toLowerCase().replace(' ', '_')

  return version ? `${escaped}:${version}` : escaped
}

const enrichPersona = (persona) => ({
  partitionKey: `${persona.project}_${persona.type}`,
  rowKey: calculateRowKey(persona.name, persona.version),
  persona: persona.persona,
  name: persona.name
})

const formatPersona = (persona) => {
  const details = persona.partitionKey.split('_')

  return {
    project: details[0],
    type: details[1],
    name: persona.name,
    persona: persona.persona,
    version: persona.version
  }
}

const checkEntityExists = async (partitionKey, rowKey) => {
  try {
    const entity = await tableClient.getEntity(partitionKey, rowKey)

    return entity
  } catch (error) {
    if (error.statusCode === 404) {
      return false
    }

    throw error
  }
}

const addPersona = async (persona) => {
  const enriched = enrichPersona(persona)

  const exists = await checkEntityExists(enriched.partitionKey, enriched.rowKey)

  if (exists) {
    const error = new Error(`Persona ${enriched.name} already exists`)
    error.type = 'CONFLICT'

    throw error
  }

  await tableClient.createEntity({ ...enriched, version: 1 })
  await tableClient.createEntity({ ...enriched, rowKey: `${enriched.rowKey}:1`, version: 1 })
}

const updatePersona = async (persona) => {
  const enriched = enrichPersona(persona)

  const exists = await checkEntityExists(enriched.partitionKey, enriched.rowKey)

  if (!exists) {
    const error = new Error(`Persona ${enriched.name} does not exist`)
    error.type = 'NOT_FOUND'

    throw error
  }

  const version = parseInt(exists.version) + 1

  await tableClient.updateEntity({ ...enriched, version })
  await tableClient.createEntity({ ...enriched, rowKey: `${enriched.rowKey}:${version}`, version })
}

const getPersonas = async (project, type) => {
  const query = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${project}_${type}'`
    }
  })

  const personas = []

  for await (const entity of query) {
    personas.push(entity)
  }

  const reduced = personas.reduce((acc, prompt) => {
    const formatted = formatPersona(prompt)

    const existingIndex = acc.findIndex(p => p.name === formatted.name)
    const existing = acc[existingIndex]

    if (existingIndex !== -1) {
      if (formatted.version > existing.version) {
        acc[existingIndex] = formatted
      }
    } else {
      acc.push(formatted)
    }

    return acc
  }, [])

  return reduced
}

const getPersona = async (project, type, name, version) => {
  const partitionKey = `${project}_${type}`
  const rowKey = calculateRowKey(name, version)

  try {
    const entity = await tableClient.getEntity(partitionKey, rowKey)

    return formatPersona(entity)
  } catch (error) {
    if (error.statusCode === 404) {
      return null
    }

    throw error
  }
}

module.exports = {
  addPersona,
  updatePersona,
  getPersona,
  getPersonas,
  initialiseTable
}
