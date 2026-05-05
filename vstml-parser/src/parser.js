/**
 * VSTML Parser
 * Converts a flat token list into a structured AST (Abstract Syntax Tree)
 */

const { Lexer, TOKEN_TYPES } = require('./lexer')

// Set of tags that are always self-closing (never have children)
const SELF_CLOSING_TAGS = new Set([
  'cut', 'trim', 'delete', 'split', 'merge', 'speed', 'reverse', 'reorder',
  'clip', 'audio', 'image', 'marker', 'silence', 'filler', 'audiospike',
  'voiceover', 'subtitle', 'transition', 'effect', 'overlay', 'broll', 'pip',
  'correction', 'approved', 'maxpass',
])

class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  peek() {
    return this.tokens[this.pos] || { type: TOKEN_TYPES.EOF, value: null }
  }

  consume() {
    return this.tokens[this.pos++] || { type: TOKEN_TYPES.EOF, value: null }
  }

  // Collect attributes from the token stream until TAG_END
  collectAttributes() {
    const attrs = {}
    while (
      this.peek().type !== TOKEN_TYPES.TAG_END &&
      this.peek().type !== TOKEN_TYPES.EOF
    ) {
      if (this.peek().type === TOKEN_TYPES.ATTR_KEY) {
        const key = this.consume().value
        if (this.peek().type === TOKEN_TYPES.ATTR_VALUE) {
          attrs[key] = this.consume().value
        }
      } else {
        this.consume()
      }
    }
    if (this.peek().type === TOKEN_TYPES.TAG_END) {
      this.consume() // consume ]
    }
    return attrs
  }

  // Parse a single node (tag or text)
  parseNode() {
    const token = this.peek()

    if (token.type === TOKEN_TYPES.EOF) return null

    // Closing tag — signal to parent to stop
    if (token.type === TOKEN_TYPES.TAG_CLOSE_START) return null

    // Text node
    if (token.type === TOKEN_TYPES.TEXT) {
      this.consume()
      return { nodeType: 'text', value: token.value }
    }

    // Opening tag
    if (token.type === TOKEN_TYPES.TAG_OPEN_START) {
      this.consume() // consume tag name token
      const tagName = token.value
      const attributes = this.collectAttributes()

      const node = {
        nodeType: 'element',
        tag: tagName,
        attributes,
        children: [],
      }

      // Self-closing tags never consume children
      if (SELF_CLOSING_TAGS.has(tagName)) {
        return node
      }

      // Parse children until we hit the matching closing tag
      while (this.pos < this.tokens.length) {
        const next = this.peek()

        if (next.type === TOKEN_TYPES.EOF) break

        // Check for matching closing tag
        if (
          next.type === TOKEN_TYPES.TAG_CLOSE_START &&
          next.value === tagName
        ) {
          this.consume() // consume closing tag name
          // consume TAG_END for closing tag
          if (this.peek().type === TOKEN_TYPES.TAG_END) this.consume()
          break
        }

        // Non-matching closing tag means we're done with this node's children
        if (next.type === TOKEN_TYPES.TAG_CLOSE_START) break

        // Skip stray TAG_END tokens inside children
        if (next.type === TOKEN_TYPES.TAG_END) {
          this.consume()
          continue
        }

        const child = this.parseNode()
        if (child) node.children.push(child)
        else break
      }

      return node
    }

    // Skip unknown tokens
    this.consume()
    return null
  }

  // Parse the full document
  parse() {
    const root = {
      nodeType: 'document',
      children: [],
    }

    while (this.peek().type !== TOKEN_TYPES.EOF) {
      // Skip stray TAG_END tokens at document level
      if (this.peek().type === TOKEN_TYPES.TAG_END) {
        this.consume()
        continue
      }
      const node = this.parseNode()
      if (node) root.children.push(node)
      else if (this.peek().type !== TOKEN_TYPES.EOF) {
        // Consume to avoid infinite loop on unrecognized tokens
        this.consume()
      }
    }

    return root
  }
}

module.exports = { Parser }
