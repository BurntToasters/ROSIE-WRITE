// Convert HTML (inside a container element) to an RTF document string, embedding
// base64 images as hex. Ported from v1 (scr.js convertHtmlToRtf).

// RTF's \uN control word takes a *signed* 16-bit value, so code units above
// 32767 have to wrap into the negative range or readers mis-decode them.
// Emoji and other astral characters are surrogate pairs, and RTF expects both
// halves emitted individually, which iterating by code unit gives us.
function encodeUnicode(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) {
      out += '\\u' + (code > 32767 ? code - 65536 : code) + '?';
    } else {
      out += text[i];
    }
  }
  return out;
}

function escapeRtfLiteral(text) {
  return text.replace(/[\\{}]/g, '\\$&');
}

export function convertHtmlToRtf(title, container) {
  let rtfBody = '';

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;
      text = text.replace(/\\/g, '\\\\');
      text = text.replace(/\{/g, '\\{');
      text = text.replace(/\}/g, '\\}');
      return encodeUnicode(text);
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
    // RTF only defines \pngblip and \jpegblip for our purposes. GIF/WebP have
    // no equivalent, and labelling them \jpegblip (as v1 did) produces a file
    // Word renders as a broken image — say so instead of shipping corruption.
    const matches = src.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);
    if (!matches) {
      // Inline, so an image inside a paragraph doesn't split it.
      return '{\\i ' + encodeUnicode('[Image omitted: format not supported by RTF]') + '}';
    }

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
\\pard\\sb200\\sa200{\\b\\fs56 ${encodeUnicode(escapeRtfLiteral(title))}}\\par
${rtfBody}
}`;
}
