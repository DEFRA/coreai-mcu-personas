const {
  getDocuments,
  getDocument,
  getDocumentMetadata,
  saveDocument,
  updateDocumentMetadata
} = require('../../../../app/storage/documents-repo')
const { processPayloadDocument } = require('../../../../app/lib/document')
const createServer = require('../../../../app/server')
const { v4: uuidv4 } = require('uuid')

jest.mock('../../../../app/storage/documents-repo', () => ({
  getDocuments: jest.fn(),
  getDocument: jest.fn(),
  getDocumentMetadata: jest.fn(),
  updateDocumentMetadata: jest.fn(),
  saveDocument: jest.fn()
}))

jest.mock('../../../../app/lib/document', () => ({
  processPayloadDocument: jest.fn()
}))

describe('/documents', () => {
  let server
  let documents

  beforeEach(async () => {
    server = await createServer()
    await server.initialize()
    documents = [
      {
        name: '142714da-8485-4a52-a832-931d4e71f1b1',
        properties: {
          createdOn: 'created on date',
          lastModified: 'last modified date',
          etag: '0x220243B5724CCE0',
          contentLength: 36630524,
          contentType: 'application/pdf',
          contentMD5: {
            type: 'Buffer',
            data: []
          },
          blobType: 'BlockBlob',
          leaseStatus: 'unlocked',
          leaseState: 'available',
          serverEncrypted: true,
          accessTier: 'Hot',
          accessTierInferred: true,
          accessTierChangedOn: 'changed on date'
        }
      },
      {
        name: '142714da-8485-4a52-a832-931d4e71f1b7',
        properties: {
          createdOn: 'created on date',
          lastModified: 'last modified date',
          etag: '0x220243B5724CCE0',
          contentLength: 36630524,
          contentType: 'application/pdf',
          contentMD5: {
            type: 'Buffer',
            data: []
          },
          blobType: 'BlockBlob',
          leaseStatus: 'unlocked',
          leaseState: 'available',
          serverEncrypted: true,
          accessTier: 'Hot',
          accessTierInferred: true,
          accessTierChangedOn: 'changed on date'
        }
      }
    ]
  })

  afterEach(async () => {
    await server.stop()
    jest.clearAllMocks()
  })

  describe('GET /documents', () => {
    test('GET /documents route returns 201', async () => {
      getDocuments.mockResolvedValue(documents)

      const options = {
        method: 'GET',
        url: '/documents'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(201)
      expect(response.result).toEqual(documents)
    })
  })

  describe('GET /documents/{id}', () => {
    let id

    beforeEach(async () => {
      id = uuidv4()
    })

    test('GET /documents/{id} route returns a document buffer with a 201 status', async () => {
      const documentBuffer = Buffer.from('DOCUMENT_CONTENTS')
      getDocument.mockResolvedValue(documentBuffer)

      const options = {
        method: 'GET',
        url: `/documents/${id}`
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(201)
      expect(response.result).toEqual(documentBuffer.toString())
    })
  })

  describe('GET /documents/{id}/metadata', () => {
    let id
    let properties = {}

    beforeEach(async () => {
      id = uuidv4()
      properties = {
        metadata: {
          documenttype: 'doc type',
          filename: 'a filename updated',
          source: 'source of file',
          sourceaddress: 'source address...',
          suggestedcategory: 'suggestted category',
          targetminister: 'the target minister',
          uploadedby: 'file UploadedBy',
          usercategory: 'user category'
        },
        contentType: 'application/pdf'
      }
    })

    test('GET /documents/{id}/metadata route returns an object containing metadata and contentType with a 201 status', async () => {
      getDocumentMetadata.mockResolvedValue(properties)

      const options = {
        method: 'GET',
        url: `/documents/${id}/metadata`
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(201)
      expect(response.result).toEqual(properties)
    })
  })

  describe('POST /documents', () => {
    test('responds with 201 and saves document when a valid PDF is provided', async () => {
      const validPDFBuffer = Buffer.from('PDF CONTENTS')
      const expectedId = uuidv4()

      processPayloadDocument.mockResolvedValue(validPDFBuffer)
      saveDocument.mockResolvedValue(expectedId)

      const response = await server.inject({
        method: 'POST',
        url: '/documents',
        payload: validPDFBuffer,
        headers: {
          'content-type': 'application/pdf'
        }
      })

      expect(response.statusCode).toBe(201)
      expect(response.result).toEqual({ id: expectedId })
      expect(saveDocument).toHaveBeenCalledWith(validPDFBuffer, 'application/pdf')
    })

    test('responds with 415 - Unsupported Media Type when an invalid file type is provided', async () => {
      processPayloadDocument.mockResolvedValue()
      saveDocument.mockResolvedValue()

      const response = await server.inject({
        method: 'POST',
        url: '/documents',
        payload: {},
        headers: {
          'content-type': 'image/x-png'
        }
      })

      expect(response.statusCode).toBe(415)
    })
  })

  describe('PUT /documents/{id}', () => {
    let id

    beforeEach(async () => {
      id = uuidv4()
    })

    test('responds with 200 on successful update', async () => {
      updateDocumentMetadata.mockResolvedValue(200)

      const response = await server.inject({
        method: 'PUT',
        url: `/documents/${id}`,
        payload: {
          fileName: 'TestFile.pdf',
          uploadedBy: 'TestUser',
          documentType: 'Report',
          source: 'Email',
          sourceAddress: 'test@example.com',
          suggestedCategory: 'Finance',
          userCategory: 'Internal',
          targetMinister: 'Some Minister'
        }
      })

      expect(response.statusCode).toBe(200)
    })

    test('responds with 404 when document not found', async () => {
      updateDocumentMetadata.mockRejectedValue(Object.assign(new Error('Not Found'), { code: 'NotFound' }))

      const response = await server.inject({
        method: 'PUT',
        url: '/documents/invalid-id',
        payload: {
          fileName: 'TestFile.pdf',
          uploadedBy: 'TestUser',
          documentType: 'Report',
          source: 'Email',
          sourceAddress: 'test@example.com',
          suggestedCategory: 'Finance',
          userCategory: 'Internal',
          targetMinister: 'Some Minister'
        }
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
