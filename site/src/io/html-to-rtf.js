// Convert HTML (inside a container element) to an RTF document string, embedding
// base64 images as hex. Ported verbatim from v1 (scr.js convertHtmlToRtf).
export function convertHtmlToRtf(title, container) {
  let rtfBody = '';

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;
      text = text.replace(/\\/g, '\\\\');
      text = text.replace(/\{/g, '\\{');
      text = text.replace(/\}/g, '\\}');
      let rtfText = '';
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code > 127) rtfText += '\\u' + code + '?';
        else rtfText += text[i];
      }
      return rtfText;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      let result = '';
      const children = () => {
        let r = '';
        for (const child of node.childNodes) r += processNode(child);
        return r;
      };

      switch (tag) {
        case 'h1':
          result += '\\pard\\sb200\\sa100{\\b\\fs48 ' + children() + '}\\par\n';
          break;
        case 'h2':
          result += '\\pard\\sb150\\sa80{\\b\\fs36 ' + children() + '}\\par\n';
          break;
        case 'h3':
          result += '\\pard\\sb100\\sa60{\\b\\fs28 ' + children() + '}\\par\n';
          break;
        case 'p':
        case 'div':
          result += '\\pard\\sa100 ' + children() + '\\par\n';
          break;
        case 'br':
          result += '\\line\n';
          break;
        case 'b':
        case 'strong':
          result += '{\\b ' + children() + '}';
          break;
        case 'i':
        case 'em':
          result += '{\\i ' + children() + '}';
          break;
        case 'u':
          result += '{\\ul ' + children() + '}';
          break;
        case 'strike':
        case 's':
          result += '{\\strike ' + children() + '}';
          break;
        case 'ul':
        case 'ol':
          result += children();
          break;
        case 'li':
          result += '\\pard\\li720\\sa60 \\bullet  ' + children() + '\\par\n';
          break;
        case 'a':
          result += children();
          break;
        case 'img': {
          const src = node.getAttribute('src');
          if (src && src.startsWith('data:')) result += convertImageToRtf(node);
          break;
        }
        default:
          result += children();
      }
      return result;
    }
    return '';
  }

  function convertImageToRtf(imgElement) {
    const src = imgElement.getAttribute('src');
    const matches = src.match(/^data:image\/(jpeg|jpg|png|gif);base64,(.+)$/i);
    if (!matches) return '';

    const imageType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const binaryString = atob(base64Data);
    let hexString = '';
    for (let i = 0; i < binaryString.length; i++) {
      hexString += binaryString.charCodeAt(i).toString(16).padStart(2, '0');
    }

    let width = imgElement.width || imgElement.naturalWidth || 400;
    let height = imgElement.height || imgElement.naturalHeight || 300;
    const maxWidth = 400;
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }
    const widthTwips = width * 15;
    const heightTwips = height * 15;
    const picType = imageType === 'png' ? 'pngblip' : 'jpegblip';

    let formattedHex = '';
    for (let i = 0; i < hexString.length; i += 128) {
      formattedHex += hexString.substr(i, 128) + '\n';
    }
    return `\\pard\\sa100{\\pict\\${picType}\\picwgoal${widthTwips}\\pichgoal${heightTwips}\n${formattedHex}}\\par\n`;
  }

  for (const child of container.childNodes) rtfBody += processNode(child);

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033
{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}{\\f1\\fswiss\\fcharset0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;}
\\viewkind4\\uc1\\pard\\f0\\fs24
\\pard\\sb200\\sa200{\\b\\fs56 ${title.replace(/[\\{}]/g, '\\$&')}}\\par
${rtfBody}
}`;
}
