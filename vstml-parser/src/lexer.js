/**
 * VSTML Lexer
 * Converts raw VSTML text into a flat list of tokens
 */

const TOKEN_TYPES = {
  TAG_OPEN_START: 'TAG_OPEN_START',       // [tagname
  TAG_CLOSE_START: 'TAG_CLOSE_START',     // [/tagname
  TAG_END: 'TAG_END',                     // ]
  ATTR_KEY: 'ATTR_KEY',                   // key
  ATTR_VALUE: 'ATTR_VALUE',              // "value"
  TEXT: 'TEXT',                           // text content between tags
  EOF: 'EOF',
}

class Lexer {
  constructor(input) {
    this.input = input
    this.pos = 0
    this.tokens = []
  }

  peek() {
    return this.input[this.pos] || null
  }

  consume() {
    return this.input[this.pos++] || null
  }

  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++
    }
  }

  readUntil(chars) {
    let result = ''
    while (this.pos < this.input.length && !chars.includes(this.input[this.pos])) {
      result += this.consume()
    }
    return result
  }

  readString() {
    this.consume() // opening quote
    let result = ''
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      result += this.consume()
    }
    this.consume() // closing quote
    return result
  }

  tokenize() {
    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const ch = this.peek()

      if (ch === '[') {
        this.consume() // [
        const isClosing = this.peek() === '/'
        if (isClosing) this.consume() // /

        const tagName = this.readUntil([' ', ']', '\n', '\r', '\t']).trim()

        if (isClosing) {
          this.tokens.push({ type: TOKEN_TYPES.TAG_CLOSE_START, value: tagName })
        } else {
          this.tokens.push({ type: TOKEN_TYPES.TAG_OPEN_START, value: tagName })
        }

        // Parse attributes inside the tag
        while (this.pos < this.input.length && this.peek() !== ']') {
          this.skipWhitespace()
          if (this.peek() === ']') break

          // Read attribute key
          const key = this.readUntil(['=', ']', ' ']).trim()
          if (!key) { this.consume(); continue }

          if (this.peek() === '=') {
            this.consume() // =
            if (this.peek() === '"') {
              const value = this.readString()
              this.tokens.push({ type: TOKEN_TYPES.ATTR_KEY, value: key })
              this.tokens.push({ type: TOKEN_TYPES.ATTR_VALUE, value: value })
            }
          }
        }

        if (this.peek() === ']') {
          this.consume() // ]
          this.tokens.push({ type: TOKEN_TYPES.TAG_END, value: ']' })
        }

      } else {
        // Text content
        const text = this.readUntil(['[']).trim()
        if (text) {
          this.tokens.push({ type: TOKEN_TYPES.TEXT, value: text })
        }
      }
    }

    this.tokens.push({ type: TOKEN_TYPES.EOF, value: null })
    return this.tokens
  }
}

module.exports = { Lexer, TOKEN_TYPES }
