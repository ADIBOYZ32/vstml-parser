# vstml-parser

> Official parser for **VSTML** — Video Speech Text Markup Language

VSTML is an open markup language for AI-powered video editing. It gives AI a structured language to read, write, and edit video using timestamps from Whisper STT and metadata from FFmpeg — without requiring any vision model or ML training.

```
npm install vstml-parser
```

---

## What is VSTML?

VSTML is to video editing what HTML is to web pages. It describes a video's structure, speech, and edit operations in a format that both humans and AI can read and write.

```
[vstml version="0.1" mode="edit"]
  [timeline duration="45s" fps="30"]
    [scene id="s1" start="0s" end="14s"]
      [clip id="c1" src="intro.mp4"]
      [delete clip="c1" from="3.1s" to="4.9s"]
      [delete clip="c1" from="5.9s" to="6.3s"]
      [caption at="0.8s" duration="7s"]Hey everyone welcome back[/caption]
    [/scene]
    [transition type="crossdissolve" duration="0.5s" between="c1,c2"]
  [/timeline]
[/vstml]
```

---

## Quick Start

```javascript
const {
  parse,
  parseAndValidate,
  stringify,
  query,
  getTranscript,
  getEditOperations
} = require('vstml-parser')

// Parse a VSTML string into an AST
const ast = parse(vstmlString)

// Parse and validate in one step
const { ast, valid, errors, warnings } = parseAndValidate(vstmlString)

// Find all nodes of a specific tag
const scenes = query(ast, 'scene')
const cuts = query(ast, 'cut')
const silences = query(ast, 'silence')

// Extract the full transcript from word-level timestamps
const { text, words } = getTranscript(ast)

// Get all edit operations sorted by timestamp
const ops = getEditOperations(ast)

// Convert AST back to VSTML text
const output = stringify(ast)
```

---

## API

### `parse(input)`
Parses a VSTML string and returns an AST.

```javascript
const ast = parse('[cut clip="c1" at="4.2s"]')
// Returns: { nodeType: 'document', children: [...] }
```

### `parseAndValidate(input)`
Parses and validates a VSTML string against the v0.1 spec.

```javascript
const { ast, valid, errors, warnings } = parseAndValidate(input)
if (!valid) {
  console.error(errors)
}
```

### `stringify(ast)`
Converts an AST back into formatted VSTML text.

```javascript
const vstmlText = stringify(ast)
```

### `query(ast, tagName)`
Find all elements matching a tag name anywhere in the document.

```javascript
const words = query(ast, 'word')
const effects = query(ast, 'effect')
```

### `getTranscript(ast)`
Extract the full spoken transcript from `[word]` tags.

```javascript
const { text, words } = getTranscript(ast)
// text: "Hey everyone welcome back"
// words: [{ word: "Hey", timestamp: "0.5s", seconds: 0.5 }, ...]
```

### `getEditOperations(ast)`
Get all edit operations (cut, trim, delete, etc.) sorted by timestamp.

```javascript
const ops = getEditOperations(ast)
// [{ operation: "trim", attributes: {...}, timestamp: "0s", seconds: 0 }, ...]
```

---

## AST Structure

Every node has a `nodeType`:

```javascript
// Element node
{
  nodeType: 'element',
  tag: 'scene',
  attributes: { id: 's1', start: '0s', end: '14s' },
  children: [...]
}

// Text node
{
  nodeType: 'text',
  value: 'Hello World'
}

// Document root
{
  nodeType: 'document',
  children: [...]
}
```

---

## VSTML Modes

VSTML files operate in two modes:

**`analysis`** — output of the Whisper STT + FFmpeg scraper pipeline. Describes what is in a video.

**`edit`** — output of the AI editor. Describes what changes to make.

```
[vstml version="0.1" mode="analysis"]  ← describes the video
[vstml version="0.1" mode="edit"]      ← describes the edits
```

---

## Validation

The validator checks:
- Required attributes per tag
- Timestamp format (must be like `"4.2s"` or `"10s"`)
- Valid mode values (`"analysis"` or `"edit"`)
- Known effect and transition types
- Speed value format (`"1.5x"`)
- maxpass must be a number

```javascript
const { valid, errors, warnings } = parseAndValidate(input)
```

---

## Running Tests

```bash
npm test
```

---

## VSTML Spec

Full tag reference and specification:
👉 [VSTML v0.1 Specification](https://github.com/YOUR_USERNAME/vstml-parser/blob/main/VSTML_SPEC_v0.1.md)

---

## Why VSTML?

| Feature | VSTML | EDL | FCPXML |
|---------|-------|-----|--------|
| AI-readable | ✅ | ❌ | ❌ |
| Human-readable | ✅ | Partial | ❌ |
| Speech timestamps | ✅ | ❌ | ❌ |
| Recursive AI loop | ✅ | ❌ | ❌ |
| App independent | ✅ | Partial | ❌ |
| No ML required | ✅ | ✅ | ✅ |

---

## License

MIT — free to use, implement, and build on.

---

*VSTML is an open specification. Anyone may implement a VSTML parser or editor.*
