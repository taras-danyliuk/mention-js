(function IIFE() {
  const options = {
    target: '#target',
    values: ['channel', 'here', 'everyone', 'aaaaaa', 'abbbbb', 'acccc'],
    wrapperClass: 'wrapper',
    taggedItemClass: 'tagged-item',
    popupItemClass: 'popup-item',
    popupRowClass: 'popup-row',
    popupRowFocusedClass: 'popup-row-focused',
  };

  initMention(options);






  function initMention(_options) {
    const values = _options.values.slice();
    const preventKeys = [13, 38, 40];
    let isInSearch = false;

    const targetDOM = document.querySelector('#target');

    wrap(targetDOM, document.createElement('div'), {
      classes: ['mention-editable-wrapper', _options.wrapperClass && _options.wrapperClass],
      popupClass: _options && options.popupItemClass,
      id: 'mention-editable-wrapper'
    });

    const popup = document.querySelector('#mention-popup-wrapper');

    targetDOM.addEventListener('keyup', onKeyUp);
    targetDOM.addEventListener('keydown', onKeyDown);
    //something


    // Event functions
    function onKeyUp(event) {
      if (isInSearch && preventKeys.includes(event.which)) {
        return;
      }

      const searchQuery = getSearchQueary(targetDOM);
      if (typeof searchQuery === 'string') {
        isInSearch = true;
        const display = values.filter(item => item.indexOf(searchQuery.toLowerCase()) === 0);

        displayResults(display);
      } else {
        hideResults();
      }
    }

    function onKeyDown(event) {
      if (event.which === 8) {
        deleteMention(event);
      }

      if (isInSearch && preventKeys.includes(event.which)) {
        event.preventDefault();
        switch (event.which) {
          case 38:
            return chooseAnother(false);
          case 40:
            return chooseAnother(true);
          case 13:
            return submitSelection();
          default:
            break;
        }
      }
    }


    function deleteMention(event) {
      const doc = targetDOM.ownerDocument || targetDOM.document;
      const win = doc.defaultView || doc.parentWindow;

      if (typeof win.getSelection !== 'undefined') {
        const sel = win.getSelection();

        if (sel.rangeCount > 0) {
          let range = win.getSelection().getRangeAt(0);

          if (range.endContainer.parentNode.classList.contains('mention-tagged-item')) {
            event.preventDefault();

            const text = range.endContainer.nodeValue;
            const cursor = range.endOffset;

            range = range.cloneRange();
            range.selectNode(range.endContainer.parentNode);
            range.deleteContents();

            const frag = document.createDocumentFragment();
            const el = document.createElement('div');

            el.innerHTML = ` ${text.substring(0, cursor - 1)}${text.substring(cursor)}`;
            const lastNode = frag.appendChild(el.firstChild);

            range.insertNode(frag);

            // Preserve the selection
            range.setStart(lastNode, cursor);
            range.collapse(true);
            sel.removeAllRanges();

            sel.addRange(range);
          }
        }
      }
    }

    function chooseAnother(goDown) {
      const currentSelected = document.querySelector('.mention-result-row.mention-focused');
      let nextSelected = goDown ? currentSelected.nextElementSibling : currentSelected.previousElementSibling;

      if (!nextSelected) {
        const parent = currentSelected.parentElement;
        nextSelected = goDown ? parent.firstElementChild : parent.lastElementChild;
      }

      currentSelected.classList.remove('mention-focused');
      if (_options.popupRowFocusedClass) {
        currentSelected.classList.remove(_options.popupRowFocusedClass);
      }
      nextSelected.classList.add('mention-focused');
      if (_options.popupRowFocusedClass) {
        nextSelected.classList.add(_options.popupRowFocusedClass);
      }
    }

    function submitSelection() {
      const currentSelected = document.querySelector('.mention-result-row.mention-focused').innerHTML;
      const span = document.createElement('span');

      span.classList.add('mention-tagged-item');
      if(_options.taggedItemClass) span.classList.add(_options.taggedItemClass);
      span.innerHTML = `@${currentSelected}`;

      pasteMention(span);
      hideResults();
    }


    // Show/hide results
    function displayResults(results) {
      popup.innerHTML = '';
      if (results.length > 0) {
        results.forEach((item, index) => {
          const pEl = document.createElement('p');

          pEl.classList.add('mention-result-row');
          if (_options.popupRowClass) {
            pEl.classList.add(_options.popupRowClass);
          }
          if (index === 0) {
            pEl.classList.add('mention-focused');
            if (_options.popupRowFocusedClass) {
              pEl.classList.add(_options.popupRowFocusedClass);
            }
          }
          pEl.innerHTML = item;

          popup.appendChild(pEl);
        });
      }
    }

    function hideResults() {
      isInSearch = false;
      popup.innerHTML = ''
    }


    // String helpers
    function testInMention(container) {
      return container && container.parentNode && container.parentNode.classList.contains('mention-tagged-item')
    }

    function getDogPosition(string, currentPos) {
      const part = string.substring(0, currentPos);

      return part.lastIndexOf('@');
    }

    function getSpaceIndex(string) {
      const spaceIndex = string.search(/[\s\t\n\r]/);
      if (spaceIndex !== -1) {
        return spaceIndex;
      }

      return string.length;
    }


    // Selection functions
    function pasteMention(html) {
      let range = null;

      if (window.getSelection) {
        // IE9 and non-IE
        const sel = window.getSelection();

        if (sel.getRangeAt && sel.rangeCount) {
          range = sel.getRangeAt(0);

          if (range.endContainer.parentNode.classList.contains('mention-tagged-item')) {
            let index = 0;

            targetDOM.childNodes.forEach((node, i) => {
              if (node === range.endContainer.parentNode) {
                index = i;
              }
            });

            range = range.cloneRange();
            range.collapse(true);
            range.setStart(targetDOM.childNodes[index + 1], 1);
            sel.removeAllRanges();

            sel.addRange(range);
          } else {
            range.deleteContents();

            /*
             * Range.createContextualFragment() would be useful here but is
             * non-standard and not supported in all browsers (IE9, for one)
             */

            const dogIndex = getDogPosition(range.startContainer.nodeValue, range.startOffset);
            let spaceIndex = getSpaceIndex(range.startContainer.nodeValue.substr(dogIndex));

            if (spaceIndex !== -1) {
              spaceIndex += dogIndex;
            }

            range.setStart(range.startContainer, dogIndex);
            range.setEnd(range.endContainer, spaceIndex);
            range.deleteContents();

            const frag = document.createDocumentFragment();
            frag.appendChild(html);

            const el = document.createElement('div');

            el.innerHTML = '&nbsp;';
            const lastNode = frag.appendChild(el.firstChild);

            range.insertNode(frag);

            // Preserve the selection
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();

            sel.addRange(range);
          }
        }
      }
    }

    function getSearchQueary(element) {
      let caretOffset = 0;
      const doc = element.ownerDocument || element.document;
      const win = doc.defaultView || doc.parentWindow;

      if (typeof win.getSelection !== 'undefined') {
        const sel = win.getSelection();

        if (sel.rangeCount > 0) {
          const range = win.getSelection().getRangeAt(0);

          if (!range.endContainer.nodeValue) {
            return;
          }
          const preCaretRange = range.cloneRange();

          preCaretRange.selectNodeContents(element);

          const wholeText = preCaretRange.toString();

          preCaretRange.setEnd(range.endContainer, range.endOffset);
          const textBeforeCursor = preCaretRange.toString();
          const textAfterCursor = wholeText.substring(textBeforeCursor.length);

          const dogIndex = textBeforeCursor.lastIndexOf('@');

          if (dogIndex === -1) {
            return;
          }
          if (textBeforeCursor.substring(dogIndex).search(/\s/) !== -1) {
            return;
          }

          let offset = range.endOffset;

          if (testInMention(range.endContainer)) {
            offset = range.endContainer.length;
          } else if (textAfterCursor.length) {
            const spaceIndex = textAfterCursor.search(/[\s\t\n\r]/);

            if (spaceIndex === -1) {
              offset = textBeforeCursor.length + textAfterCursor.length;
            } else {
              offset = textBeforeCursor.length + spaceIndex;
            }

            const modifierIndex = textBeforeCursor.indexOf(range.endContainer.nodeValue.substring(0, range.endOffset));

            if (modifierIndex !== -1) {
              offset -= modifierIndex;
            }
          }

          preCaretRange.setEnd(range.endContainer, offset);
          caretOffset = preCaretRange.toString();

          const index = caretOffset.lastIndexOf('@');

          if (index !== -1) {
            return caretOffset.substring(index + 1);
          }
        }
      }
    }

    // Wrap initial element with relative element
    function wrap(el, wrapper, options = {}) {
      if (options.classes && options.classes.length) {
        options.classes.forEach(c => wrapper.classList.add(c));
      }
      if (options.id) {
        wrapper.id = options.id;
      }

      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      const element = document.createElement('div');

      element.id = 'mention-popup-wrapper';
      element.classList.add('mention-popup-wrapper');
      if (options.popupClass) {
        element.classList.add(options.popupClass);
      }

      wrapper.appendChild(element);
    }
  }
})();
