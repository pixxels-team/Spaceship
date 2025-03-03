/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-empty */

/*

    HTML e markdown e atualizadores de display vão ser atualizados sozinhos.
    Os outros elementos vão ter que ser reavaliados na forma que vão atualizar o conteúdo.

*/

import hljs from 'highlight.js';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import clone from 'clone';
import isBase64 from 'is-base64';
import { objType } from 'for-promise/utils/lib.mjs';

import { blobCreator, toast } from '@src/util/tools';
import initMatrix, { fetchFn } from '@src/client/initMatrix';
import openTinyURL from '@src/util/message/urlProtection';
import { bootstrapItems } from '@src/util/styles-bootstrap';
import { twemojify } from '@src/util/twemojify';
import { selectButton as selectTheme } from '@src/util/checkTheme';
import { setLoadingPage } from '@src/app/templates/client/Loading';
import imageViewer from '@src/util/imageViewer';
import tinyClipboard from '@src/util/libs/Clipboard';

// Label and display to components.
const labelCreator = (icon, props, id) =>
  $('<label>', { for: id, class: 'form-label' }).text(props.label).prepend(icon);
const displayOptions = (props, id, appId, url, oHtml) => {
  if (!oHtml) {
    props.app_id = appId;
    return $('<div>', {
      class: `${!props.visible ? 'd-none ' : ''}my-2`,
      component: id,
      place_id: appId,
      component_type: props.name,
    }).data('gradio_values', {
      props: clone(props),
      id: clone(id),
      appId: clone(appId),
      url: clone(url),
    });
  }

  if (!props.visible) {
    oHtml.addClass('d-none');
  } else {
    oHtml.removeClass('d-none');
  }

  return oHtml;
};

// Bootstrap 5 row manager.
const colsLimit = 12;
const rowsList = {
  0: [12],
  1: [12],
  2: [6, 6],
  3: [4, 4, 4],
  4: [3, 3, 3, 3],
  5: [2, 2, 4, 2, 2],
  6: [2, 2, 2, 2, 2, 2],
  7: [1, 2, 2, 2, 2, 2, 1],
  8: [2, 1, 1, 2, 2, 1, 1, 2],
  9: [2, 1, 1, 1, 2, 1, 1, 1, 2],
  10: [2, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  11: [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  12: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

// This is the filter to keep components safe within the matrix client. (Avoid things like exploit or backdor)
const htmlAllowed = {
  transformTags: {
    img: (tagName, attribs) => {
      const mx = initMatrix.matrixClient;
      const { src } = attribs;

      if (src.startsWith('mxc://') === true) {
        return {
          tagName,
          attribs: {
            ...attribs,
            src: mx?.mxcUrlToHttp(src),
            class: 'img-fluid',
          },
        };
      }

      return {
        tagName,
        attribs: {
          ...attribs,
          class: 'img-fluid',
        },
      };
    },

    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
      },
    }),
  },

  allowedTags: [
    'address',
    'article',
    'aside',
    'footer',
    'header',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hgroup',
    'main',
    'nav',
    'section',
    'blockquote',
    'dd',
    'div',
    'dl',
    'dt',
    'figcaption',
    'figure',
    'hr',
    'li',
    'main',
    'ol',
    'p',
    'pre',
    'ul',
    'a',
    'abbr',
    'b',
    'bdi',
    'bdo',
    'br',
    'cite',
    'code',
    'data',
    'dfn',
    'em',
    'i',
    'kbd',
    'mark',
    'q',
    'rb',
    'rp',
    'rt',
    'rtc',
    'ruby',
    's',
    'samp',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'time',
    'u',
    'var',
    'wbr',
    'caption',
    'col',
    'colgroup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'img',
    'center',
  ],

  allowedAttributes: {
    a: ['href', 'name', 'target'],
    // We don't currently allow img itself by default, but
    // these attributes would make sense if we did.
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'style'],
  },
};

// When a new file arrives into the embed. We will start reading here.
const fileInputFixer = (compId, props, oHtml) => {
  const input = oHtml.find("input:not([type='hidden'])");
  if (props.interactive !== false) {
    if (props.source === 'upload') {
      input.removeClass('d-hide');
    } else if (props.source === 'microphone') {
      input.addClass('d-hide');
    } else {
      input.addClass('d-hide');
    }
  } else {
    input.addClass('d-hide');
  }

  if (typeof props.value === 'string') {
    const gradioInput = oHtml.data('gradio_input');
    if (props.value.startsWith('https://')) {
      setLoadingPage('Fetching gradio blob...');

      fetchFn(props.value)
        .then((response) => response.blob())
        .then((blob) => {
          setLoadingPage(false);
          const reader = new FileReader();
          reader.onload = function () {
            gradioInput.value(this.result, true, props.value);
          }; // <--- `this.result` contains a base64 data URI
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          setLoadingPage(false);
          toast(err.message);
          console.error(err);
        });
    } else {
      gradioInput.value(props.value, false);
    }
  }
};

// Id Generator
const tinyIdGenerator = (appId, props) =>
  `gradio_${appId}${props.elem_id ? `_${props.elem_id}` : ''}`;

// File input accept generator to html file inputs
const fileInputAccept = (fileTypes) => {
  if (Array.isArray(fileTypes) && fileTypes.length > 0) {
    const filesList = clone(fileTypes);
    for (const item in filesList) {
      if (typeof filesList[item] === 'string') {
        const mime = filesList[item].split('/');
        if (mime.length < 2) {
          filesList[item] = `${filesList[item]}/*`;
        }
      } else {
        filesList[item] = '';
      }
    }

    return filesList.join(', ');
  }
  return null;
};

// File Url fixer. This will correct the URL of some files that normally come from spaces or some external files.
const fileUrlGenerator = (url) => {
  let tinyUrl = url;

  if (typeof tinyUrl === 'string' && tinyUrl.length > 0) {
    if (tinyUrl.startsWith('/')) {
      tinyUrl = `${tinyUrl.substring(0, tinyUrl.length - 1)}/file=`;
    } else {
      tinyUrl = `${tinyUrl}/file=`;
    }
  } else {
    tinyUrl = '';
  }

  if (tinyUrl.endsWith('//file=')) tinyUrl = `${tinyUrl.substring(0, tinyUrl.length - 7)}/file=`;

  return tinyUrl;
};

export { fileUrlGenerator };

// The design of components within the dataset are managed here.
const datasetComponents = {
  video: (fileName, url, td) => {
    const video = $('<video>', { src: `${fileUrlGenerator(url)}${fileName}`, class: 'img-fluid' });
    video.prop('muted', true).prop('playsinline', true);

    td.on('mouseover', () => video.get(0).play());
    td.on('mouseout', () => video.get(0).pause());
    return video;
  },

  image: (fileName, url) => {
    const img = $('<img>', {
      src: `${fileUrlGenerator(url)}${fileName}`,
      class: 'img-fluid',
      alt: url,
    });
    return img;
  },
};

// The final design of external file components is generated here.
const fileManagerReader = {
  image: (previewBase, blobUrl) =>
    previewBase.css('background-image', `url('${blobUrl}')`).addClass('with-image'),

  video: (previewBase, blobUrl) => {
    if (typeof blobUrl === 'string') {
      let videoPlace = previewBase.find('video');

      if (videoPlace.length < 1) {
        videoPlace = $('<video>', { class: 'img-fluid' });
        previewBase.append(videoPlace);
      }

      previewBase.addClass('with-video');
      videoPlace.attr('src', blobUrl).attr('controls', true);
    } else {
      const videoPlace = previewBase.find('video');
      if (videoPlace.length > 0) {
        videoPlace.remove();
      }

      previewBase.removeClass('with-video');
    }
  },

  audio: (previewBase, blobUrl) => {
    if (typeof blobUrl === 'string') {
      const removeAudio = previewBase.find('audio');

      if (removeAudio.length > 0) {
        removeAudio.remove();
      }

      const audioPlace = $('<audio>');
      const source = $('<source>');

      audioPlace.append(source);
      previewBase.append(audioPlace);

      previewBase.addClass('with-audio');
      audioPlace.attr('controls', true);
      source.attr('src', blobUrl);
    } else {
      const audioPlace = previewBase.find('audio');
      if (audioPlace.length > 0) {
        audioPlace.remove();
      }

      previewBase.removeClass('with-audio');
    }
  },

  file: null,
  model3d: null,
  timeseries: null,
};

// All components that involve the use of external files will be passed here. This is the place that prepares the processing of external files within the embed.
const fileManagerEditor = (previewBase, finalResult, id, type, props, fileAccept, tinyValue) => {
  const inputData = { type: 'blob' };
  const inputText = $('<input>', { fileroot: true, class: 'd-none', type: 'hidden' });
  const input = $('<input>', {
    class: 'form-control form-control-bg',
    type: 'file',
    id: `${id}_${type}`,
    accept: typeof fileAccept === 'string' ? fileAccept : fileInputAccept(props.file_types),
  })
    .prop('multiple', props.file_count === 'multiple')
    .prop('webkitdirectory', props.file_count === 'directory')
    .prop('directory', props.file_count === 'directory');

  let blob = null;

  const valueUpdater = (value, convertBlob = false, originalValue = null) => {
    if (typeof value === 'undefined') {
      return blob;
    }

    input.val('');
    inputText.val(value);
    inputText.trigger('change');

    if (convertBlob) {
      const resultData = finalResult.data('gradio_values');
      resultData.props.value = value;
    }

    blob = convertBlob ? blobCreator(value) : value;
    if (previewBase && typeof fileManagerReader[type] === 'function') {
      fileManagerReader[type](previewBase, !convertBlob && !originalValue ? value : originalValue);
    }

    return null;
  };

  inputData.value = valueUpdater;
  inputData.input = inputText;
  finalResult.data('gradio_input', inputData);

  const fileInput = input.get(0);
  input.get(0).addEventListener(
    'change',
    () => {
      const reader = new FileReader();
      reader.onload = function () {
        blob = blobCreator(this.result);
        if (previewBase && typeof fileManagerReader[type] === 'function') {
          fileManagerReader[type](previewBase, URL.createObjectURL(blob));
        }
      };

      reader.readAsDataURL(fileInput.files[0]);
    },
    false,
  );

  if (
    typeof props.value === 'string' &&
    previewBase &&
    typeof fileManagerReader[type] === 'function'
  ) {
    fileManagerReader[type](previewBase, props.value);
  }

  if (typeof tinyValue === 'string' && tinyValue.length > 0) {
    valueUpdater(tinyValue, true);
  }

  return [input, inputText];
};

// Components
// https://www.gradio.app/docs

// Here are all the html data of all components that can be read by this API.
const components = {
  // https://www.gradio.app/docs/html
  html: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const clickEvent = (event) => {
      const e = event.originalEvent;
      e.preventDefault();
      openTinyURL($(event.currentTarget).attr('href'), $(event.currentTarget).attr('href'));
      return false;
    };

    if (!oHtml) {
      const html = $(sanitizeHtml(props.value, htmlAllowed));
      html.find('a').on('click', clickEvent);

      finalResult.append(html);
      return finalResult;
    }

    return () => {
      if (props.value) {
        const html = $(sanitizeHtml(props.value, htmlAllowed));
        oHtml.replaceWith(html);
        html.find('a').on('click', clickEvent);
      } else {
        oHtml.empty();
      }
    };
  },

  // https://www.gradio.app/docs/markdown
  markdown: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const clickEvent = (event) => {
      const e = event.originalEvent;
      e.preventDefault();
      openTinyURL($(event.currentTarget).attr('href'), $(event.currentTarget).attr('href'));
      return false;
    };

    if (!oHtml) {
      const html = $(sanitizeHtml(marked.parse(props.value), htmlAllowed));
      html.find('a').on('click', clickEvent);

      finalResult.append(html);
      return finalResult;
    }

    return () => {
      if (props.value) {
        const html = $(sanitizeHtml(marked.parse(props.value), htmlAllowed));
        oHtml.replaceWith(html);
        html.find('a').on('click', clickEvent);
      } else {
        oHtml.empty();
      }
    };
  },

  // https://www.gradio.app/docs/dataframe
  dataframe: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml).addClass('dataframe');

    const thead = $('<thead>');
    const th = $('<tr>');

    const tbody = $('<tbody>', { class: 'table-group-divider' });
    const addThead = (headers) => {
      for (const item in headers) {
        if (typeof headers[item] === 'string') {
          th.append($('<th>').text(headers[item]));
        }
      }

      thead.append(th);
    };

    if (objType(props.value, 'object')) {
      if (Array.isArray(props.value.headers) && props.value.headers.length > 0) {
        addThead(props.value.headers);
      } else if (Array.isArray(props.headers) && props.headers.length > 0) {
        addThead(props.headers);
      }

      if (Array.isArray(props.value.data) && props.value.data.length > 0) {
        for (const item in props.value.data) {
          if (Array.isArray(props.value.data[item]) && props.value.data[item].length > 0) {
            const td = $('<tr>');

            for (const item2 in props.value.data[item]) {
              if (typeof props.value.data[item][item2] === 'string') {
                td.append($('<td>').text(props.value.data[item][item2]));
              }
            }

            tbody.append(td);
          }
        }
      }
    } else if (Array.isArray(props.headers) && props.headers.length > 0) {
      addThead(props.headers);
    }

    if (!oHtml) {
      const table = $('<table>', { class: 'table table-striped' });
      table.append(thead, tbody);
      finalResult.append(table);
      return finalResult;
    }

    return () => oHtml.find('> table').empty().append(thead, tbody);
  },

  // https://www.gradio.app/docs/audio
  audio: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('audio');

      const exampleIcon = $('<i>', { class: 'fa-solid fa-music' });
      const audio = $('<div>', { class: 'audio-preview border border-bg' }).append(exampleIcon);

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_audio`));
      }

      const input = fileManagerEditor(
        audio,
        finalResult,
        id,
        'audio',
        props,
        'audio/*',
        props.value,
      );
      if (props.interactive !== false) {
        if (props.source !== 'upload') {
          input[0].addClass('d-hide');
        }
      } else {
        input[0].addClass('d-hide');
      }

      finalResult.append(input);
      finalResult.append(audio);

      if (props.show_share_button) {
      }

      if (props.show_download_button) {
      }

      return finalResult;
    }

    return () => fileInputFixer(compId, props, oHtml, 'audio');
  },

  // https://www.gradio.app/docs/button
  button: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);

    if (props.variant === 'stop') props.variant = 'danger';

    const sizes = {
      normal: 20,
      sm: 15,
      lg: 30,
    };

    const classes = `btn btn-${props.variant ? props.variant : 'bg'}${typeof props.size === 'string' && props.size.length > 0 ? ` btn-${props.size}` : ''}`;
    const sizeSelected =
      typeof props.size === 'string' && props.size.length > 0 ? props.size : 'normal';

    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('button').addClass('d-grid');

      const button = $('<button>', { class: classes }).text(props.value);

      if (typeof props.icon === 'string' && props.icon.length > 0) {
        button.prepend(
          $('<img>', { src: props.icon, alt: 'icon', class: 'img-fluid me-2' }).css(
            'height',
            sizes[sizeSelected],
          ),
        );
      }

      button.prop('disabled', props.interactive === false);

      finalResult.append(button);
      finalResult.data('gradio_target', { type: 'jquery', value: button });
      return finalResult;
    }

    return () => {
      const button = oHtml.find('> button');
      button.empty().text(props.value).attr('class', classes);

      if (typeof props.icon === 'string' && props.icon.length > 0) {
        button.prepend(
          $('<img>', { src: props.icon, alt: 'icon', class: 'img-fluid me-2' }).css(
            'height',
            sizes[sizeSelected],
          ),
        );
      }

      button.prop('disabled', props.interactive === false);
    };
  },

  // https://www.gradio.app/docs/chatbot
  chatbot: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const addChatStuff = (tinyPlace) => {
      if (Array.isArray(props.value) && props.value.length > 0) {
        const createUserMessage = (index, message) => {
          const base = $('<div>', {
            class: `small d-flex flex-row justify-content-start chatbot-base${props.rtl ? ' chatbot-rtl' : ''} chatbot-base-${index} py-3${props.rtl ? (index === 0 ? ' ps-4 pe-3 text-start' : ' pe-4 ps-3 text-end') : ' px-3 text-start'}`,
          });

          if (
            (!props.rtl || index === 0) &&
            Array.isArray(props.avatar_images) &&
            typeof props.avatar_images[index] === 'string' &&
            props.avatar_images[index].length > 0
          ) {
            base.append(
              $('<img>', {
                src: props.avatar_images[index],
                alt: `avatar ${index}`,
                class: 'avatar ms-2',
              }),
            );
          }

          base.append(twemojify(message));

          if (
            props.rtl &&
            index === 1 &&
            Array.isArray(props.avatar_images) &&
            typeof props.avatar_images[index] === 'string' &&
            props.avatar_images[index].length > 0
          ) {
            base.append(
              $('<img>', {
                src: props.avatar_images[index],
                alt: `avatar ${index}`,
                class: 'avatar me-2',
              }),
            );
          }

          tinyPlace.append(base);
        };

        for (const item in props.value) {
          if (Array.isArray(props.value[item]) && props.value[item].length > 0) {
            if (typeof props.value[item][0] === 'string' && props.value[item][0].length > 0)
              createUserMessage(0, props.value[item][0]);
            if (typeof props.value[item][1] === 'string' && props.value[item][1].length > 0)
              createUserMessage(1, props.value[item][1]);
          }
        }
      }

      if (props.show_share_button) {
      }

      if (props.show_copy_button) {
      }
    };

    if (!oHtml) {
      finalResult
        .attr('id', id)
        .addClass('chatbot')
        .addClass('border')
        .addClass('border-bg')
        .addClass('bg-bg2')
        .addClass('p-3');

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_chatbot`));
      }

      addChatStuff(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      if (props.show_label && props.label) {
        oHtml.append(labelCreator(null, props, `${id}_chatbot`));
      }

      addChatStuff(oHtml);
    };
  },

  // https://www.gradio.app/docs/checkbox
  checkbox: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult
        .attr('id', id)
        .addClass('checkbox')
        .addClass('w-100')
        .addClass('text-start')
        .addClass('h-100');

      const checkbox = $('<input>', {
        id: `${id}_individual`,
        class: 'form-check-input',
        type: 'checkbox',
      })
        .prop('checked', props.value === true || props.value === 'true')
        .prop('disabled', props.interactive === false);
      const input = $(`<div>`, {
        class: 'form-check border border-bg checkboxradio-group w-100 p-2',
      }).append(
        checkbox,
        $('<label>', { for: `${id}_individual`, class: 'form-check-label' }).text(
          props.show_label && typeof props.label === 'string' ? props.label : 'Checkbox',
        ),
      );

      finalResult.data('gradio_input', { type: 'jquery', isCheckbox: true, value: checkbox });
      finalResult.append(input);

      return finalResult;
    }
  },

  // https://www.gradio.app/docs/checkboxgroup
  checkboxgroup: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('checkboxgroup');

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props));
      }

      const inputs = [];
      if (Array.isArray(props.choices) && props.choices.length > 0) {
        for (const item in props.choices) {
          if (typeof props.choices[item] === 'string') {
            const checkbox = $('<input>', {
              id: id !== null ? id + item : null,
              class: 'form-check-input',
              type: 'checkbox',
              value: props.choices[item],
            })
              .prop(
                'checked',
                Array.isArray(props.value) &&
                  props.value.length > 0 &&
                  props.value.indexOf(props.choices[item]) > -1,
              )
              .prop('disabled', props.interactive === false);
            const input = $(`<div>`, {
              class: 'form-check border border-bg checkboxradio-group',
            }).append(
              checkbox,
              $('<label>', { for: id !== null ? id + item : null, class: 'form-check-label' }).text(
                props.choices[item],
              ),
            );

            inputs.push(checkbox);
            finalResult.append(input);
          }
        }
      }

      finalResult.data('gradio_input', { type: 'array', value: inputs });
      return finalResult;
    }
  },

  // https://www.gradio.app/docs/code
  code: (props, compId, appId, url, oHtml) => {
    try {
      const finalResult = displayOptions(props, compId, appId, url, oHtml);
      const id = tinyIdGenerator(appId, props);

      const insertTinyCode = (tinyPlace) => {
        const tinyCode = $('<code>', {
          class: `language-${props.language} hljs text-start`,
        }).append(
          props.value ? hljs.highlight(props.value, { language: props.language }).value : '',
        );

        const tinyResult = $('<pre>').append(tinyCode);
        // hljsFixer(tinyCode, 'MessageBody');

        tinyPlace.append(tinyResult);
      };

      if (!oHtml) {
        finalResult.attr('id', id).addClass('code');

        if (props.show_label && props.label) {
          finalResult.append(labelCreator(null, props, id));
        }

        insertTinyCode(finalResult);
        return finalResult;
      }

      oHtml.empty();
      if (props.show_label && props.label) {
        oHtml.append(labelCreator(null, props, `${id}_chatbot`));
      }

      insertTinyCode(oHtml);
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  // https://www.gradio.app/docs/colorpicker
  colorpicker: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('button').addClass('d-grid');

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, id));
      }

      const input = $('<input>', {
        id,
        class: 'form-control form-control-bg form-control-color',
        type: 'color',
      })
        .prop('disabled', props.interactive === false)
        .val(props.value);

      finalResult.data('gradio_input', { type: 'jquery', value: input });
      finalResult.append(input);

      return finalResult;
    }
  },

  // https://www.gradio.app/docs/dataset
  dataset: (props, compId, appId, url, oHtml, folderCount) => {
    console.log('dataset', props);
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('dataset');

      if (props.show_label && typeof props.label === 'string') {
        finalResult.append($('<div>', { id }).text(props.label));
      }

      const tinyColsLimit =
        folderCount < 1 ? colsLimit : Math.round(colsLimit / Number(folderCount + 5));

      const inputs = [];
      let table;
      let cols = 0;

      let isSingle = true;
      const getRowClass = (item) => {
        const tinyNumber = rowsList[cols][item];
        let padding = 'p-4';

        if (tinyNumber === 1) padding = '';
        return `${padding} col-${rowsList[cols][item]}`;
      };

      if (Array.isArray(props.samples) && props.samples.length > 0) {
        for (const item in props.samples) {
          if (Array.isArray(props.samples[item]) && props.samples[item].length > 1) {
            isSingle = false;
          }
        }
      }

      let headerMode = false;

      if (!isSingle && Array.isArray(props.headers) && props.headers.length > 0) {
        headerMode = true;
        table = $('<table>');
        table.addClass('table table-hover table-bordered border border-bg');

        const thead = $('<thead>');
        const tr = $('<tr>');
        const tds = [];

        for (const item in props.headers) {
          if (typeof props.headers[item] === 'string') {
            const td = $('<th>', { class: 'text-bg-force' }).text(props.headers[item]);
            tds.push(td);
            tr.append(td);
          }
        }

        inputs.push(tds);

        thead.append(tr);
        table.append(thead);
      } else {
        table = $('<div>');
        table.addClass('dataset-table dataset-td-hover dataset-bordered');
      }

      if (Array.isArray(props.samples) && props.samples.length > 0) {
        if (headerMode) {
          const tbody = $('<tbody>');
          for (const item in props.samples) {
            const tr = $('<tr>');
            const tds = [];

            if (Array.isArray(props.samples[item])) {
              for (const item2 in props.samples[item]) {
                if (typeof props.samples[item][item2] === 'string') {
                  let td;
                  if (typeof datasetComponents[props.components[item2]] !== 'function') {
                    td = $('<td>', { class: 'text-bg-force' }).text(props.samples[item][item2]);
                  } else {
                    td = $('<td>', { class: 'text-bg-force' });
                    td.append(
                      datasetComponents[props.components[item2]](
                        props.samples[item][item2],
                        url,
                        td,
                        props,
                        compId,
                        appId,
                      ),
                    );
                  }

                  tds.push(td);
                  tr.append(td);
                }
              }
            }

            inputs.push(tds);
            tbody.append(tr);
          }

          table.append(tbody);
        } else {
          const tbody = $('<div>', { class: 'row' });

          // cols = 4;
          // CORREÇÃO AQUI!
          const tds = [];
          for (const item in props.samples) {
            if (Array.isArray(props.samples[item])) {
              for (const item2 in props.samples[item]) {
                if (typeof props.samples[item][item2] === 'string') {
                  if (cols < tinyColsLimit) {
                    cols++;
                  }

                  let td;
                  if (typeof datasetComponents[props.components[item2]] !== 'function') {
                    td = $('<div>', { class: `text-bg-force border border-bg` }).text(
                      props.samples[item][item2],
                    );
                  } else {
                    td = $('<div>', { class: `text-bg-force border border-bg` });
                    td.append(
                      datasetComponents[props.components[item2]](
                        props.samples[item][item2],
                        url,
                        td,
                        props,
                        compId,
                        appId,
                      ),
                    );
                  }

                  tds.push(td);
                  tbody.append(td);
                }
              }
            }
          }

          for (const item in tds) {
            tds[item].addClass(getRowClass(item));
          }

          inputs.push(tds);
          table.append(tbody);
        }
      }

      finalResult.data('gradio_input', { type: 'array', value: inputs });
      finalResult.data('gradio_target', { type: 'array', value: inputs });
      finalResult.append(table);
      return finalResult;
    }
  },

  // https://www.gradio.app/docs/dropdown
  dropdown: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.addClass('dropdown');

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, id));
      }

      const dropdown = $(`<select>`, {
        id: id !== null ? id : null,
        class: 'form-control form-control-bg',
      });

      if (Array.isArray(props.choices) && props.choices.length > 0) {
        const customValue = 'custom_CUSTOM_VALUE_2d32d23dwafw32';

        for (const item in props.choices) {
          if (typeof props.choices[item] === 'string') {
            dropdown.append(
              $('<option>', { value: props.choices[item] }).text(props.choices[item]),
            );
          } else if (Array.isArray(props.choices[item])) {
            dropdown.append(
              $('<option>', { value: props.choices[item][0] }).text(props.choices[item][1]),
            );
          }
        }

        if (props.allow_custom_value) {
          dropdown.append($('<option>', { value: customValue }).text('Custom'));
        }

        dropdown.val(props.value);

        const input = $('<input>', {
          class: `form-control form-control-bg${!props.allow_custom_value ? ' d-none' : ''}`,
          type: 'text',
          value: props.value,
        });
        dropdown.append(input);

        dropdown.change(() => {
          const value = dropdown.val();
          if (value !== customValue) {
            input.val(value);
            input.prop('readonly', true);
          } else {
            input.prop('readonly', false);
          }
        });

        finalResult.data('gradio_input', { type: 'jquery', value: input });
        finalResult.data('gradio_dropdown', { type: 'jquery', value: dropdown });

        finalResult.append(dropdown);
      }

      return finalResult;
    }
  },

  // https://www.gradio.app/docs/file
  file: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('file');

      const exampleIcon = $('<i>', { class: 'fa-solid fa-file' });
      const csv = $('<div>', { class: 'file-preview border border-bg' }).append(exampleIcon);

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_file`));
      }

      const input = fileManagerEditor(csv, finalResult, id, 'file', props, null, props.value);
      if (props.interactive !== false) {
        finalResult.append(input);
      }

      finalResult.append(csv);

      return finalResult;
    }

    return () => fileInputFixer(compId, props, oHtml, 'file');
  },

  // https://www.gradio.app/docs/gallery
  gallery: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const tinyUrl = fileUrlGenerator(url);

    const galleryItems = (input, gallery) => {
      const cols = (typeof props.grid_cols === 'number' ? props.grid_cols : null) || props.columns;

      if (
        typeof cols === 'number' &&
        !Number.isNaN(cols) &&
        Number.isFinite(cols) &&
        cols <= colsLimit &&
        rowsList[cols]
      ) {
        if (Array.isArray(rowsList[cols]) && Array.isArray(props.value)) {
          let rowNumber = 0;

          for (const item in props.value) {
            const value = Array.isArray(props.value[item])
              ? {
                  name: props.value[item][0]?.name,
                  data: props.value[item][1],
                  is_file: true,
                }
              : props.value[item];

            let imgUrl = value.name;
            if (
              typeof imgUrl === 'string' &&
              !imgUrl.startsWith('https://') &&
              !imgUrl.startsWith('http://')
            ) {
              imgUrl = `${tinyUrl}${imgUrl}`;
            }

            const contextClick = () => {
              const img = new Image();
              img.onload = function () {
                imageViewer(null, $(img), `${appId}_${compId}_${item}`, imgUrl).then((pswp) => {
                  // pswp.on('close', pswp.destroy());
                });
              };

              img.src = imgUrl;
              return false;
            };

            const button = $('<button>', { class: 'w-100' }).append(
              objType(value, 'object') && typeof value.name === 'string' && value.name.length > 0
                ? $('<div>', { class: 'avatar border border-bg' })
                    .css({ 'background-image': `url('${imgUrl}')` })
                    .data('gradio_props_gallery_item', value)
                : null,

              typeof value.data === 'string'
                ? $('<div>', { class: 'text-bg' }).text(value.data)
                : null,
            );

            gallery.append(
              $('<div>', { class: `col-${rowsList[cols][rowNumber]}` }).append(button),
            );

            if (props.selectable) {
              button.on('contextmenu', contextClick).on('click', () => {
                let tinyValue = value.data || value.name;
                if (typeof tinyValue === 'string') {
                  if (tinyValue.startsWith('/') && !tinyValue.startsWith('https://')) {
                    tinyValue = `${fileUrlGenerator(url)}${tinyValue}`;
                  }

                  if (tinyValue.startsWith('https://')) {
                    setLoadingPage('Fetching gradio blob...');
                    fetchFn(tinyValue)
                      .then((response) => response.blob())
                      .then((blob) => {
                        setLoadingPage(false);
                        const reader = new FileReader();
                        reader.onload = function () {
                          input.val(this.result);
                          input.trigger('change');
                        };
                        reader.readAsDataURL(blob);
                      })
                      .catch((err) => {
                        setLoadingPage(false);
                        toast(err.message);
                        console.error(err);
                      });
                  } else {
                    input.val(tinyValue);
                    input.trigger('change');
                  }
                }
              });
            } else {
              button.on('click', contextClick);
            }

            rowNumber++;
            if (typeof rowsList[cols][rowNumber] !== 'number') {
              rowNumber = 0;
            }
          }
        }
      }
    };

    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult
        .attr('id', id)
        .addClass('gallery')
        .addClass('border')
        .addClass('border-bg')
        .addClass('p-3');

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_gallery`));
      }

      const gallery = $('<div>', { class: 'row' });
      const input = $('<input>', { class: 'd-none', type: 'text' });

      galleryItems(input, gallery);
      finalResult.append(input, gallery);
      finalResult.data('gradio_input', { type: 'jquery', value: input });

      if (props.show_share_button) {
      }

      return finalResult;
    }

    return () => {
      const gallery = oHtml.find('> div');
      gallery.empty();

      galleryItems(oHtml.find('> input'), gallery);
    };
  },

  // https://www.gradio.app/docs/highlightedtext
  highlightedtext: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const highlightedResult = (tinyPlace) => {
      if (props.selectable) {
      }

      if (Array.isArray(props.value) && Array.isArray(props.value)) {
        let colorIndex = 0;
        for (const item in props.value) {
          if (Array.isArray(props.value[item])) {
            const highlight = $('<span>', {
              class: `border border-bg p-1 mx-1 bg-${bootstrapItems.normal[colorIndex]} bg-opacity-25`,
            });

            if (typeof props.value[item][0] === 'string' && props.value[item][0].length > 0) {
              highlight.text(props.value[item][0]);
            }

            if (
              typeof props.value[item][1] === 'string' &&
              props.value[item][1].length > 0 &&
              props.show_label
            ) {
              highlight.append(
                $('<span>', { class: `ms-2 badge bg-${bootstrapItems.normal[colorIndex]}` }).text(
                  props.value[item][1],
                ),
              );
            }

            if (props.show_legend) {
            }

            tinyPlace.append(highlight);

            colorIndex++;
            if (typeof bootstrapItems.normal[colorIndex] !== 'string') colorIndex = 0;
          }
        }
      }
    };

    if (!oHtml) {
      finalResult.attr('id', id).addClass('highlightedtext');

      highlightedResult(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      highlightedResult(oHtml);
    };
  },

  // https://www.gradio.app/docs/image
  image: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('image');

      const exampleIcon = $('<i>', { class: 'fa-solid fa-image' });
      const img = $('<div>', { class: 'image-preview border border-bg' }).append(exampleIcon);

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_image`));
      }

      const input = fileManagerEditor(img, finalResult, id, 'image', props, 'image/*', props.value);
      if (props.interactive !== false) {
        if (props.source === 'upload') {
          finalResult.append(input);
        }
      }

      finalResult.append(img);

      if (props.show_share_button) {
      }

      if (props.show_download_button) {
      }

      return finalResult;
    }

    return () => fileInputFixer(compId, props, oHtml, 'image');
  },

  // https://www.gradio.app/docs/json
  json: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const tinyJsonResult = (tinyPlace) => {
      if (props.show_label && props.label) {
        tinyPlace.append(labelCreator(null, props, id));
      }

      const tinyJson = $('<div>', {
        class: 'text-start text-freedom border border-bg p-3 bg-bg2',
      }).append(
        props.value
          ? hljs.highlight(JSON.stringify(props.value, null, 4), { language: 'json' }).value
          : '',
      );

      tinyPlace.append(tinyJson);
    };

    if (!oHtml) {
      finalResult.attr('id', id).addClass('json');

      tinyJsonResult(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      tinyJsonResult(oHtml);
    };
  },

  // https://www.gradio.app/docs/label
  label: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const labelCreate = (tinyPlace) => {
      if (props.show_label && props.label) {
        tinyPlace.append(labelCreator(null, props, id));
      }

      const tinyLabel = $('<div>', { class: 'border border-bg p-3 bg-bg2' });
      if (objType(props.value, 'object')) {
        if (typeof props.value.label === 'string' && props.value.label.length > 0) {
          tinyLabel.append($('<h2>').text(props.value.label));
        }

        if (Array.isArray(props.value.confidences) && props.value.confidences.length > 0) {
          for (const item in props.value.confidences) {
            let confidence = Number(props.value.confidences[item].confidence) * 100;
            if (Number.isNaN(confidence) || !Number.isFinite(confidence) || confidence < 0)
              confidence = 0;
            if (confidence > 100) confidence = 100;

            tinyLabel.append(
              $('<div>', { class: 'mt-2 text-start confidence' }).append(
                $('<div>', {
                  class: 'progress',
                  role: 'progressbar',
                  'aria-valuenow': confidence,
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                }).append($('<div>', { class: 'progress-bar' }).css('width', `${confidence}%`)),

                $('<table>', { class: 'sub-label' }).append(
                  $('<tbody>').append(
                    $('<tr>').append(
                      $('<td>', { class: 'sub-label-title' }).text(
                        props.value.confidences[item].label,
                      ),
                      $('<td>', { class: 'sub-label-confidence' }).text(`${confidence}%`),
                    ),
                  ),
                ),
              ),
            );
          }
        }
      }

      tinyPlace.append(tinyLabel);
    };

    if (!oHtml) {
      finalResult.attr('id', id).addClass('label');

      labelCreate(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      labelCreate(oHtml);
    };
  },

  // https://www.gradio.app/docs/model3d (Incomplete)
  model3d: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('model3d');

      const exampleIcon = $('<i>', { class: 'fa-solid fa-cubes' });
      const model3d = $('<div>', { class: 'model3d-preview border border-bg' }).append(exampleIcon);

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_model3d`));
      }

      const input = fileManagerEditor(
        model3d,
        finalResult,
        id,
        'model3d',
        props,
        'model/*',
        props.value,
      );
      if (props.interactive !== false) {
        finalResult.append(input);
      }

      finalResult.append(model3d);

      return finalResult;
    }

    return () => fileInputFixer(compId, props, oHtml, 'model3d');
  },

  // https://www.gradio.app/docs/number
  number: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('number');

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, id));
      }

      const numberInput = $('<input>', {
        class: 'form-control form-control-bg',
        type: 'number',
        max: props.maximum,
        min: props.minimum,
        step: props.step,
      }).prop('readonly', props.interactive === false);
      finalResult.append(numberInput);

      numberInput.on('change keypress keydown keyup', () => {
        const value = Number(numberInput.val());
        const max = Number(numberInput.attr('max'));
        const min = Number(numberInput.attr('min'));

        if (
          !Number.isNaN(max) &&
          Number.isFinite(max) &&
          !Number.isNaN(min) &&
          Number.isFinite(min)
        ) {
          if (!Number.isNaN(value) && Number.isFinite(value)) {
            if (value > max) numberInput.val(max);
            if (value < min) numberInput.val(min);
          } else {
            numberInput.val(min);
          }
        }
      });

      finalResult.data('gradio_input', { type: 'jquery', isNumber: true, value: numberInput });
      numberInput.val(
        typeof props.value === 'number' &&
          !Number.isNaN(props.value) &&
          Number.isFinite(props.value)
          ? props.value
          : 0,
      );
      return finalResult;
    }
  },

  // https://www.gradio.app/docs/plot
  // https://www.gradio.app/docs/barplot
  // https://www.gradio.app/docs/lineplot
  // https://www.gradio.app/docs/scatterplot
  plot: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const createPlot = (tinyPlace) => {
      if (props.show_label && props.label) {
        tinyPlace.append(labelCreator(null, props, id));
      }

      if (objType(props.value, 'object')) {
        if (props.value.type === 'matplotlib') {
          if (
            typeof props.value.plot === 'string' &&
            isBase64(props.value.plot, { allowMime: true, mimeRequired: true, allowEmpty: false })
          ) {
            tinyPlace.append(
              $('<img>', { alt: 'matplotlib', src: props.value.plot, class: 'img-fluid' }).prop(
                'draggable',
                false,
              ),
            );
          }
        }

        if (props.value.type === 'altair') {
          try {
            props.value.plot = JSON.parse(props.value.plot);
            const vegaItem = $('<div>', { class: 'vega-chart' });
            tinyPlace.append(vegaItem);

            const theme = selectTheme();

            vegaEmbed(vegaItem.get(0), props.value.plot, {
              theme: theme === 'dark' || theme === 'secondary' ? 'dark' : 'default',
            });
          } catch (err) {
            console.error(err);
            props.value.plot = {};
          }
        }
      }
    };

    if (!oHtml) {
      finalResult.attr('id', id).addClass('plot');

      createPlot(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      createPlot(oHtml);
    };
  },

  // https://www.gradio.app/docs/radio
  radio: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const createRadio = (tinyPlace) => {
      if (props.show_label && props.label) {
        tinyPlace.append(labelCreator(null, props, id));
      }

      const radioGroup = $('<div>');

      if (Array.isArray(props.choices) && props.choices.length > 0) {
        const tinyName = `gradio_radio_${appId}_${id !== null ? id : null}_${compId}`;
        for (const item in props.choices) {
          if (typeof props.choices[item] === 'string') {
            const tinyId = `gradio_radio_item_${id !== null ? id : null}_${item}`;

            const input = $(`<div>`, {
              class: 'form-check border border-bg checkboxradio-group',
            }).append(
              $('<input>', {
                id: tinyId,
                class: 'form-check-input',
                type: 'radio',
                value: props.choices[item],
                name: tinyName,
              }).prop('disabled', props.interactive === false),
              $('<label>', { for: tinyId, class: 'form-check-label' }).text(props.choices[item]),
            );

            radioGroup.append(input);
          }
        }

        const $radios = radioGroup.find(`input:radio[name="${tinyName}"]`);
        if ($radios.is(':checked') === false) {
          $radios.filter(`[value="${props.value}"]`).prop('checked', true);
        }

        tinyPlace.data('gradio_input', { type: 'jquery', value: $radios });
      }

      tinyPlace.append(radioGroup);
    };

    if (!oHtml) {
      finalResult.attr('id', id).addClass('radio');

      createRadio(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      createRadio(oHtml);
    };
  },

  // https://www.gradio.app/docs/slider
  slider: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const createSlider = (tinyPlace) => {
      if (props.show_label && props.label) {
        tinyPlace.append(labelCreator(null, props, id));
      }

      const input = $('<input>', {
        type: 'range',
        class: 'form-range',
        max: props.maximum,
        min: props.minimum,
        step: props.step,
      }).prop('disabled', props.interactive === false);
      const numberInput = $('<input>', {
        class: 'form-control form-control-bg form-control-slider float-end',
        type: 'number',
        max: props.maximum,
        min: props.minimum,
        step: props.step,
      }).prop('readonly', props.interactive === false);
      tinyPlace.append(numberInput);

      numberInput.on('change keypress keydown keyup', () => {
        const value = Number(numberInput.val());
        const value2 = Number(input.val());
        const max = Number(numberInput.attr('max'));
        const min = Number(numberInput.attr('min'));

        if (
          !Number.isNaN(max) &&
          Number.isFinite(max) &&
          !Number.isNaN(min) &&
          Number.isFinite(min)
        ) {
          if (!Number.isNaN(value) && Number.isFinite(value)) {
            if (value > max) numberInput.val(max);
            if (value < min) numberInput.val(min);
          } else {
            numberInput.val(min);
          }

          if (value !== value2) input.val(value);
        }
      });

      input.on('change keypress keydown keyup input', () => {
        const value = Number(numberInput.val());
        const value2 = Number(input.val());
        if (value !== value2) numberInput.val(value2);
      });

      tinyPlace.append(input);

      input.val(props.value);
      numberInput.val(props.value);
      tinyPlace.data('gradio_input', {
        type: 'jquery',
        isNumber: true,
        value: numberInput,
        value2: input,
      });
    };

    if (!oHtml) {
      finalResult.attr('id', id).addClass('slider');

      createSlider(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      createSlider(oHtml);
    };
  },

  // https://www.gradio.app/docs/textbox
  textbox: (props, compId, appId, url, oHtml) => {
    // values
    let textboxStopHeight = false;
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    const id = tinyIdGenerator(appId, props);

    const createTextbox = (tinyPlace) => {
      if (props.show_label && props.label) {
        tinyPlace.append(labelCreator(null, props, `${id}_textbox`));
      }

      // Textarea Value
      const isTextInput = props.lines === 1 && props.max_lines === 1;
      const textarea = $(`<${isTextInput ? 'input' : 'textarea'}>`, {
        id: id !== null ? `${id}_textbox` : null,
        rows: props.lines,
        maxrows: props.max_lines,
        placeholder: props.placeholder,
        class: 'form-control form-control-bg',
      });

      // Spacing Detector
      const tinyNoteSpacing = (event) => {
        if (!isTextInput) {
          // Textarea reset
          textarea.css('height', 0);

          // Target
          const element = event.target;

          // First Numbers
          const textHeight = Number(element.scrollHeight);
          const spacesCount = textarea.val().split('\n').length;
          const maxLines = Number(textarea.attr('maxrows'));

          // Cache
          let finalHeight = textHeight;

          // Space Count
          const heightPerSpace = textHeight / spacesCount;
          const heightMaxPerSpace = textHeight / maxLines;

          // Space Count + Space Count Limit
          const spacePerCalculator = heightPerSpace - heightMaxPerSpace;

          // Active Limit Size
          if (spacesCount > maxLines) {
            finalHeight = heightPerSpace * maxLines;
          }

          // Insert new height
          textarea.css('height', `${finalHeight}px`);

          // Scroll Protection
          if (spacesCount > maxLines) {
            textarea.animate({ scrollTop: 9999999 }, 0);
          }

          // Stop Size Detector
          if (spacePerCalculator === 0) {
            textboxStopHeight = true;
          } else {
            textboxStopHeight = false;
          }
        }
      };

      textarea.on('keypress keyup keydown change input', tinyNoteSpacing);

      textarea.val(props.value).prop('readonly', props.interactive === false);
      tinyPlace.data('gradio_input', { type: 'jquery', value: textarea });
      tinyPlace.append(textarea);

      if (props.show_copy_button) {
        tinyPlace
          .append($('<button>', { class: `btn btn-primary` }).text('Copy text'))
          .on('click', () => {
            try {
              const data = textarea.val().trim();

              if (data.length > 0) {
                tinyClipboard.copyText(data);
                toast('Text successfully copied to the clipboard.');
              }
            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          });
      }
    };

    if (!oHtml) {
      finalResult.addClass('textbox');

      createTextbox(finalResult);
      return finalResult;
    }

    return () => {
      oHtml.empty();
      createTextbox(oHtml);
    };
  },

  // ???
  timeseries: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('timeseries');

      const exampleIcon = $('<i>', { class: 'fa-solid fa-file-csv' });
      const csv = $('<div>', { class: 'timeseries-preview border border-bg' }).append(exampleIcon);

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_timeseries`));
      }

      const input = fileManagerEditor(
        csv,
        finalResult,
        id,
        'timeseries',
        props,
        'text/csv',
        props.value,
      );
      if (props.interactive !== false) {
        finalResult.append(input);
        finalResult.data('gradio_input', { type: 'jquery', value: input });
      }

      finalResult.append(csv);

      if (props.show_share_button) {
      }

      if (props.show_download_button) {
      }

      return finalResult;
    }

    return () => fileInputFixer(compId, props, oHtml, 'timeseries');
  },

  // https://www.gradio.app/docs/button
  uploadbutton: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('uploadbutton').addClass('d-grid');

      if (props.variant === 'stop') props.variant = 'danger';

      const sizes = {
        normal: 20,
        sm: 15,
        lg: 30,
      };

      const sizeSelected =
        typeof props.size === 'string' && props.size.length > 0 ? props.size : 'normal';
      const fileInput = fileManagerEditor(
        null,
        finalResult,
        id,
        'uploadbutton',
        props,
        null,
        props.value,
      );

      const button = $('<button>', {
        class: `btn btn-${props.variant ? props.variant : 'bg'}${typeof props.size === 'string' && props.size.length > 0 ? ` btn-${props.size}` : ''}`,
      })
        .text(props.label)
        .on('click', () => fileInput.trigger('click'));

      if (typeof props.icon === 'string' && props.icon.length > 0) {
        button.prepend(
          $('<img>', { src: props.icon, alt: 'icon', class: 'img-fluid me-2' }).css(
            'height',
            sizes[sizeSelected],
          ),
        );
      }

      button.prop('disabled', props.interactive === false);

      finalResult.data('gradio_input', { type: 'jquery', value: fileInput });
      finalResult.append([button, fileInput]);
      return finalResult;
    }
  },

  // https://www.gradio.app/docs/video
  video: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml);
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('video');

      const exampleIcon = $('<i>', { class: 'fa-solid fa-video' });
      const video = $('<div>', { class: 'video-preview border border-bg' }).append(exampleIcon);

      if (props.show_label && props.label) {
        finalResult.append(labelCreator(null, props, `${id}_video`));
      }

      const input = fileManagerEditor(
        video,
        finalResult,
        id,
        'video',
        props,
        'video/*',
        props.value,
      );
      if (props.interactive !== false) {
        if (props.source === 'upload') {
          finalResult.append(input);
        }
      }

      finalResult.append(video);

      if (props.show_share_button) {
      }

      if (props.show_download_button) {
      }

      if (props.autoplay) {
      }

      if (props.mirror_webcam) {
      }

      if (props.include_audio) {
      }

      return finalResult;
    }

    return () => fileInputFixer(compId, props, oHtml, 'video');
  },

  // https://www.gradio.app/docs/column
  column: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml).attr(
      'component_type',
      'column',
    );
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('p-2').addClass('column');

      if (props.show_label && typeof props.label === 'string') {
        finalResult.append($('<div>', { id }).text(props.label));
      }

      return finalResult;
    }
  },

  // https://www.gradio.app/docs/row
  row: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml).attr(
      'component_type',
      'row',
    );
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('row');

      if (props.show_label && typeof props.label === 'string') {
        finalResult.append($('<div>', { id }).text(props.label));
      }

      return finalResult;
    }
  },

  // ???
  box: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml).attr(
      'component_type',
      'box',
    );
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('box');

      if (props.show_label && typeof props.label === 'string') {
        finalResult.append($('<div>', { id }).text(props.label));
      }

      return finalResult;
    }
  },

  // https://www.gradio.app/docs/accordion
  accordion: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml).attr(
      'component_type',
      'accordion',
    );
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('accordion');

      const collapseId = `${id}_collapse_${compId}`;

      if (typeof props.label === 'string') {
        const collapse = $('<div>', { class: 'collapse', id: collapseId });
        const button = $('<button>', {
          class: 'btn ic-btn ic-btn-link btn-bg btn-link btn-bg btn-text-link btn-bg',
          type: 'button',
          'data-bs-toggle': 'collapse',
          'aria-expanded': props.open ? 'true' : 'false',
          'aria-controls': collapseId,
          'data-bs-target': `#${collapseId}`,
        })
          .text(props.label)
          .append(
            $('<i>', {
              class: `collapse-button float-end ms-2 ic-base ic-fa ic-fa-normal fa-solid fa-caret-${props.open ? 'down' : 'left'}`,
            }),
          );

        collapse
          .on('hide.bs.collapse', () => {
            const target = button.find('> .ic-base');
            target.removeClass('fa-caret-left').removeClass('fa-caret-down');
            target.addClass('fa-caret-left');
          })
          .on('show.bs.collapse', () => {
            const target = button.find('> .ic-base');
            target.removeClass('fa-caret-left').removeClass('fa-caret-down');
            target.addClass('fa-caret-down');
          });

        finalResult.append(
          $('<div>', { id, class: 'card' }).append(
            $('<div>', { class: 'card-body p-2' }).append(
              $('<span>', { class: 'd-grid' }).append(button),
              collapse,
            ),
          ),
        );
      }

      return finalResult;
    }
  },

  // https://www.gradio.app/docs/group
  group: (props, compId, appId, url, oHtml) => {
    const finalResult = displayOptions(props, compId, appId, url, oHtml).attr(
      'component_type',
      'group',
    );
    if (!oHtml) {
      const id = tinyIdGenerator(appId, props);
      finalResult.attr('id', id).addClass('group').addClass('my-3');

      if (props.show_label && typeof props.label === 'string') {
        finalResult.append($('<div>', { id }).text(props.label));
      }

      return finalResult;
    }
  },
};

export { components };

// Children loader
// This is where all the component loading actually starts.
const childrenLoader = (
  items,
  config,
  url,
  appId,
  comps,
  root,
  tinyIndex = -1,
  rootTabs = { type: null, data: null },
  folderCount = 0,
) => {
  if (Array.isArray(items)) {
    // HTML Items. This is the final value that is sent into the embed containing the html of all components.
    const html = [];
    tinyIndex++;

    // Read Data
    for (const item in items) {
      if (
        objType(items[item], 'object') &&
        typeof items[item].id === 'number' &&
        !Number.isNaN(items[item].id) &&
        Number.isFinite(items[item].id)
      ) {
        // Prepare page data
        let page = [];
        let newPage;

        // Exist Children gradio values?
        const existChildrens =
          Array.isArray(items[item].children) && items[item].children.length > 0;

        // Get component values.
        const component = config.components.find((c) => c.id === items[item].id);

        // Is row? This is useful for some things involving row html.
        if (component.type === 'row') {
          folderCount++;
        }

        // New Children load start. This new page will be added into the page.
        if (existChildrens)
          newPage = childrenLoader(
            items[item].children,
            config,
            url,
            appId,
            comps,
            root,
            clone(tinyIndex),
            rootTabs,
            folderCount,
          );

        // Componet value exist. If a function value exists to read the component in "components" variable. This will execute. This will also come into play if the component type is compatible with secondary scripts that are used in creating HTML.
        if (
          objType(component, 'object') &&
          objType(component.props, 'object') &&
          typeof component.type === 'string' &&
          (typeof components[component.type] === 'function' ||
            component.type === 'form' ||
            component.type === 'tabitem' ||
            component.type === 'tabs')
        ) {
          // If the script is related to visual things as mentioned below, we will adapt the next components to the current visual component.
          if (
            existChildrens &&
            (component.type === 'row' ||
              component.type === 'accordion' ||
              component.type === 'tabitem' ||
              component.type === 'tabs')
          ) {
            // Row
            if (component.type === 'row') {
              // Create Row Items
              let newPageLength = 0;
              for (const item2 in newPage) {
                if (
                  /* newPage[item2].text().trim().length > 0 && */ !newPage[item2].hasClass(
                    'd-none',
                  )
                )
                  newPageLength++;
              }

              // Get row list item
              const rowItems = rowsList[newPageLength];

              // Insert Row items
              let rowItem = 0;
              newPage.forEach((item2) => {
                page.push(
                  $('<div>', {
                    class: `col-md-${rowItems[rowItem]}${item2.hasClass('d-none') ? ' d-none' : ''}`,
                  }).append(item2),
                );
                if (rowItem > rowItems) rowItem = 0;
              });
            }

            // Tab Item
            else if (component.type === 'tabitem') {
              if (rootTabs.type === null) {
                rootTabs.data = [];
                rootTabs.type = 'tabitem';
              }

              rootTabs.data.push({ page: newPage, component });
            }
          }

          // Nothing? So we will continue normal progress.
          else {
            page = newPage;
          }

          // If this is not a tab, then let's continue the service here.
          if (component.type !== 'tabitem' && component.type !== 'tabs') {
            // Normal mode.
            if (component.type !== 'form') {
              // Get component by function to insert into data.
              const tinyHtml = components[component.type](
                component.props,
                component.id,
                appId,
                url,
                null,
                folderCount,
              );

              // Now let's insert it into the root. This is the root that is inside the class of this file.
              root[component.id] = tinyHtml;

              // This is where we add some html update functions using new component update replace. (used on the class function "updateHtml")
              // eslint-disable-next-line no-loop-func
              const addUpdateData = (theHtml) => {
                theHtml.data('gradio_update', () => {
                  const values = theHtml.data('gradio_values');
                  const newHtml = components[component.type](
                    values.props,
                    values.id,
                    values.appId,
                    values.url,
                    null,
                    folderCount,
                  );
                  root[values.id] = newHtml;

                  theHtml.replaceWith(newHtml);
                  addUpdateData(newHtml);
                });
              };

              // Add data updater
              addUpdateData(tinyHtml);

              // Fix Accordion bootstrap html
              if (component.type === 'accordion') {
                tinyHtml.find('.card .card-body .collapse').append(newPage);
              }

              // Check html data
              if (typeof tinyHtml !== 'undefined') {
                if (page) tinyHtml.append(page);
                html.push(tinyHtml);
              }
            }

            // Build Form Data. As we don't have a script to create a form data manually. So let's convert this to a normal div.
            else if (page) {
              page.forEach((item2) => {
                component.props.app_id = appId;
                item2
                  .attr('form-component-id', component.id)
                  .attr('form-element-id', component.props.elem_id)
                  .data('gradio_form_data', component);
                html.push(item2);
              });
            }
          }

          // Tabs
          else if (component.type === 'tabs') {
            // Result
            const tabResult = displayOptions(component.props, component.id, appId, url).attr(
              'component_type',
              'tabs',
            );
            const tabId = `${appId}_tabs_${component.id}`;

            // Preparing tab Nav
            const tabsNav = $('<ul>', { class: 'nav nav-tabs' });

            // Tab Base
            const tabsWindow = $('<div>');
            const tab = $('<div>', { id: tabId }).append(tabsNav, tabsWindow);

            // Read Tab Data. Be aware that this content will be inserted during the tab component's reading loops.
            for (const tabItem in rootTabs.data) {
              const tabTargetId = `${appId}_tabs_${component.id}_${rootTabs.data[tabItem].component?.id}`;
              const tabTargetIdHead = `${appId}_tabs_${component.id}_head_${rootTabs.data[tabItem].component?.id}`;
              tabsNav.append(
                $('<li>', { class: 'nav-item', id: tabTargetIdHead }).append(
                  $('<a>', {
                    class: `nav-link text-bg-force${tabItem > 0 ? ' collapsed' : ''}`,
                    href: '#',
                    'data-bs-toggle': 'collapse',
                    'aria-expanded': tabItem > 0 ? 'false' : 'true',
                    'data-bs-target': `#${tabTargetId}`,
                    'aria-controls': `#${tabTargetId}`,
                  })
                    .text(rootTabs.data[tabItem].component?.props.label)
                    .on('click', (event) => {
                      const e = event.originalEvent;
                      e.preventDefault();
                      return false;
                    }),
                ),
              );

              tabsWindow.append(
                $('<div>', {
                  id: tabTargetId,
                  class: `accordion-collapse collapse${tabItem > 0 ? '' : ' show'}`,
                  'aria-labelledby': `${tabTargetIdHead}`,
                  'data-bs-parent': `#${tabId}`,
                }).append(rootTabs.data[tabItem].page),
              );
            }

            // Complete
            tabResult.append(tab);
            html.push(tabResult);

            // Reset now
            rootTabs.data = [];
            rootTabs.type = null;
          }
        }
      }
    }

    // Complete. Insert the html value.
    comps[tinyIndex] = html;
    return html;
  }
};

// Upgrader Components
// Some components need to be 100% rebuilt when loading updated values. Everything will be executed here when the embed update is taking place.
const upgraderComponents = {
  html: (values, type, input, tinyFunction) => {
    if (typeof tinyFunction === 'function') tinyFunction();
  },

  markdown: (values, type, input, tinyFunction) => {
    if (typeof tinyFunction === 'function') tinyFunction();
  },

  gallery: (values, type, input, tinyFunction) => {
    if (typeof tinyFunction === 'function') tinyFunction();
  },
};

class GradioLayout {
  // Constructor
  constructor(config, cssBase, url = '', appId = '', embedCache = {}) {
    if (
      objType(config, 'object') &&
      objType(config.layout, 'object') &&
      Array.isArray(config.layout.children) &&
      config.layout.children.length > 0 &&
      Array.isArray(config.components) &&
      config.components.length > 0
    ) {
      // Get Children
      this.root = {};
      this.components = {};

      // Start children loader...
      const page = childrenLoader(
        config.layout.children,
        config,
        url,
        appId,
        this.components,
        this.root,
      );

      // Complete
      this.cache = objType(embedCache, 'object') ? embedCache : {};
      this.html = page;

      // Insert default values here.
      this.defaultStore = {};
      this.readEmbedData((root, id) => {
        const type = root.attr('component_type');

        if (type !== 'markdown' && type !== 'html') {
          const values = root.data('gradio_values') ?? {};
          this.defaultStore[id] = {
            data: clone(values),
            type: clone(type),
          };
        }
      });
    }
  }

  // Don't touch it. This function is just to fix some possible glitches when obtaining a component.
  _getCompFix(id) {
    if (!objType(id, 'object')) {
      return this.getComponent(id);
    }

    return id;
  }

  // Insert Html
  insertHtml(html, mode = 'append') {
    this.page = html[mode](this.html);
  }

  // Insert Ydoc (Not used for now)
  insertYdoc(ydoc, type) {
    this.ydoc = ydoc;
    this._ydoc_type = typeof type === 'string' ? type : null;
  }

  // Get Html
  getHtml() {
    return this.page ? this.page : $('<div>');
  }

  // Get Component by Id. If you don't know the component's Id, the Id will be visible within the embed's html.
  getComponent(id) {
    const comp = {};

    if (typeof id === 'number' || typeof id === 'string') {
      comp.value = this.page.find(`[component='${String(id)}']`);
    } else if (typeof id !== 'undefined') {
      comp.value = id;
    }

    if (comp.value) {
      if (comp.value.length > 0) {
        comp.type = comp.value.attr('component_type');
      } else {
        comp.type = null;
      }
    } else {
      comp.type = null;
    }

    return comp;
  }

  // Get values within the data that is normally stored using jQuery Data. The entire embed will always have these values stored within jQuery.
  getInput(id) {
    const data = this._getCompFix(id);
    if (objType(data, 'object') && data.value) return data.value.data('gradio_input');
  }

  getDropdown(id) {
    const data = this._getCompFix(id);
    if (objType(data, 'object') && data.value) return data.value.data('gradio_dropdown');
  }

  getTarget(id) {
    const data = this._getCompFix(id);
    if (objType(data, 'object') && data.value) return data.value.data('gradio_target');
  }

  // Get Values
  getComponentValue(id) {
    const data = this._getCompFix(id);
    if (objType(data, 'object') && data.value) return data.value.data('gradio_values');
  }

  // Get default data
  getDefaultEmbedData(id) {
    if (this.defaultStore[id]) {
      return clone(this.defaultStore[id]);
    }

    return null;
  }

  readEmbedData(callback) {
    let needsUpdate = false;

    for (const id in this.root) {
      const newUpdate = callback(this.root[id], id);
      if (!needsUpdate) {
        needsUpdate = newUpdate;
      }
    }

    return needsUpdate;
  }

  /*
        Whenever Gradio needs to be updated, this function will be called. This script will look for all inputs to have the values validated for each one.
    */
  updateEmbed() {
    this.readEmbedData((root, id) => {
      // Get value
      const values = root.data('gradio_values') ?? {};
      const type = root.attr('component_type');
      const input = root.data('gradio_input');

      // Exist component time
      if (components[type]) {
        // Execute component e get function to update
        const tinyFunction = components[type](
          values.props ?? {},
          values?.id,
          values?.appId,
          values?.url,
          root,
          null,
        );

        // Exist custom load component function?
        if (typeof upgraderComponents[type] === 'function') {
          upgraderComponents[type](values, type, input, tinyFunction);
        }

        // Nope. Read input
        else if (objType(input, 'object')) {
          // jQuery
          if (input.type === 'jquery') {
            if (!input.isCheckbox) {
              input.value.val(values.props.value);
            } else {
              input.value.prop('checked', values.props.value);
            }

            input.value.trigger('change');
          }

          // Blob
          else if (input.type === 'blob') {
            input.value(values.props.value);
          }
        }
      }
    });
  }

  // Update Html
  updateHtml(id, index) {
    const compBase = this._getCompFix(id);

    if (objType(compBase, 'object')) {
      const updateGradio = compBase.value.data('gradio_update');
      if (typeof updateGradio === 'function') updateGradio();
      if (objType(this.cache, 'object') && typeof this.cache.genDeps === 'function')
        this.cache.genDeps(index);
    }
  }
}

export default GradioLayout;
