// Convert an HTML string to plain text (block elements become line breaks).
export function convertToPlainText(html) {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;

  const blockElements = [
    'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR',
  ];

  const processNode = (node) => {
    let result = '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (blockElements.includes(node.nodeName)) result += '\n';
      for (const child of node.childNodes) result += processNode(child);
      if (blockElements.includes(node.nodeName) && node.nodeName !== 'BR')
        result += '\n';
    }
    return result;
  };

  return processNode(tempElement).replace(/\n{3,}/g, '\n\n');
}
