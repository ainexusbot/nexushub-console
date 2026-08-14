import { getApiBase } from './api'

class PostsAPI {
  constructor(endpoint = '/posts', token = null) {
    this.endpoint = endpoint
    this.token = token || localStorage.getItem('reddit_token')
    this.apiBase = getApiBase()
  }

  async request(path, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(`${this.apiBase}${this.endpoint}${path}`, config)
    return response
  }

  async createDraft(data) {
    try {
      const response = await this.request('/draft', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to create draft' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async submit(postId) {
    try {
      const response = await this.request(`/${postId}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to submit' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async confirm(postId, confirmationToken) {
    try {
      const response = await this.request(`/${postId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ confirmation_token: confirmationToken }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to confirm' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /posts/status/:jobId?since=<seq>&since_nav=<seq>
  // Publishing (submit/confirm) now runs as a background job. Poll this for the
  // streaming console output. Returns the shared job shape:
  // { status, logs, navigations, next_since, next_since_nav, done, result, error }
  async jobStatus(jobId, since = 0, sinceNav = 0) {
    try {
      const response = await this.request(
        `/status/${jobId}?since=${since}&since_nav=${sinceNav}`,
        { method: 'GET' },
      )
      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch job status',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async list(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString()
      const path = params ? `?${params}` : ''
      const response = await this.request(path, { method: 'GET' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to fetch posts' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async getDetail(postId) {
    try {
      const response = await this.request(`/${postId}`, { method: 'GET' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to fetch post' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async delete(postId) {
    try {
      const response = await this.request(`/${postId}`, { method: 'DELETE' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to delete post' }
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async cancel(postId) {
    try {
      const response = await this.request(`/${postId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to cancel' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Fetch the live "submitted" feed for an account directly from Reddit.
  // GET /reddit/submitted/:accountId?username=SomeUser (username optional)
  async getSubmitted(accountId, username) {
    try {
      const token = localStorage.getItem('reddit_token')
      const params = username ? `?username=${encodeURIComponent(username)}` : ''
      const response = await fetch(
        `${this.apiBase}/reddit/submitted/${accountId}${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      )

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch submitted posts',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Approve a pending live Reddit post via the backend browser session.
  // POST /reddit/approve-post  body: { account_id, post_url }
  async approveRedditPost(accountId, postUrl) {
    try {
      const token = localStorage.getItem('reddit_token')
      const response = await fetch(`${this.apiBase}/reddit/approve-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ account_id: accountId, post_url: postUrl }),
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to approve post',
          status: response.status,
          data: result,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Edit the body text of a live Reddit text post via the backend browser session.
  // POST /reddit/edit-post  body: { account_id, post_url, content }
  async editRedditPost(accountId, postUrl, content) {
    try {
      const token = localStorage.getItem('reddit_token')
      const response = await fetch(`${this.apiBase}/reddit/edit-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ account_id: accountId, post_url: postUrl, content }),
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to edit post',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Fetch the communities (subscriptions) for an account directly from Reddit.
  // GET /reddit/communities/:accountId
  async getCommunities(accountId) {
    try {
      const token = localStorage.getItem('reddit_token')
      const response = await fetch(
        `${this.apiBase}/reddit/communities/${accountId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      )

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch communities',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Fetch the live comments feed for an account directly from Reddit.
  // GET /reddit/user-comments/:accountId?username=SomeUser (username optional)
  async getUserComments(accountId, username) {
    try {
      const token = localStorage.getItem('reddit_token')
      const params = username ? `?username=${encodeURIComponent(username)}` : ''
      const response = await fetch(
        `${this.apiBase}/reddit/user-comments/${accountId}${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      )

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch comments',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Edit the body of a live Reddit comment via the backend browser session.
  // POST /reddit/edit-comment  body: { account_id, comment_url, content, comment_id? }
  async editRedditComment(accountId, commentUrl, content, commentId) {
    try {
      const token = localStorage.getItem('reddit_token')
      const body = { account_id: accountId, comment_url: commentUrl, content }
      if (commentId) body.comment_id = commentId
      const response = await fetch(`${this.apiBase}/reddit/edit-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to edit comment',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Delete a live Reddit comment via the backend browser session.
  // POST /reddit/delete-comment  body: { account_id, comment_url, comment_id? }
  async deleteRedditComment(accountId, commentUrl, commentId) {
    try {
      const token = localStorage.getItem('reddit_token')
      const body = { account_id: accountId, comment_url: commentUrl }
      if (commentId) body.comment_id = commentId
      const response = await fetch(`${this.apiBase}/reddit/delete-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to delete comment',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Delete a live Reddit post via the backend browser session.
  // POST /reddit/delete-post  body: { account_id, post_url }
  async deleteRedditPost(accountId, postUrl) {
    try {
      const token = localStorage.getItem('reddit_token')
      const response = await fetch(`${this.apiBase}/reddit/delete-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ account_id: accountId, post_url: postUrl }),
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to delete post',
          status: response.status,
        }
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

class AccountPostsAPI {
  constructor(token = null) {
    this.endpoint = '/account-posts'
    this.token = token || localStorage.getItem('reddit_token')
    this.apiBase = getApiBase()
  }

  async request(path, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(`${this.apiBase}${this.endpoint}${path}`, config)
    return response
  }

  // Get all Reddit accounts with post counts.
  // Supports filters/sorting/pagination:
  // { tag, status, active, search, sort_by, sort_order, page, limit }
  async getAccounts(filters = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value))
        }
      })
      const path = params.toString() ? `/accounts?${params.toString()}` : '/accounts'
      const response = await this.request(path, { method: 'GET' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to fetch accounts' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Get posts with optional account filter
  async list(filters = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value))
        }
      })
      const path = params.toString() ? `?${params.toString()}` : ''
      const response = await this.request(path, { method: 'GET' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to fetch posts' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Get posts for specific Reddit account
  async getByAccountId(accountId, filters = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value))
        }
      })
      const path = params.toString() ? `/${accountId}?${params.toString()}` : `/${accountId}`
      const response = await this.request(path, { method: 'GET' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to fetch account posts' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Get stats for specific Reddit account
  async getAccountStats(accountId) {
    try {
      const response = await this.request(`/${accountId}/stats`, { method: 'GET' })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || 'Failed to fetch stats' }
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

class CommentsAPI {
  constructor(token = null) {
    this.endpoint = '/comments'
    this.token = token || localStorage.getItem('reddit_token')
    this.apiBase = getApiBase()
  }

  async request(path, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(`${this.apiBase}${this.endpoint}${path}`, config)
    return response
  }

  async handle(response, fallback) {
    if (!response.ok) {
      let error
      try {
        error = await response.json()
      } catch {
        error = {}
      }
      return { success: false, error: error.detail || fallback }
    }
    try {
      const result = await response.json()
      return { success: true, data: result }
    } catch {
      return { success: true, data: null }
    }
  }

  // Publish a comment in a single request.
  // POST /comments  body: { account_id, post_url, content, parent_comment_id? }
  // subreddit is auto-detected from post_url by the backend.
  async publish(data) {
    try {
      const response = await this.request('', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return this.handle(response, 'Failed to publish comment')
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /comments/status/:jobId?since=<seq>
  // Publishing a comment now runs as a background job. Poll this for the
  // streaming console output. Returns the shared job shape:
  // { status, logs: [{ seq, level, message, ts }], next_since, done, result, error }
  async jobStatus(jobId, since = 0) {
    try {
      const response = await this.request(`/status/${jobId}?since=${since}`, {
        method: 'GET',
      })
      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch job status',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async list(filters = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value))
        }
      })
      const path = params.toString() ? `?${params.toString()}` : ''
      const response = await this.request(path, { method: 'GET' })
      return this.handle(response, 'Failed to fetch comments')
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async getDetail(commentId) {
    try {
      const response = await this.request(`/${commentId}`, { method: 'GET' })
      return this.handle(response, 'Failed to fetch comment')
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async delete(commentId) {
    try {
      const response = await this.request(`/${commentId}`, { method: 'DELETE' })
      if (!response.ok) {
        let error
        try {
          error = await response.json()
        } catch {
          error = {}
        }
        return { success: false, error: error.detail || 'Failed to delete comment' }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

// Feed Browse — behavioral simulation. Starts a background job on the server
// that scrolls an account's feed, opens posts, dwells, and upvotes, streaming
// logs back via a pollable job.
class FeedAPI {
  constructor(token = null) {
    this.endpoint = '/reddit/feed'
    this.token = token || localStorage.getItem('reddit_token')
    this.apiBase = getApiBase()
  }

  async request(path, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }
    const response = await fetch(`${this.apiBase}${this.endpoint}${path}`, config)
    let result = null
    try {
      result = await response.json()
    } catch {
      result = null
    }
    return { response, result }
  }

  // POST /reddit/feed/start -> { job_id }
  async start(config) {
    try {
      const { response, result } = await this.request('/start', {
        method: 'POST',
        body: JSON.stringify(config),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start feed browse',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /reddit/feed/status/:jobId?since=<n>&since_nav=<n>
  // Returns { logs, navigations, next_since, next_since_nav, done, status, result, error }
  async status(jobId, since = 0, sinceNav = 0) {
    try {
      const { response, result } = await this.request(
        `/status/${jobId}?since=${since}&since_nav=${sinceNav}`,
        { method: 'GET' },
      )
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch status',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /reddit/feed/stop  body: { account_id, force? }
  async stop(accountId, force = false) {
    try {
      const { response, result } = await this.request('/stop', {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId, force }),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to stop feed browse',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /reddit/feed/stop-all  body: { force? }  (force defaults to true)
  // Super stop: halts everything, even sessions running under the hood.
  async stopAll(force = true) {
    try {
      const { response, result } = await this.request('/stop-all', {
        method: 'POST',
        body: JSON.stringify({ force }),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to stop all sessions',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /reddit/feed/active -> { sessions: [...] } currently running
  async active() {
    try {
      const { response, result } = await this.request('/active', {
        method: 'GET',
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch active sessions',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

// Comment Replies — scan an existing post for its comments (async job, same
// job/poll/stop + log-stream mechanism as Feed Browse), then reply to a
// specific comment by its t1_xxxx id.
class CommentRepliesAPI {
  constructor(token = null) {
    this.endpoint = '/comment-replies'
    this.token = token || localStorage.getItem('reddit_token')
    this.apiBase = getApiBase()
  }

  async request(path, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }
    const response = await fetch(`${this.apiBase}${this.endpoint}${path}`, config)
    let result = null
    try {
      result = await response.json()
    } catch {
      result = null
    }
    return { response, result }
  }

  // POST /comment-replies/scan  body: { account_id, post_url, max_comments?, force? }
  // -> { job_id, status }
  // On a 409 ("already scanning") the response includes can_force: true.
  async startScan({ account_id, post_url, max_comments, force = false }) {
    try {
      const body = { account_id, post_url }
      if (max_comments) body.max_comments = max_comments
      if (force) body.force = true
      const { response, result } = await this.request('/scan', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start comment scan',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /comment-replies/scan/:jobId?since=<n>
  async scanStatus(jobId, since = 0) {
    try {
      const { response, result } = await this.request(
        `/scan/${jobId}?since=${since}`,
        { method: 'GET' },
      )
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch scan status',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /comment-replies/scan/stop  body: { account_id, force? }
  // force: true force-closes the browser/context and clears a wedged session.
  async stopScan(accountId, force = false) {
    try {
      const { response, result } = await this.request('/scan/stop', {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId, force }),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to stop comment scan',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /comment-replies/scan/stop-all  body: { force? }  (force defaults to true)
  // Super stop / panic button: force-closes every active scan at once.
  async stopAllScans(force = true) {
    try {
      const { response, result } = await this.request('/scan/stop-all', {
        method: 'POST',
        body: JSON.stringify({ force }),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to stop all scans',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /comment-replies/scan/active -> { sessions: [...] } currently running
  async listActiveScans() {
    try {
      const { response, result } = await this.request('/scan/active', {
        method: 'GET',
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch active scans',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // DELETE /comment-replies/:reply_id  (soft-delete a reply from history)
  async deleteReply(replyId) {
    try {
      const { response, result } = await this.request(`/${replyId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to delete reply',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /comment-replies/reply
  // body: { account_id, post_url, parent_comment_id, content }
  async reply(data) {
    try {
      const { response, result } = await this.request('/reply', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to publish reply',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /comment-replies?status=&account_id=&post_url=&page=&limit=&sort_order=
  // -> { total, page, limit, total_pages, replies: [...] }
  async list(filters = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value))
        }
      })
      const path = params.toString() ? `?${params.toString()}` : ''
      const { response, result } = await this.request(path, { method: 'GET' })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch replies',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

// Account Settings — read (scan) and edit (update) an account's Reddit profile
// settings. Same async job/poll/stop mechanism as Feed Browse and Comment
// Replies: start → get job_id → poll status (streaming logs + navigations).
class AccountSettingsAPI {
  constructor(token = null) {
    this.endpoint = '/account-settings'
    this.token = token || localStorage.getItem('reddit_token')
    this.apiBase = getApiBase()
  }

  async request(path, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }
    const response = await fetch(`${this.apiBase}${this.endpoint}${path}`, config)
    let result = null
    try {
      result = await response.json()
    } catch {
      result = null
    }
    return { response, result }
  }

  // POST /account-settings/scan  body: { account_id, force? }  -> { job_id, status }
  // On a 409 ("already running") the response includes can_force: true.
  async startScan({ account_id, force = false }) {
    try {
      const body = { account_id }
      if (force) body.force = true
      const { response, result } = await this.request('/scan', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start settings scan',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/update  body: { account_id, display_name?, description? }
  // -> { job_id, status }
  async startUpdate({ account_id, display_name, description }) {
    try {
      const body = { account_id }
      if (display_name !== undefined) body.display_name = display_name
      if (description !== undefined) body.description = description
      const { response, result } = await this.request('/update', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start settings update',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/avatars  body: { account_id, force? }  -> { job_id, status }
  // Lists the built-in Reddit avatar catalog (Outfits tab) via a pollable job.
  async startAvatarScan({ account_id, force = false }) {
    try {
      const body = { account_id }
      if (force) body.force = true
      const { response, result } = await this.request('/avatars', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start avatar scan',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/avatar  body: { account_id, outfit_name, category? }
  // -> { job_id, status }
  async startAvatarUpdate({ account_id, outfit_name, category }) {
    try {
      const body = { account_id, outfit_name }
      if (category !== undefined && category !== null && category !== '') {
        body.category = category
      }
      const { response, result } = await this.request('/avatar', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start avatar update',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/banner  multipart/form-data: { banner (File), account_id, force? }
  // -> { job_id, status }. On a 409 ("already running") the response includes can_force: true.
  // NOTE: do NOT set Content-Type manually — the browser sets the multipart boundary.
  async startBanner({ account_id, file, force = false }) {
    try {
      const fd = new FormData()
      fd.append('banner', file)
      fd.append('account_id', account_id)
      if (force) fd.append('force', 'true')

      const response = await fetch(`${this.apiBase}${this.endpoint}/banner`, {
        method: 'POST',
        headers: {
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: fd,
      })
      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start banner update',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/password
  // body: { account_id, current_password, new_password, force? } -> { job_id, status }
  // On a 409 ("already running") the response includes can_force: true.
  async startPasswordChange({
    account_id,
    current_password,
    new_password,
    stay_logged_in,
    force = false,
  }) {
    try {
      const body = { account_id, current_password, new_password }
      if (typeof stay_logged_in === 'boolean') body.stay_logged_in = stay_logged_in
      if (force) body.force = true
      const { response, result } = await this.request('/password', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to start password change',
          status: response.status,
          canForce: !!(result && result.can_force),
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /account-settings/:kind/:jobId?since=<n>&since_nav=<n>
  // (kind: scan | update | avatars | avatar | password)
  // Returns { status, logs, navigations, next_since, next_since_nav, done, result, error }
  async jobStatus(kind, jobId, since = 0, sinceNav = 0) {
    try {
      const { response, result } = await this.request(
        `/${kind}/${jobId}?since=${since}&since_nav=${sinceNav}`,
        { method: 'GET' },
      )
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch job status',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/stop  body: { account_id, force? }
  async stop(accountId, force = false) {
    try {
      const { response, result } = await this.request('/stop', {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId, force }),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to stop settings job',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // POST /account-settings/stop-all  body: { force? }  (force defaults to true)
  async stopAll(force = true) {
    try {
      const { response, result } = await this.request('/stop-all', {
        method: 'POST',
        body: JSON.stringify({ force }),
      })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to stop all settings jobs',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // GET /account-settings/active -> { count, sessions: [...] }
  async active() {
    try {
      const { response, result } = await this.request('/active', { method: 'GET' })
      if (!response.ok) {
        return {
          success: false,
          error: (result && result.detail) || 'Failed to fetch active sessions',
          status: response.status,
        }
      }
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

export default PostsAPI
export { AccountPostsAPI, CommentsAPI, FeedAPI, CommentRepliesAPI, AccountSettingsAPI }
