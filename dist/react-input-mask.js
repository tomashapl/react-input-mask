(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('react')) :
	typeof define === 'function' && define.amd ? define(['react'], factory) :
	(global.ReactInputMask = factory(global.React));
}(this, (function (React) { 'use strict';

React = React && React.hasOwnProperty('default') ? React['default'] : React;

var defaultCharsRules = {
  '9': '[0-9]',
  'a': '[A-Za-z]',
  '*': '[A-Za-z0-9]'
};

var defaultMaskChar = '_';

var parseMask = function (mask, maskChar, charsRules) {
  if (maskChar === undefined) {
    maskChar = defaultMaskChar;
  }
  if (charsRules == null) {
    charsRules = defaultCharsRules;
  }

  if (!mask || typeof mask !== 'string') {
    return {
      maskChar: maskChar,
      charsRules: charsRules,
      mask: null,
      prefix: null,
      lastEditablePos: null,
      permanents: []
    };
  }
  var str = '';
  var prefix = '';
  var permanents = [];
  var isPermanent = false;
  var lastEditablePos = null;

  mask.split('').forEach(function (character) {
    if (!isPermanent && character === '\\') {
      isPermanent = true;
    } else {
      if (isPermanent || !charsRules[character]) {
        permanents.push(str.length);
        if (str.length === permanents.length - 1) {
          prefix += character;
        }
      } else {
        lastEditablePos = str.length + 1;
      }
      str += character;
      isPermanent = false;
    }
  });

  return {
    maskChar: maskChar,
    charsRules: charsRules,
    prefix: prefix,
    mask: str,
    lastEditablePos: lastEditablePos,
    permanents: permanents
  };
};

function isAndroidBrowser() {
  var windows = new RegExp('windows', 'i');
  var firefox = new RegExp('firefox', 'i');
  var android = new RegExp('android', 'i');
  var ua = navigator.userAgent;
  return !windows.test(ua) && !firefox.test(ua) && android.test(ua);
}

function isWindowsPhoneBrowser() {
  var windows = new RegExp('windows', 'i');
  var phone = new RegExp('phone', 'i');
  var ua = navigator.userAgent;
  return windows.test(ua) && phone.test(ua);
}

function isAndroidFirefox() {
  var windows = new RegExp('windows', 'i');
  var firefox = new RegExp('firefox', 'i');
  var android = new RegExp('android', 'i');
  var ua = navigator.userAgent;
  return !windows.test(ua) && firefox.test(ua) && android.test(ua);
}

function isPermanentChar(maskOptions, pos) {
  return maskOptions.permanents.indexOf(pos) !== -1;
}

function isAllowedChar(maskOptions, pos, character) {
  var mask = maskOptions.mask,
      charsRules = maskOptions.charsRules;


  if (!character) {
    return false;
  }

  if (isPermanentChar(maskOptions, pos)) {
    return mask[pos] === character;
  }

  var ruleChar = mask[pos];
  var charRule = charsRules[ruleChar];

  return new RegExp(charRule).test(character);
}

function isEmpty(maskOptions, value) {
  return value.split('').every(function (character, i) {
    return isPermanentChar(maskOptions, i) || !isAllowedChar(maskOptions, i, character);
  });
}

function getFilledLength(maskOptions, value) {
  var maskChar = maskOptions.maskChar,
      prefix = maskOptions.prefix;


  if (!maskChar) {
    while (value.length > prefix.length && isPermanentChar(maskOptions, value.length - 1)) {
      value = value.slice(0, value.length - 1);
    }
    return value.length;
  }

  var filledLength = prefix.length;
  for (var i = value.length; i >= prefix.length; i--) {
    var character = value[i];
    var isEnteredCharacter = !isPermanentChar(maskOptions, i) && isAllowedChar(maskOptions, i, character);
    if (isEnteredCharacter) {
      filledLength = i + 1;
      break;
    }
  }

  return filledLength;
}

function isFilled(maskOptions, value) {
  return getFilledLength(maskOptions, value) === maskOptions.mask.length;
}

function formatValue(maskOptions, value) {
  var maskChar = maskOptions.maskChar,
      mask = maskOptions.mask,
      prefix = maskOptions.prefix;


  if (!maskChar) {
    value = insertString(maskOptions, '', value, 0);
    value = value.slice(0, getFilledLength(maskOptions, value));

    if (value.length < prefix.length) {
      value = prefix;
    }

    return value;
  }

  if (value) {
    var emptyValue = formatValue(maskOptions, '');
    return insertString(maskOptions, emptyValue, value, 0);
  }

  for (var i = 0; i < mask.length; i++) {
    if (isPermanentChar(maskOptions, i)) {
      value += mask[i];
    } else {
      value += maskChar;
    }
  }

  return value;
}

function clearRange(maskOptions, value, start, len) {
  var end = start + len;
  var maskChar = maskOptions.maskChar,
      mask = maskOptions.mask,
      prefix = maskOptions.prefix;

  var arrayValue = value.split('');

  if (!maskChar) {
    start = Math.max(prefix.length, start);
    arrayValue.splice(start, end - start);
    value = arrayValue.join('');

    return formatValue(maskOptions, value);
  }

  return arrayValue.map(function (character, i) {
    if (i < start || i >= end) {
      return character;
    }
    if (isPermanentChar(maskOptions, i)) {
      return mask[i];
    }
    return maskChar;
  }).join('');
}

function insertString(maskOptions, value, insertStr, insertPos, invalidCharCallback) {
  var mask = maskOptions.mask,
      maskChar = maskOptions.maskChar,
      prefix = maskOptions.prefix;

  var arrayInsertStr = insertStr.split('');
  var isInputFilled = isFilled(maskOptions, value);

  var isUsablePosition = function isUsablePosition(pos, character) {
    return !isPermanentChar(maskOptions, pos) || character === mask[pos];
  };
  var isUsableCharacter = function isUsableCharacter(character, pos) {
    return !maskChar || !isPermanentChar(maskOptions, pos) || character !== maskChar;
  };

  if (!maskChar && insertPos > value.length) {
    value += mask.slice(value.length, insertPos);
  }

  arrayInsertStr.every(function (insertCharacter) {
    while (!isUsablePosition(insertPos, insertCharacter)) {
      if (insertPos >= value.length) {
        value += mask[insertPos];
      }

      if (!isUsableCharacter(insertCharacter, insertPos)) {
        return true;
      }

      insertPos++;

      // stop iteration if maximum value length reached
      if (insertPos >= mask.length) {
        return false;
      }
    }

    var isAllowed = isAllowedChar(maskOptions, insertPos, insertCharacter) || insertCharacter === maskChar;
    if (!isAllowed) {

      if (typeof invalidCharCallback === "function") {
        invalidCharCallback();
      }

      return true;
    }

    if (insertPos < value.length) {
      if (maskChar || isInputFilled || insertPos < prefix.length) {
        value = value.slice(0, insertPos) + insertCharacter + value.slice(insertPos + 1);
      } else {
        value = value.slice(0, insertPos) + insertCharacter + value.slice(insertPos);
        value = formatValue(maskOptions, value);
      }
    } else if (!maskChar) {
      value += insertCharacter;
    }

    insertPos++;

    // stop iteration if maximum value length reached
    return insertPos < mask.length;
  });

  return value;
}

function getInsertStringLength(maskOptions, value, insertStr, insertPos) {
  var mask = maskOptions.mask,
      maskChar = maskOptions.maskChar;

  var arrayInsertStr = insertStr.split('');
  var initialInsertPos = insertPos;

  var isUsablePosition = function isUsablePosition(pos, character) {
    return !isPermanentChar(maskOptions, pos) || character === mask[pos];
  };

  arrayInsertStr.every(function (insertCharacter) {
    while (!isUsablePosition(insertPos, insertCharacter)) {
      insertPos++;

      // stop iteration if maximum value length reached
      if (insertPos >= mask.length) {
        return false;
      }
    }

    var isAllowed = isAllowedChar(maskOptions, insertPos, insertCharacter) || insertCharacter === maskChar;

    if (isAllowed) {
      insertPos++;
    }

    // stop iteration if maximum value length reached
    return insertPos < mask.length;
  });

  return insertPos - initialInsertPos;
}

var defer = function (fn) {
            var defer = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function () {
                        return setTimeout(fn, 0);
            };

            return defer(fn);
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// https://github.com/sanniassin/react-input-mask
var InputElement = function (_React$Component) {
  _inherits(InputElement, _React$Component);

  function InputElement(props) {
    _classCallCheck(this, InputElement);

    var _this = _possibleConstructorReturn(this, (InputElement.__proto__ || Object.getPrototypeOf(InputElement)).call(this, props));

    _initialiseProps.call(_this);

    var mask = props.mask,
        maskChar = props.maskChar,
        formatChars = props.formatChars,
        defaultValue = props.defaultValue,
        value = props.value,
        alwaysShowMask = props.alwaysShowMask,
        invalidCharCallback = props.invalidCharCallback;


    _this.hasValue = value != null;
    _this.maskOptions = parseMask(mask, maskChar, formatChars);
    _this.invalidCharCallback = invalidCharCallback;

    if (defaultValue == null) {
      defaultValue = '';
    }
    if (value == null) {
      value = defaultValue;
    }

    value = _this.getStringValue(value);

    if (_this.maskOptions.mask && (alwaysShowMask || value)) {
      value = formatValue(_this.maskOptions, value);
    }

    _this.value = value;
    return _this;
  }

  _createClass(InputElement, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.isAndroidBrowser = isAndroidBrowser();
      this.isWindowsPhoneBrowser = isWindowsPhoneBrowser();
      this.isAndroidFirefox = isAndroidFirefox();

      if (this.maskOptions.mask && this.getInputValue() !== this.value) {
        this.setInputValue(this.value);
      }
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      var oldMaskOptions = this.maskOptions;

      this.hasValue = nextProps.value != null;
      this.maskOptions = parseMask(nextProps.mask, nextProps.maskChar, nextProps.formatChars);

      if (!this.maskOptions.mask) {
        this.backspaceOrDeleteRemoval = null;
        this.lastCursorPos = null;
        return;
      }

      var isMaskChanged = this.maskOptions.mask && this.maskOptions.mask !== oldMaskOptions.mask;
      var showEmpty = nextProps.alwaysShowMask || this.isFocused();
      var newValue = this.hasValue ? this.getStringValue(nextProps.value) : this.value;

      if (!oldMaskOptions.mask && !this.hasValue) {
        newValue = this.getInputDOMNode().value;
      }

      if (isMaskChanged || this.maskOptions.mask && (newValue || showEmpty)) {
        newValue = formatValue(this.maskOptions, newValue);

        if (isMaskChanged) {
          var pos = this.lastCursorPos;
          var filledLen = getFilledLength(this.maskOptions, newValue);
          if (pos === null || filledLen < pos) {
            if (isFilled(this.maskOptions, newValue)) {
              pos = filledLen;
            } else {
              pos = this.getRightEditablePos(filledLen);
            }
            this.setCursorPos(pos);
          }
        }
      }

      if (this.maskOptions.mask && isEmpty(this.maskOptions, newValue) && !showEmpty && (!this.hasValue || !nextProps.value)) {
        newValue = '';
      }

      this.value = newValue;
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      if (this.maskOptions.mask && this.getInputValue() !== this.value) {
        this.setInputValue(this.value);
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          mask = _props.mask,
          alwaysShowMask = _props.alwaysShowMask,
          maskChar = _props.maskChar,
          formatChars = _props.formatChars,
          invalidCharCallback = _props.invalidCharCallback,
          props = _objectWithoutProperties(_props, ['mask', 'alwaysShowMask', 'maskChar', 'formatChars', 'invalidCharCallback']);

      if (this.maskOptions.mask) {
        if (!props.disabled && !props.readOnly) {
          var handlersKeys = ['onChange', 'onKeyDown', 'onPaste'];
          handlersKeys.forEach(function (key) {
            props[key] = _this2[key];
          });
        }

        if (props.value != null) {
          props.value = this.value;
        }
      }

      return React.createElement('input', _extends({ ref: function ref(_ref) {
          return _this2.input = _ref;
        } }, props, { onFocus: this.onFocus, onBlur: this.onBlur }));
    }
  }]);

  return InputElement;
}(React.Component);

var _initialiseProps = function _initialiseProps() {
  var _this3 = this;

  this.lastCursorPos = null;
  this.focused = false;

  this.isDOMElement = function (element) {
    return (typeof HTMLElement === 'undefined' ? 'undefined' : _typeof(HTMLElement)) === 'object' ? element instanceof HTMLElement // DOM2
    : element.nodeType === 1 && typeof element.nodeName === 'string';
  };

  this.getInputDOMNode = function () {
    var input = _this3.input;
    if (!input) {
      return null;
    }

    if (_this3.isDOMElement(input)) {
      return input;
    }

    // React 0.13
    return React.findDOMNode(input);
  };

  this.getInputValue = function () {
    var input = _this3.getInputDOMNode();
    if (!input) {
      return null;
    }

    return input.value;
  };

  this.setInputValue = function (value) {
    var input = _this3.getInputDOMNode();
    if (!input) {
      return;
    }

    _this3.value = value;
    input.value = value;
  };

  this.getLeftEditablePos = function (pos) {
    for (var i = pos; i >= 0; --i) {
      if (!isPermanentChar(_this3.maskOptions, i)) {
        return i;
      }
    }
    return null;
  };

  this.getRightEditablePos = function (pos) {
    var mask = _this3.maskOptions.mask;

    for (var i = pos; i < mask.length; ++i) {
      if (!isPermanentChar(_this3.maskOptions, i)) {
        return i;
      }
    }
    return null;
  };

  this.setCursorToEnd = function () {
    var filledLen = getFilledLength(_this3.maskOptions, _this3.value);
    var pos = _this3.getRightEditablePos(filledLen);
    if (pos !== null) {
      _this3.setCursorPos(pos);
    }
  };

  this.setSelection = function (start) {
    var len = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    var input = _this3.getInputDOMNode();
    if (!input) {
      return;
    }

    var end = start + len;
    if ('selectionStart' in input && 'selectionEnd' in input) {
      input.selectionStart = start;
      input.selectionEnd = end;
    } else {
      var range = input.createTextRange();
      range.collapse(true);
      range.moveStart('character', start);
      range.moveEnd('character', end - start);
      range.select();
    }
  };

  this.getSelection = function () {
    var input = _this3.getInputDOMNode();
    var start = 0;
    var end = 0;

    if ('selectionStart' in input && 'selectionEnd' in input) {
      start = input.selectionStart;
      end = input.selectionEnd;
    } else {
      var range = document.selection.createRange();
      if (range.parentElement() === input) {
        start = -range.moveStart('character', -input.value.length);
        end = -range.moveEnd('character', -input.value.length);
      }
    }

    return {
      start: start,
      end: end,
      length: end - start
    };
  };

  this.getCursorPos = function () {
    return _this3.getSelection().start;
  };

  this.setCursorPos = function (pos) {
    _this3.setSelection(pos, 0);

    defer(function () {
      _this3.setSelection(pos, 0);
    });

    _this3.lastCursorPos = pos;
  };

  this.isFocused = function () {
    return _this3.focused;
  };

  this.getStringValue = function (value) {
    return !value && value !== 0 ? '' : value + '';
  };

  this.onKeyDown = function (event) {
    _this3.backspaceOrDeleteRemoval = null;

    if (typeof _this3.props.onKeyDown === 'function') {
      _this3.props.onKeyDown(event);
    }

    var key = event.key,
        ctrlKey = event.ctrlKey,
        metaKey = event.metaKey,
        defaultPrevented = event.defaultPrevented;

    if (ctrlKey || metaKey || defaultPrevented) {
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      var selection = _this3.getSelection();
      var canRemove = key === 'Backspace' && selection.end > 0 || key === 'Delete' && _this3.value.length > selection.start;

      if (!canRemove) {
        return;
      }

      _this3.backspaceOrDeleteRemoval = {
        key: key,
        selection: _this3.getSelection()
      };
    }
  };

  this.onChange = function (event) {
    var paste = _this3.paste,
        invalidCharCallback = _this3.invalidCharCallback;
    var _maskOptions = _this3.maskOptions,
        mask = _maskOptions.mask,
        maskChar = _maskOptions.maskChar,
        lastEditablePos = _maskOptions.lastEditablePos,
        prefix = _maskOptions.prefix;


    var value = _this3.getInputValue();
    var oldValue = _this3.value;

    if (paste) {
      _this3.paste = null;
      _this3.pasteText(paste.value, value, paste.selection, event);
      return;
    }

    var selection = _this3.getSelection();
    var cursorPos = selection.end;
    var maskLen = mask.length;
    var valueLen = value.length;
    var oldValueLen = oldValue.length;

    var clearedValue;
    var enteredString;

    if (_this3.backspaceOrDeleteRemoval) {
      var deleteFromRight = _this3.backspaceOrDeleteRemoval.key === 'Delete';
      value = _this3.value;
      selection = _this3.backspaceOrDeleteRemoval.selection;
      cursorPos = selection.start;

      _this3.backspaceOrDeleteRemoval = null;

      if (selection.length) {
        value = clearRange(_this3.maskOptions, value, selection.start, selection.length);
      } else if (selection.start < prefix.length || !deleteFromRight && selection.start === prefix.length) {
        cursorPos = prefix.length;
      } else {
        var editablePos = deleteFromRight ? _this3.getRightEditablePos(cursorPos) : _this3.getLeftEditablePos(cursorPos - 1);

        if (editablePos !== null) {
          value = clearRange(_this3.maskOptions, value, editablePos, 1);
          cursorPos = editablePos;
        }
      }
    } else if (valueLen > oldValueLen) {
      var enteredStringLen = valueLen - oldValueLen;
      var startPos = selection.end - enteredStringLen;
      enteredString = value.substr(startPos, enteredStringLen);

      if (startPos < lastEditablePos && (enteredStringLen !== 1 || enteredString !== mask[startPos])) {
        cursorPos = _this3.getRightEditablePos(startPos);
      } else {
        cursorPos = startPos;
      }

      value = value.substr(0, startPos) + value.substr(startPos + enteredStringLen);

      clearedValue = clearRange(_this3.maskOptions, value, startPos, maskLen - startPos);
      clearedValue = insertString(_this3.maskOptions, clearedValue, enteredString, cursorPos, invalidCharCallback);

      value = insertString(_this3.maskOptions, oldValue, enteredString, cursorPos, invalidCharCallback);

      if (enteredStringLen !== 1 || cursorPos >= prefix.length && cursorPos < lastEditablePos) {
        cursorPos = Math.max(getFilledLength(_this3.maskOptions, clearedValue), cursorPos);
        if (cursorPos < lastEditablePos) {
          cursorPos = _this3.getRightEditablePos(cursorPos);
        }
      } else if (cursorPos < lastEditablePos) {
        cursorPos++;
      }
    } else if (valueLen < oldValueLen) {
      var removedLen = maskLen - valueLen;
      enteredString = value.substr(0, selection.end);
      var clearOnly = enteredString === oldValue.substr(0, selection.end);

      clearedValue = clearRange(_this3.maskOptions, oldValue, selection.end, removedLen);

      if (maskChar) {
        value = insertString(_this3.maskOptions, clearedValue, enteredString, 0, invalidCharCallback);
      }

      clearedValue = clearRange(_this3.maskOptions, clearedValue, selection.end, maskLen - selection.end);
      clearedValue = insertString(_this3.maskOptions, clearedValue, enteredString, 0, invalidCharCallback);

      if (!clearOnly) {
        cursorPos = Math.max(getFilledLength(_this3.maskOptions, clearedValue), cursorPos);
        if (cursorPos < lastEditablePos) {
          cursorPos = _this3.getRightEditablePos(cursorPos);
        }
      } else if (cursorPos < prefix.length) {
        cursorPos = prefix.length;
      }
    }
    value = formatValue(_this3.maskOptions, value);

    _this3.setInputValue(value);

    if (typeof _this3.props.onChange === 'function') {
      _this3.props.onChange(event);
    }

    if (_this3.isWindowsPhoneBrowser) {
      defer(function () {
        _this3.setSelection(cursorPos, 0);
      });
    } else {
      _this3.setCursorPos(cursorPos);
    }
  };

  this.onFocus = function (event) {
    _this3.focused = true;

    if (_this3.maskOptions.mask) {
      if (!_this3.value) {
        var prefix = _this3.maskOptions.prefix;
        var value = formatValue(_this3.maskOptions, prefix);
        var inputValue = formatValue(_this3.maskOptions, value);

        // do not use this.getInputValue and this.setInputValue as this.input
        // can be undefined at this moment if autoFocus attribute is set
        var isInputValueChanged = inputValue !== event.target.value;

        if (isInputValueChanged) {
          event.target.value = inputValue;
        }

        _this3.value = inputValue;

        if (isInputValueChanged && typeof _this3.props.onChange === 'function') {
          _this3.props.onChange(event);
        }

        _this3.setCursorToEnd();
      } else if (getFilledLength(_this3.maskOptions, _this3.value) < _this3.maskOptions.mask.length) {
        _this3.setCursorToEnd();
      }
    }

    if (typeof _this3.props.onFocus === 'function') {
      _this3.props.onFocus(event);
    }
  };

  this.onBlur = function (event) {
    _this3.focused = false;

    if (_this3.maskOptions.mask && !_this3.props.alwaysShowMask && isEmpty(_this3.maskOptions, _this3.value)) {
      var inputValue = '';
      var isInputValueChanged = inputValue !== _this3.getInputValue();

      if (isInputValueChanged) {
        _this3.setInputValue(inputValue);
      }

      if (isInputValueChanged && typeof _this3.props.onChange === 'function') {
        _this3.props.onChange(event);
      }
    }

    if (typeof _this3.props.onBlur === 'function') {
      _this3.props.onBlur(event);
    }
  };

  this.onPaste = function (event) {
    if (typeof _this3.props.onPaste === 'function') {
      _this3.props.onPaste(event);
    }

    if (_this3.isAndroidBrowser && !event.defaultPrevented) {
      _this3.paste = {
        value: _this3.getInputValue(),
        selection: _this3.getSelection()
      };
      _this3.setInputValue('');
    }
  };

  this.pasteText = function (value, text, selection, event) {
    var cursorPos = selection.start;
    if (selection.length) {
      value = clearRange(_this3.maskOptions, value, cursorPos, selection.length);
    }
    var textLen = getInsertStringLength(_this3.maskOptions, value, text, cursorPos);
    value = insertString(_this3.maskOptions, value, text, cursorPos, _this3.invalidCharCallback);
    cursorPos += textLen;
    cursorPos = _this3.getRightEditablePos(cursorPos) || cursorPos;

    if (value !== _this3.getInputValue()) {
      _this3.setInputValue(value);
      if (event && typeof _this3.props.onChange === 'function') {
        _this3.props.onChange(event);
      }
    }

    _this3.setCursorPos(cursorPos);
  };
};

return InputElement;

})));
