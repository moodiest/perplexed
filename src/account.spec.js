import test from 'ava'
import nock from 'nock'

import Account from './account'

const PLEX_API = 'https://plex.tv'
const AUTH_TOKEN = 'AUTH_TOKEN'
const CLIENT_HEADERS = {
  CLIENT_HEADERS: true
}

test.beforeEach((t) => {
  t.context.client = {
    headers: () => CLIENT_HEADERS
  }
  t.context.account = new Account(t.context.client, AUTH_TOKEN)
})

test('constructor without auth token', (t) => {
  const account = new Account(t.context.client)
  t.is(account.client, t.context.client)
  t.is(account.authToken, undefined)
})

test('constructor with auth token', (t) => {
  const { account } = t.context
  t.is(account.client, t.context.client)
  t.is(account.authToken, AUTH_TOKEN)
})

test('headers', (t) => {
  const { account } = t.context
  t.deepEqual(account.headers(), {
    ...CLIENT_HEADERS,
    'X-Plex-Token': AUTH_TOKEN
  })
})

test('fetch', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API, { reqheaders: { accept: 'application/json' } })
    .get('/path')
    .reply(200, {
      key: 'value'
    })

  const res = await account.fetch('/path')

  t.deepEqual(res, { key: 'value' })

  scope.done()
})

test('fetch with params', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API, { reqheaders: { accept: 'application/json' } })
    .get('/path?name=plex')
    .reply(200, {
      key: 'value'
    })

  const res = await account.fetch('/path', {
    params: {
      name: 'plex'
    }
  })

  t.deepEqual(res, { key: 'value' })

  scope.done()
})

test('fetchXML', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .get('/path')
    .reply(200, '<container size="20"><name>Plex</name></container>')

  const res = await account.fetchXML('/path')

  t.deepEqual(res, {
    container: {
      $: { size: '20' },
      name: ['Plex']
    }
  })

  scope.done()
})

test('fetchXML with params', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .get('/path?name=plex')
    .reply(200, '<container size="20"><name>Plex</name></container>')

  const res = await account.fetchXML('/path', {
    params: {
      name: 'plex'
    }
  })

  t.deepEqual(res, {
    container: {
      $: { size: '20' },
      name: ['Plex']
    }
  })

  scope.done()
})

test('authenticate failure', async (t) => {
  const account = new Account(t.context.client)

  const username = 'username'
  const password = 'password'

  const scope = nock(PLEX_API)
    .post('/users/sign_in.json')
    .reply(401, {
      error: 'Invalid email, username, or password.'
    })

  t.plan(1)

  try {
    await account.authenticate(username, password)
  } catch (error) {
    t.deepEqual(error.response, {
      error: 'Invalid email, username, or password.'
    })
  }

  scope.done()
})

test('authenticate', async (t) => {
  const account = new Account(t.context.client)

  const username = 'username'
  const password = 'password'

  const scope = nock(PLEX_API)
    .post('/users/sign_in.json')
    .reply(200, {
      user: {
        authToken: AUTH_TOKEN
      }
    })

  const user = await account.authenticate(username, password)

  t.truthy(user)
  t.is(account.authToken, AUTH_TOKEN)

  scope.done()
})

test('info', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .get('/api/v2/user')
    .reply(200, {
      username: 'stayradiated'
    })

  const user = await account.info()

  t.is(user.username, 'stayradiated')

  scope.done()
})

test('resources', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .get('/api/resources?includeHttps=1&includeRelay=1')
    .reply(200, '<MediaContainer size="0"></MediaContainer>')

  const resources = await account.resources()

  t.is(resources.devices.length, 0)

  scope.done()
})

test('servers', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .get('/api/resources?includeHttps=1&includeRelay=1')
    .reply(200, `<MediaContainer size="0">
      <Device clientIdentifier="1" provides="server" />
      <Device clientIdentifier="2" provides="client" />
      <Device clientIdentifier="3" provides="client,server" />
    </MediaContainer>`)

  const servers = await account.servers()

  t.is(servers.devices.length, 2)
  t.is(servers.devices[0].clientIdentifier, '1')
  t.is(servers.devices[1].clientIdentifier, '3')

  scope.done()
})

test('devices', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .get('/devices.json')
    .reply(200, {})

  const devices = await account.devices()

  t.truthy(devices)

  scope.done()
})

test('removeDevice', async (t) => {
  const { account } = t.context

  const scope = nock(PLEX_API)
    .delete('/devices/123.json')
    .reply(200, {})

  await account.removeDevice(123)

  t.pass()

  scope.done()
})
