const Joi = require('joi')
const { getPersona, getPersonas, addPersona, updatePersona } = require('../storage/repos/persona')

module.exports = [{
  method: 'GET',
  path: '/personas/{project}/{type}',
  handler: async (request, h) => {
    const { project, type } = request.params

    const personas = await getPersonas(project, type)

    if (personas.length === 0) {
      return h.response().code(204)
    }

    return h.response(personas).code(200)
  }
}, {
  method: 'GET',
  path: '/personas/{project}/{type}/{name}',
  options: {
    validate: {
      query: Joi.object({
        version: Joi.number()
      })
    }
  },
  handler: async (request, h) => {
    const { project, type, name } = request.params
    const { version } = request.query

    const personas = await getPersona(project, type, name, version)

    return h.response(personas).code(200)
  }
}, {
  method: 'POST',
  path: '/personas',
  options: {
    validate: {
      payload: Joi.object({
        project: Joi.string().required(),
        type: Joi.string().required().allow('correspondence', 'briefing'),
        name: Joi.string().required(),
        persona: Joi.string().required()
      }).required()
    }
  },
  handler: async (request, h) => {
    try {
      await addPersona(request.payload)
    } catch (error) {
      if (error.type === 'CONFLICT') {
        return h.response().code(409)
      }

      throw error
    }

    return h.response().code(201)
  }
}, {
  method: 'PUT',
  path: '/personas/{project}/{type}/{name}',
  options: {
    validate: {
      payload: Joi.object({
        persona: Joi.string().required()
      }).required()
    }
  },
  handler: async (request, h) => {
    const { project, type, name } = request.params

    const persona = {
      project,
      type,
      name,
      ...request.payload
    }

    try {
      await updatePersona(persona)
    } catch (error) {
      if (error.type === 'NOT_FOUND') {
        return h.response().code(404)
      }

      throw error
    }

    return h.response().code(200)
  }
}]
