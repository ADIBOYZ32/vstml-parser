/**
 * VSTML Serializer
 * Converts a VSTML AST back into formatted VSTML text
 * Useful for AI that generates AST objects and needs to output .vstml files
 */

function serializeNode(node, indent = 0) {
  const pad = '  '.repeat(indent)

  if (node.nodeType === 'text') {
    return `${pad}${node.value}`
  }

  if (node.nodeType === 'element') {
    const attrs = Object.entries(node.attributes || {})
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')

    const attrStr = attrs ? ` ${attrs}` : ''
    const openTag = `${pad}[${node.tag}${attrStr}]`

    if (!node.children || node.children.length === 0) {
      return openTag
    }

    // Check if all children are text nodes (inline)
    const allText = node.children.every(c => c.nodeType === 'text')
    if (allText) {
      const text = node.children.map(c => c.value).join(' ')
      return `${openTag}${text}[/${node.tag}]`
    }

    // Block children
    const childLines = node.children
      .map(child => serializeNode(child, indent + 1))
      .join('\n')

    return `${openTag}\n${childLines}\n${pad}[/${node.tag}]`
  }

  if (node.nodeType === 'document') {
    return node.children
      .map(child => serializeNode(child, indent))
      .join('\n')
  }

  return ''
}

function serialize(ast) {
  return serializeNode(ast)
}

module.exports = { serialize }
