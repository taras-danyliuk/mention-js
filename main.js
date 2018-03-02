(function() {
    const go = ["channel", "here", "everyone", "aaaaaa", "abbbbb", "acccc"];
    const preventKeys = [13, 38, 40];
    let isInSearch = false;
    let currentResults = [];
    let currentIndex = 0;

    const targetDOM = document.querySelector("#target");
    wrap(targetDOM, document.createElement("div"), {
        classes: ["mention-editable-wrapper"],
        id: "mention-editable-wrapper"
    });

    const popup = document.querySelector("#mention-popup-wrapper");

    targetDOM.addEventListener("keyup", onKeyUp);
    targetDOM.addEventListener("keydown", onKeyDown);

    function onKeyUp(event) {
        if(isInSearch && preventKeys.includes(event.which)) return;

        const textBeforeCaret = getCaretCharacterOffsetWithin(targetDOM);
        const reversed = textBeforeCaret.split('').reverse().join('');
        // console.log(textBeforeCaret, 'textBeforeCaret');
        const index = reversed.search(/@/g);
        // console.log(reversed, index);
        if(index !== -1) {
            const query = reversed.substring(0, index).split('').reverse().join('');
            console.log(query);
            if(query.search(/\s/g) === -1) {
                // DO search
                isInSearch = true;
                const display = go.filter(item => item.indexOf(query.toLowerCase()) === 0);

                displayResults(display);
            }
            else hideResults();
        }
        else hideResults();
    }

    function onKeyDown(event) {
        if(event.which === 8) deleteMention(event);

        if(isInSearch && preventKeys.includes(event.which)) {
            event.preventDefault();
            switch(event.which) {
                case 38:
                    chooseAnother(false);
                    break;
                case 40:
                    chooseAnother(true);
                    break;
                case 13:
                    submitSelection();
                    break;
            }
        }
    }

    function deleteMention(event) {
        console.log("deleteMention");

        const doc = targetDOM.ownerDocument || targetDOM.document;
        const win = doc.defaultView || doc.parentWindow;
        let sel;
        if (typeof win.getSelection !== "undefined") {
            sel = win.getSelection();
            if (sel.rangeCount > 0) {
                let range = win.getSelection().getRangeAt(0);
                console.log(range.endContainer.parentNode, 'delete');
                if(range.endContainer.parentNode.classList.contains("mention-tagged-item")) {
                    event.preventDefault();

                    const text = range.endContainer.nodeValue;
                    const cursor = range.endOffset;
                    console.log(text.substring(0, cursor - 1) + text.substring(cursor));

                    range = range.cloneRange();
                    range.selectNode(range.endContainer.parentNode);
                    range.deleteContents();

                    const frag = document.createDocumentFragment();
                    const el = document.createElement("div");
                    el.innerHTML = ` ${text.substring(0, cursor - 1)}${text.substring(cursor)}`;
                    const lastNode = frag.appendChild(el.firstChild);

                    range.insertNode(frag);

                    // Preserve the selection
                    range.setStart(lastNode, cursor);
                    range.collapse(true);
                    sel.removeAllRanges();

                    sel.addRange(range);
                }

                // preCaretRange.selectNodeContents(element);
                //
                // console.log(preCaretRange, "preCaretRange");
                // let offset = range.endOffset;
                // if(testInMention(range.endContainer)) offset = range.endContainer.length;
                // else if(range.endContainer.nodeValue && testString(range.endContainer.nodeValue.substring(0, range.endOffset))) {
                //     const spaceIndex = getSpaceIndex(range.endContainer.nodeValue);
                //     if(spaceIndex !== -1 && range.endOffset < spaceIndex) offset = spaceIndex;
                // }
                //
                // preCaretRange.setEnd(range.endContainer, offset);
                // caretOffset = preCaretRange.toString();
            }
        } else if ( (sel = doc.selection) && sel.type !== "Control") {
            // const textRange = sel.createRange();
            // const preCaretTextRange = doc.body.createTextRange();
            // preCaretTextRange.moveToElementText(element);
            // preCaretTextRange.setEndPoint("EndToEnd", textRange);
            // caretOffset = preCaretTextRange.text;
        }
    }

    function chooseAnother(goDown) {
        const currentSelected = document.querySelector(".mention-result-row.mention-focused");
        let nextSelected = goDown ? currentSelected.nextElementSibling : currentSelected.previousElementSibling;

        if(!nextSelected) {
            const parent = currentSelected.parentElement;
            nextSelected = goDown ? parent.firstElementChild : parent.lastElementChild;
        }

        currentSelected.classList.remove("mention-focused");
        nextSelected.classList.add("mention-focused");
    }

    function submitSelection() {
        const currentSelected = document.querySelector(".mention-result-row.mention-focused").innerHTML;
        const span = document.createElement("span");
        span.classList.add("mention-tagged-item");
        span.innerHTML = "@" + currentSelected;

        pasteHtmlAtCaret(span);
        hideResults();
    }

    function getDogPostion(string, currentPos) {
        const part = string.substring(0, currentPos);
        const reversedPart = part.split('').reverse().join('');
        return reversedPart.search(/@/g) + 1;
    }

    function pasteHtmlAtCaret(html) {
        var sel, range;
        if (window.getSelection) {
            // IE9 and non-IE
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);

                if(range.endContainer.parentNode.classList.contains('mention-tagged-item')) {
                    let index = 0;
                    targetDOM.childNodes.forEach((node, i) => {
                        if(node === range.endContainer.parentNode) {
                            console.log('found', i);
                            index = i;
                        }
                    });


                    range = range.cloneRange();
                    // range.setStartAfter(range.endContainer.parentNode);
                    range.collapse(true);
                    range.setStart(targetDOM.childNodes[index +1], 1);
                    sel.removeAllRanges();

                    sel.addRange(range);
                }
                else {
                    range.deleteContents();
                    // Range.createContextualFragment() would be useful here but is
                    // non-standard and not supported in all browsers (IE9, for one)
                    const dogIndex = getDogPostion(range.startContainer.nodeValue, range.startOffset);
                    let spaceIndex = getSpaceIndex(range.startContainer.nodeValue.substr(dogIndex - 1));
                    if(spaceIndex !== -1) spaceIndex +=dogIndex;
                    else spaceIndex = range.endOffset;

                    console.log(dogIndex, 'dogIndex');
                    console.log(spaceIndex, 'spaceIndex');
                    const offset = range.startContainer.nodeValue.length - range.startContainer.nodeValue.indexOf("@");
                    range.setStart(range.startContainer, range.startOffset - dogIndex);
                    range.setEnd(range.endContainer, spaceIndex);
                    range.deleteContents();

                    const frag = document.createDocumentFragment();
                    frag.appendChild(html);

                    const el = document.createElement("div");
                    el.innerHTML = "&nbsp;";
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

    function displayResults(results) {
        popup.innerHTML = "";
        if(results.length > 0) {
            currentIndex = 0;
            currentResults = results;
            results.forEach((item, index) => {
                const pEl = document.createElement("p");
                pEl.classList.add("mention-result-row");
                if(index === 0) pEl.classList.add("mention-focused");
                pEl.innerHTML = item;

                popup.appendChild(pEl);
            });
        }
    }

    function hideResults() {
        isInSearch = false;
        popup.innerHTML = ""
    }

    function getSpaceIndex(string) {
        if(!string) return -1;

        const index = string.search(/@/);
        if(index === -1) return -1;

        const spaceIndex =  string.substr(index).search(/\s/);
        if(spaceIndex !== -1) return index + spaceIndex;

        return -1;
    }

    function getCaretCharacterOffsetWithin(element) {
        let caretOffset = 0;
        const doc = element.ownerDocument || element.document;
        const win = doc.defaultView || doc.parentWindow;
        let sel;
        if (typeof win.getSelection !== "undefined") {
            sel = win.getSelection();
            if (sel.rangeCount > 0) {
                const range = win.getSelection().getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);

                let offset = range.endOffset;
                if(testInMention(range.endContainer)) offset = range.endContainer.length;
                else if(range.endContainer.nodeValue && testString(range.endContainer.nodeValue.substring(0, range.endOffset))) {
                    const spaceIndex = getSpaceIndex(range.endContainer.nodeValue);
                    if(spaceIndex !== -1 && range.endOffset < spaceIndex) offset = spaceIndex;
                }

                preCaretRange.setEnd(range.endContainer, offset);
                caretOffset = preCaretRange.toString();
            }
        } else if ( (sel = doc.selection) && sel.type !== "Control") {
            const textRange = sel.createRange();
            const preCaretTextRange = doc.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint("EndToEnd", textRange);
            caretOffset = preCaretTextRange.text;
        }
        return caretOffset;
    }

    function testInMention(container) {
        return (container && container.parentNode && container.parentNode.classList.contains("mention-tagged-item"))
    }

    function testString(string) {
        string = string.split('').reverse().join('');
        const dogIndex = string.search(/@/);
        const spaceIndex = string.search(/\s/);

        return dogIndex !== -1 && dogIndex < spaceIndex;
    }

    function wrap(el, wrapper, options = {}) {
        if(options.classes && options.classes.length) options.classes.forEach(c => wrapper.classList.add(c));
        if(options.id) wrapper.id = options.id;

        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);

        const popup = document.createElement("div");
        popup.id = "mention-popup-wrapper";
        popup.classList.add("mention-popup-wrapper");
        wrapper.appendChild(popup);
    }
})();