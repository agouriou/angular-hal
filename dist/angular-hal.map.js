(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.angularHal = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * content-type
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
var paramRegExp = /; *([!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+) */g
var textRegExp = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/
var tokenRegExp = /^[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+$/

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
var qescRegExp = /\\([\u000b\u0020-\u00ff])/g

/**
 * RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
 */
var quoteRegExp = /([\\"])/g

/**
 * RegExp to match type in RFC 6838
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
var typeRegExp = /^[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+\/[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+$/

/**
 * Module exports.
 * @public
 */

exports.format = format
exports.parse = parse

/**
 * Format object to media type.
 *
 * @param {object} obj
 * @return {string}
 * @public
 */

function format(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new TypeError('argument obj is required')
  }

  var parameters = obj.parameters
  var type = obj.type

  if (!type || !typeRegExp.test(type)) {
    throw new TypeError('invalid type')
  }

  var string = type

  // append parameters
  if (parameters && typeof parameters === 'object') {
    var param
    var params = Object.keys(parameters).sort()

    for (var i = 0; i < params.length; i++) {
      param = params[i]

      if (!tokenRegExp.test(param)) {
        throw new TypeError('invalid parameter name')
      }

      string += '; ' + param + '=' + qstring(parameters[param])
    }
  }

  return string
}

/**
 * Parse media type to object.
 *
 * @param {string|object} string
 * @return {Object}
 * @public
 */

function parse(string) {
  if (!string) {
    throw new TypeError('argument string is required')
  }

  if (typeof string === 'object') {
    // support req/res-like objects as argument
    string = getcontenttype(string)

    if (typeof string !== 'string') {
      throw new TypeError('content-type header is missing from object');
    }
  }

  if (typeof string !== 'string') {
    throw new TypeError('argument string is required to be a string')
  }

  var index = string.indexOf(';')
  var type = index !== -1
    ? string.substr(0, index).trim()
    : string.trim()

  if (!typeRegExp.test(type)) {
    throw new TypeError('invalid media type')
  }

  var key
  var match
  var obj = new ContentType(type.toLowerCase())
  var value

  paramRegExp.lastIndex = index

  while (match = paramRegExp.exec(string)) {
    if (match.index !== index) {
      throw new TypeError('invalid parameter format')
    }

    index += match[0].length
    key = match[1].toLowerCase()
    value = match[2]

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value
        .substr(1, value.length - 2)
        .replace(qescRegExp, '$1')
    }

    obj.parameters[key] = value
  }

  if (index !== -1 && index !== string.length) {
    throw new TypeError('invalid parameter format')
  }

  return obj
}

/**
 * Get content-type from req/res objects.
 *
 * @param {object}
 * @return {Object}
 * @private
 */

function getcontenttype(obj) {
  if (typeof obj.getHeader === 'function') {
    // res-like
    return obj.getHeader('content-type')
  }

  if (typeof obj.headers === 'object') {
    // req-like
    return obj.headers && obj.headers['content-type']
  }
}

/**
 * Quote a string if necessary.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function qstring(val) {
  var str = String(val)

  // no need to quote tokens
  if (tokenRegExp.test(str)) {
    return str
  }

  if (str.length > 0 && !textRegExp.test(str)) {
    throw new TypeError('invalid parameter value')
  }

  return '"' + str.replace(quoteRegExp, '\\$1') + '"'
}

/**
 * Class to represent a content type.
 * @private
 */
function ContentType(type) {
  this.parameters = Object.create(null)
  this.type = type
}

},{}],2:[function(require,module,exports){
/* jshint node:true */

var UriTemplate = require('./UriTemplate');

function Router() {
    var routes = [];

    this.add = function (template, handler) {

        routes.push({
            template: new UriTemplate(template),
            handler: handler
        }); //

    }; //add

    this.handle = function (url) {

        return routes.some(function (route) {
            var data = route.template.parse(url);
            return data && route.handler(data) !== false;
        });

    }; //exec

} //Router

module.exports = Router;
},{"./UriTemplate":3}],3:[function(require,module,exports){
/* jshint node:true */

module.exports = UriTemplate;


var operatorOptions = {
    "": {
        "prefix": "",
        "seperator": ",",
        "assignment": false,
        "assignEmpty": false,
        "encode": percentEncode
    },
    "+": {
        "prefix": "",
        "seperator": ",",
        "assignment": false,
        "assignEmpty": false,
        "encode": encodeURI
    },
    "#": {
        "prefix": "#",
        "seperator": ",",
        "assignment": false,
        "assignEmpty": false,
        "encode": encodeURI
    },
    ".": {
        "prefix": ".",
        "seperator": ".",
        "assignment": false,
        "assignEmpty": false,
        "encode": percentEncode
    },
    "/": {
        "prefix": "/",
        "seperator": "/",
        "assignment": false,
        "encode": encodeURIComponent
    },
    ";": {
        "prefix": ";",
        "seperator": ";",
        "assignment": true,
        "assignEmpty": false,
        "encode": encodeURIComponent
    },
    "?": {
        "prefix": "?",
        "seperator": "&",
        "assignment": true,
        "assignEmpty": true,
        "encode": encodeURIComponent
    },
    "&": {
        "prefix": "&",
        "seperator": "&",
        "assignment": true,
        "assignEmpty": true,
        "encode": encodeURIComponent
    }
}; //operatorOptions

function percentEncode(value) {
    /*
	http://tools.ietf.org/html/rfc3986#section-2.3
	*/
    var unreserved = "-._~";

    if (isUndefined(value)) return '';

    value = value.toString();

    return Array.prototype.map.call(value, function (ch) {
        var charCode = ch.charCodeAt(0);

        if (charCode >= 0x30 && charCode <= 0x39) return ch;
        if (charCode >= 0x41 && charCode <= 0x5a) return ch;
        if (charCode >= 0x61 && charCode <= 0x7a) return ch;

        if (~unreserved.indexOf(ch)) return ch;

        return '%' + charCode.toString(16).toUpperCase();
    }).join('');

} //percentEncode

function isDefined(value) {
    return !isUndefined(value);
} //isDefined
function isUndefined(value) {
    /*
	http://tools.ietf.org/html/rfc6570#section-2.3
	*/
    if (value === null) return true;
    if (value === undefined) return true;
    if (Array.isArray(value)) {
        if (value.length === 0) return true;
    }

    return false;
} //isUndefined


function UriTemplate(template) {
    /*
	http://tools.ietf.org/html/rfc6570#section-2.2

	expression    =  "{" [ operator ] variable-list "}"
	operator      =  op-level2 / op-level3 / op-reserve
	op-level2     =  "+" / "#"
	op-level3     =  "." / "/" / ";" / "?" / "&"
	op-reserve    =  "=" / "," / "!" / "@" / "|"
	*/
    var reTemplate = /\{([\+#\.\/;\?&=\,!@\|]?)([A-Za-z0-9_\,\.\:\*]+?)\}/g;
    var reVariable = /^([\$_a-z][\$_a-z0-9]*)((?:\:[1-9][0-9]?[0-9]?[0-9]?)?)(\*?)$/i;
    var match;
    var pieces = [];
    var glues = [];
    var offset = 0;
    var pieceCount = 0;

    while ( !! (match = reTemplate.exec(template))) {
        glues.push(template.substring(offset, match.index));
        /*
		The operator characters equals ("="), comma (","), exclamation ("!"),
		at sign ("@"), and pipe ("|") are reserved for future extensions.
		*/
        if (match[1] && ~'=,!@|'.indexOf(match[1])) {
            throw "operator '" + match[1] + "' is reserved for future extensions";
        }

        offset = match.index;
        pieces.push({
            operator: match[1],
            variables: match[2].split(',').map(variableMapper)
        });
        offset += match[0].length;
        pieceCount++;
    }

    function variableMapper(variable) {
        var match = reVariable.exec(variable);
        return {
            name: match[1],
            maxLength: match[2] && parseInt(match[2].substring(1), 10),
            composite: !! match[3]
        };
    }

    glues.push(template.substring(offset));

    this.parse = function (str) {
        var data = {};
        var offset = 0;
        var offsets = [];

        if (!glues.every(function (glue, glueIndex) {
            var index;
            if (glueIndex > 0 && glue === '') index = str.length;
            else index = str.indexOf(glue, offset);

            offset = index;
            offsets.push(offset);
            offset += glue.length;

            return~ index;
        })) return false;

        if (!pieces.every(function (piece, pieceIndex) {
            var options = operatorOptions[piece.operator];
            var value, values;
            var offsetBegin = offsets[pieceIndex] + glues[pieceIndex].length;
            var offsetEnd = offsets[pieceIndex + 1];

            value = str.substring(offsetBegin, offsetEnd);
            if (value.length === 0) return true;
            if (value.substring(0, options.prefix.length) !== options.prefix) return false;
            value = value.substring(options.prefix.length);
            values = value.split(options.seperator);

            if (!piece.variables.every(function (variable, variableIndex) {
                var value = values[variableIndex];
                var name;

                if (value === undefined) return true;

                name = variable.name;

                if (options.assignment) {
                    if (value.substring(0, name.length) !== name) return false;
                    value = value.substring(name.length);
                    if (value.length === 0 && options.assignEmpty) return false;
                    if (value.length > 0) {
                        if (value[0] !== '=') return false;
                        value = value.substring(1);
                    }
                }
                value = decodeURIComponent(value);
                data[name] = value;

                return true;
            })) return false;

            return true;

        })) return false;

        return data;
    }; //parse

    this.stringify = function (data) {
        var str = '';
        data = data || {};

        str += glues[0];
        if (!pieces.every(function (piece, pieceIndex) {

            var options = operatorOptions[piece.operator];
            var parts;

            parts = piece.variables.map(function (variable) {
                var value = data[variable.name];

                if (!Array.isArray(value)) value = [value];

                value = value.filter(isDefined);

                if (isUndefined(value)) return null;

                if (variable.composite) {
                    value = value.map(function (value) {

                        if (typeof value === 'object') {

                            value = Object.keys(value).map(function (key) {
                                var keyValue = value[key];
                                if (variable.maxLength) keyValue = keyValue.substring(0, variable.maxLength);

                                keyValue = options.encode(keyValue);

                                if (keyValue) keyValue = key + '=' + keyValue;
                                else {
                                    keyValue = key;
                                    if (options.assignEmpty) keyValue += '=';
                                }

                                return keyValue;
                            }).join(options.seperator);

                        } else {
                            if (variable.maxLength) value = value.substring(0, variable.maxLength);

                            value = options.encode(value);

                            if (options.assignment) {
                                if (value) value = variable.name + '=' + value;
                                else {
                                    value = variable.name;
                                    if (options.assignEmpty) value += '=';
                                }
                            }
                        }

                        return value;
                    });

                    value = value.join(options.seperator);
                } else {
                    value = value.map(function (value) {
                        if (typeof value === 'object') {
                            return Object.keys(value).map(function (key) {
                                var keyValue = value[key];
                                if (variable.maxLength) keyValue = keyValue.substring(0, variable.maxLength);
                                return key + ',' + options.encode(keyValue);
                            }).join(',');
                        } else {
                            if (variable.maxLength) value = value.substring(0, variable.maxLength);

                            return options.encode(value);
                        }

                    });
                    value = value.join(',');

                    if (options.assignment) {
                        if (value) value = variable.name + '=' + value;
                        else {
                            value = variable.name;
                            if (options.assignEmpty) value += '=';
                        }
                    }

                }

                return value;
            });

            parts = parts.filter(isDefined);
            if (isDefined(parts)) {
                str += options.prefix;
                str += parts.join(options.seperator);
            }

            str += glues[pieceIndex + 1];
            return true;
        })) return false;

        return str;
    }; //stringify

} //UriTemplate
},{}],4:[function(require,module,exports){
/* jshint node:true */

module.exports = {
    Router: require('./Router'),
    UriTemplate: require('./UriTemplate')
};
},{"./Router":2,"./UriTemplate":3}],5:[function(require,module,exports){
'use strict';

/**
 * @deprecated The halClient service is deprecated. Please use $http directly instead.
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var HalClient = function () {
  /**
   * @param {Log}      $log
   * @param {Http}     $http
   * @param {Function} LinkHeader
   * @param {Object}   $halConfiguration
   */

  function HalClient($log, $http, LinkHeader, $halConfiguration) {
    _classCallCheck(this, HalClient);

    this._$log = $log;
    this._$http = $http;
    this._$halConfiguration = $halConfiguration;
    this.LinkHeader = LinkHeader;
  }

  _createClass(HalClient, [{
    key: '$get',
    value: function $get(href, options) {
      return this.$request('GET', href, options);
    }
  }, {
    key: '$post',
    value: function $post(href, options, data) {
      return this.$request('POST', href, options, data);
    }
  }, {
    key: '$put',
    value: function $put(href, options, data) {
      return this.$request('PUT', href, options, data);
    }
  }, {
    key: '$patch',
    value: function $patch(href, options, data) {
      return this.$request('PATCH', href, options, data);
    }
  }, {
    key: '$delete',
    value: function $delete(href, options) {
      return this.$request('DELETE', href, options);
    }
  }, {
    key: '$link',
    value: function $link(href, options, linkHeaders) {
      options = options || {};
      options.headers = options.headers || {};
      options.headers.Link = linkHeaders.map(function (link) {
        return link.toString();
      });
      return this.$request('LINK', href, options);
    }
  }, {
    key: '$unlink',
    value: function $unlink(href, options, linkHeaders) {
      options = options || {};
      options.headers = options.headers || {};
      options.headers.Link = linkHeaders.map(function (link) {
        return link.toString();
      });
      return this.$request('UNLINK', href, options);
    }
  }, {
    key: '$request',
    value: function $request(method, href, options, data) {
      options = options || {};
      this._$log.log('The halClient service is deprecated. Please use $http directly instead.');
      return this._$http(angular.extend({}, options, {
        method: method,
        url: this._$halConfiguration.urlTransformer(href),
        data: data
      }));
    }
  }]);

  return HalClient;
}();

// Inject Dependencies


exports.default = HalClient;
HalClient.$inject = ['$log', '$http', 'LinkHeader', '$halConfiguration'];

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _halClient = require('./hal-client');

var _halClient2 = _interopRequireDefault(_halClient);

var _linkHeader = require('./link-header');

var _linkHeader2 = _interopRequireDefault(_linkHeader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE_NAME = 'angular-hal.client';

// Add module for client
angular.module(MODULE_NAME, []).service('halClient', _halClient2.default).service('$halClient', _halClient2.default).value('LinkHeader', _linkHeader2.default);

exports.default = MODULE_NAME;

},{"./hal-client":5,"./link-header":7}],7:[function(require,module,exports){
'use strict';

/**
 * Link Header
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LinkHeader = function () {
  /**
   * @param {String} uriReference The Link Value
   * @param {Object} linkParams   The Link Params
   */

  function LinkHeader(uriReference, linkParams) {
    _classCallCheck(this, LinkHeader);

    this.uriReference = uriReference;
    this.linkParams = angular.extend({
      rel: null,
      anchor: null,
      rev: null,
      hreflang: null,
      media: null,
      title: null,
      type: null
    }, linkParams);
  }
  /**
   * @return {String}
   */


  _createClass(LinkHeader, [{
    key: 'toString',
    value: function toString() {
      var result = '<' + this.uriReference + '>',
          params = [];

      for (var paramName in this.linkParams) {
        var paramValue = this.linkParams[paramName];
        if (paramValue) {
          params.push(paramName + '="' + paramValue + '"');
        }
      }

      if (params.length < 1) {
        return result;
      }

      result = result + ';' + params.join(';');

      return result;
    }
  }]);

  return LinkHeader;
}();

exports.default = LinkHeader;

},{}],8:[function(require,module,exports){
'use strict';

/**
 * @param {String}
 * @return {String}
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.noopUrlTransformer = noopUrlTransformer;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function noopUrlTransformer(url) {
  return url;
}

var HalConfigurationProvider = function () {
  function HalConfigurationProvider() {
    _classCallCheck(this, HalConfigurationProvider);

    this._linksAttribute = '_links';
    this._embeddedAttribute = '_embedded';
    this._ignoreAttributePrefixes = ['_', '$'];
    this._selfLink = 'self';
    this._forceJSONResource = false;
    this._urlTransformer = noopUrlTransformer;

    this.$get.$inject = ['$log'];
  }

  /**
   * @param {String} linksAttribute
   */


  _createClass(HalConfigurationProvider, [{
    key: 'setLinksAttribute',
    value: function setLinksAttribute(linksAttribute) {
      this._linksAttribute = linksAttribute;
    }

    /**
     * @param {String} embeddedAttribute
     */

  }, {
    key: 'setEmbeddedAttribute',
    value: function setEmbeddedAttribute(embeddedAttribute) {
      this._embeddedAttribute = embeddedAttribute;
    }

    /**
     * @param {String[]} ignoreAttributePrefixes
     */

  }, {
    key: 'setIgnoreAttributePrefixes',
    value: function setIgnoreAttributePrefixes(ignoreAttributePrefixes) {
      this._ignoreAttributePrefixes = ignoreAttributePrefixes;
    }

    /**
     * @param {String} ignoreAttributePrefix
     */

  }, {
    key: 'addIgnoreAttributePrefix',
    value: function addIgnoreAttributePrefix(ignoreAttributePrefix) {
      this._ignoreAttributePrefixes.push(ignoreAttributePrefix);
    }

    /**
     * @param {String} selfLink
     */

  }, {
    key: 'setSelfLink',
    value: function setSelfLink(selfLink) {
      this._selfLink = selfLink;
    }

    /**
     * @param {Boolean} forceJSONResource
     */

  }, {
    key: 'setForceJSONResource',
    value: function setForceJSONResource(forceJSONResource) {
      this._forceJSONResource = forceJSONResource;
    }

    /**
     * @param {Function} urlTransformer
     * @deprecated $halConfigurationProvider.setUrlTransformer is deprecated. Please write a http interceptor instead.
     * @see https://docs.angularjs.org/api/ng/service/$http#interceptors
     */

  }, {
    key: 'setUrlTransformer',
    value: function setUrlTransformer(urlTransformer) {
      this._urlTransformer = urlTransformer;
    }

    /**
     * Get Configuration
     * @param  {Log} $log logger
     * @return {Object}
     */

  }, {
    key: '$get',
    value: function $get($log) {
      if (this._urlTransformer !== noopUrlTransformer) {
        $log.log('$halConfigurationProvider.setUrlTransformer is deprecated. Please write a http interceptor instead.');
      }

      return Object.freeze({
        linksAttribute: this._linksAttribute,
        embeddedAttribute: this._embeddedAttribute,
        ignoreAttributePrefixes: this._ignoreAttributePrefixes,
        selfLink: this._selfLink,
        forceJSONResource: this._forceJSONResource,
        urlTransformer: this._urlTransformer
      });
    }
  }]);

  return HalConfigurationProvider;
}();

exports.default = HalConfigurationProvider;

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _halConfiguration = require('./hal-configuration.provider');

var _halConfiguration2 = _interopRequireDefault(_halConfiguration);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE_NAME = 'angular-hal.configuration';

// Add module for configuration
angular.module(MODULE_NAME, []).provider('$halConfiguration', _halConfiguration2.default);

exports.default = MODULE_NAME;

},{"./hal-configuration.provider":8}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = HttpInterceptorConfiguration;

var _resourceHttpInterceptor = require('./resource-http-interceptor.factory');

var _resourceHttpInterceptor2 = _interopRequireDefault(_resourceHttpInterceptor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {HttpProvider} $httpProvider
 */
function HttpInterceptorConfiguration($httpProvider) {
  $httpProvider.interceptors.push(_resourceHttpInterceptor2.default);
}

HttpInterceptorConfiguration.$inject = ['$httpProvider'];

},{"./resource-http-interceptor.factory":12}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../resource/index');

var _index2 = _interopRequireDefault(_index);

var _index3 = require('../configuration/index');

var _index4 = _interopRequireDefault(_index3);

var _httpInterception = require('./http-interception.config');

var _httpInterception2 = _interopRequireDefault(_httpInterception);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE_NAME = 'angular-hal.http-interception';

// Add module for http interception
angular.module(MODULE_NAME, [_index2.default, _index4.default]).config(_httpInterception2.default);

exports.default = MODULE_NAME;

},{"../configuration/index":9,"../resource/index":15,"./http-interception.config":10}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ResourceHttpInterceptorFactory;

var _contentType = require('content-type');

var CONTENT_TYPE = 'application/hal+json';

function ResourceHttpInterceptorFactory($halConfiguration, Resource) {
  return {
    request: transformRequest,
    response: transformResponse
  };

  /**
   * Add Hal Json As an accepted format
   * @param {Request} request
   * @return {Request}
   */
  function transformRequest(request) {
    if (typeof request.headers.Accept === 'undefined') {
      request.headers.Accept = CONTENT_TYPE;
    } else {
      request.headers.Accept = [CONTENT_TYPE, request.headers.Accept].join(', ');
    }

    return request;
  }

  /**
   * Transform Response
   *
   * @param {Response} response
   * @return {Response|Resource}
   */
  function transformResponse(response) {
    try {
      if ((0, _contentType.parse)(response.headers('Content-Type')).type === CONTENT_TYPE) {
        return transformResponseToResource(response);
      }
    } catch (e) {
      // The parse function could throw an error, we do not want that.
    }
    if (response.config.forceHal) {
      return transformResponseToResource(response);
    }
    if ((response.headers('Content-Type') === 'application/json' || response.headers('Content-Type') === null) && $halConfiguration.forceJSONResource) {
      return transformResponseToResource(response);
    }

    return response;
  }
  function transformResponseToResource(response) {
    return new Resource(response.data, response);
  }
}

ResourceHttpInterceptorFactory.$inject = ['$halConfiguration', 'Resource'];

},{"content-type":1}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('./http-interception/index');

var _index2 = _interopRequireDefault(_index);

var _index3 = require('./client/index');

var _index4 = _interopRequireDefault(_index3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE_NAME = 'angular-hal';

// Combine needed Modules
angular.module(MODULE_NAME, [_index2.default, _index4.default]);

exports.default = MODULE_NAME;

},{"./client/index":6,"./http-interception/index":11}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = HalResourceClientFactory;

var _extendReadOnly = require('../utility/extend-read-only');

var _extendReadOnly2 = _interopRequireDefault(_extendReadOnly);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Factory for HalResourceClient
 * @param {Q}        $q
 * @param {Injector} $injector Prevent Circular Dependency by injecting $injector instead of $http
 * @param {Object}   $halConfiguration
 */
function HalResourceClientFactory($q, $injector, $halConfiguration, $log) {
  return HalResourceClient;

  /**
   * @param {Resource} resource
   * @param {Object}   links
   * @param {Object}   embedded
   */
  function HalResourceClient(resource, embedded) {
    var self = this,
        $http = $injector.get('$http');

    /**
     * Initialize the client
     */
    (function init() {
      (0, _extendReadOnly2.default)(self, {
        $request: $request,
        $get: $get,
        $getCollection: $getCollection,
        $post: $post,
        $put: $put,
        $patch: $patch,
        $delete: $delete,
        $del: $delete,
        $link: $link,
        $unlink: $unlink
      });
    })();

    /**
     * Execute a HTTP request against a link
     *
     * @param {String}      method
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {mixed|null}  body
     * @param {Object}      options
     * @return {Promise}
     */
    function $request(method, rel, urlParams, body, options) {
      var promises;

      method = method || 'GET';
      rel = rel || $halConfiguration.selfLink;
      urlParams = urlParams || {};
      body = body || null;
      options = options || {};

      if (method === 'GET' && rel === $halConfiguration.selfLink) {
        return $q.resolve(resource);
      }

      if (resource.$hasEmbedded(rel) && Array.isArray(embedded[rel])) {
        promises = [];
        for (var i = 0; i < embedded[rel].length; i++) {
          promises.push(embedded[rel][i].$request().$request(method, 'self', urlParams, body, options));
        }
        return $q.all(promises);
      }

      if (resource.$hasEmbedded(rel)) {
        return embedded[rel].$request().$request(method, 'self', urlParams, body, options);
      }

      if (resource.$hasLink(rel)) {
        var url = resource.$href(rel, urlParams);

        angular.extend(options, {
          method: method,
          data: body
        });

        if (Array.isArray(url)) {
          promises = [];
          for (var j = 0; j < url.length; j++) {
            promises.push($http(angular.extend({}, options, { url: url[j] })));
          }
          return $q.all(promises);
        }

        return $http(angular.extend({}, options, {
          url: resource.$href(rel, urlParams)
        }));
      }

      var error = new Error('link "' + rel + '" is undefined');
      $log.error(error);
      return $q.reject(error);
    }

    /**
     * Execute a HTTP GET request against a link or
     * load an embedded resource
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    function $get(rel, urlParams, options) {
      return $request('GET', rel, urlParams, undefined, options);
    }

    /**
     * Execute a HTTP GET request against a link or
     * load an embedded resource
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    function $getCollection(rel, urlParams, options) {
      return $get(rel, urlParams, options).then(function (resource) {
        if (!resource.$hasEmbedded(rel)) {
          return [];
        } else {
          return resource.$request().$get(rel);
        }
      });
    }

    /**
     * Execute a HTTP POST request against a link
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {mixed|null}  body
     * @param {Object}      options
     * @return {Promise}
     */
    function $post(rel, urlParams, body, options) {
      return $request('POST', rel, urlParams, body, options);
    }

    /**
     * Execute a HTTP PUT request against a link
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {mixed|null}  body
     * @param {Object}      options
     * @return {Promise}
     */
    function $put(rel, urlParams, body, options) {
      return $request('PUT', rel, urlParams, body, options);
    }

    /**
     * Execute a HTTP PATCH request against a link
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {mixed|null}  body
     * @param {Object}      options
     * @return {Promise}
     */
    function $patch(rel, urlParams, body, options) {
      return $request('PATCH', rel, urlParams, body, options);
    }

    /**
     * Execute a HTTP DELEET request against a link
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    function $delete(rel, urlParams, options) {
      return $request('DELETE', rel, urlParams, undefined, options);
    }

    /**
     * Execute a HTTP LINK request against a link
     *
     * @param {String}       rel
     * @param {Object|null}  urlParams
     * @param {LinkHeader[]} body
     * @param {Object}       options
     * @return {Promise}
     */
    function $link(rel, urlParams, links, options) {
      options = options || {};
      options.headers = options.headers || {};
      options.headers.Link = links.map(toStringItem);
      return $request('LINK', rel, urlParams, undefined, options);
    }

    /**
     * Execute a HTTP UNLINK request against a link
     *
     * @param {String}       rel
     * @param {Object|null}  urlParams
     * @param {LinkHeader[]} body
     * @param {Object}       options
     * @return {Promise}
     */
    function $unlink(rel, urlParams, links, options) {
      options = options || {};
      options.headers = options.headers || {};
      options.headers.Link = links.map(toStringItem);
      return $request('UNLINK', rel, urlParams, undefined, options);
    }

    /**
     * @param {mixed} item
     * @return {String}
     */
    function toStringItem(item) {
      return item.toString();
    }
  }
}

HalResourceClientFactory.$inject = ['$q', '$injector', '$halConfiguration', '$log'];

},{"../utility/extend-read-only":18}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = require('../configuration/index');

var _index2 = _interopRequireDefault(_index);

var _resource = require('./resource.factory');

var _resource2 = _interopRequireDefault(_resource);

var _halResourceClient = require('./hal-resource-client.factory');

var _halResourceClient2 = _interopRequireDefault(_halResourceClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE_NAME = 'angular-hal.resource';

// Add module for resource
angular.module(MODULE_NAME, [_index2.default]).factory('Resource', _resource2.default).factory('HalResourceClient', _halResourceClient2.default);

exports.default = MODULE_NAME;

},{"../configuration/index":9,"./hal-resource-client.factory":14,"./resource.factory":16}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.default = ResourceFactory;

var _extendReadOnly = require('../utility/extend-read-only');

var _extendReadOnly2 = _interopRequireDefault(_extendReadOnly);

var _defineReadOnly = require('../utility/define-read-only');

var _defineReadOnly2 = _interopRequireDefault(_defineReadOnly);

var _generateUrl = require('../utility/generate-url');

var _generateUrl2 = _interopRequireDefault(_generateUrl);

var _normalizeLink = require('../utility/normalize-link');

var _normalizeLink2 = _interopRequireDefault(_normalizeLink);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Factory for Resource
 *
 * @param {Function} HalResourceClient
 * @param {Object}   $halConfiguration
 * @param {Log}      $log
 */
function ResourceFactory(HalResourceClient, $halConfiguration, $log) {
  return Resource;

  /**
   * @param {Object} data
   * @param {Object} response
   */
  function Resource(data, response) {
    var self = this,
        links = {},
        embedded = {},
        client;

    /**
     * Initialize the Resource
     */
    (function init() {
      if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object' || data === null) {
        data = {};
      }
      initializeData();
      initializeEmbedded();
      initializeLinks();
      inititalizeClient();

      (0, _extendReadOnly2.default)(self, {
        $hasLink: $hasLink,
        $hasEmbedded: $hasEmbedded,
        $has: $has,
        $href: $href,
        $meta: $meta,
        $link: $link,
        $request: $request,
        $response: $response,
        $put: $put,
        $delete: $delete
      });
    })();

    /**
     * Add all data from data to itself
     */
    function initializeData() {
      for (var propertyName in data) {
        if (!data.hasOwnProperty(propertyName)) {
          continue;
        }
        if (isMetaProperty(propertyName)) {
          continue;
        }
        self[propertyName] = data[propertyName];
        //defineReadOnly(self, propertyName, data[propertyName]);
      }
    }

    /**
     * Normalize all Links
     */
    function initializeLinks() {
      if (_typeof(data[$halConfiguration.linksAttribute]) !== 'object') {
        return;
      }

      Object.keys(data[$halConfiguration.linksAttribute]).forEach(function (rel) {
        var link = data[$halConfiguration.linksAttribute][rel];
        links[rel] = (0, _normalizeLink2.default)(response.config.url, link);
      });
    }

    /**
     * Normalize Embedded Contents
     */
    function initializeEmbedded() {
      if (_typeof(data[$halConfiguration.embeddedAttribute]) !== 'object') {
        return;
      }

      Object.keys(data[$halConfiguration.embeddedAttribute]).forEach(function (rel) {
        embedResource(rel, data[$halConfiguration.embeddedAttribute][rel]);
      });
    }

    /**
     * Initialize the HTTP CLIENT
     */
    function inititalizeClient() {
      client = new HalResourceClient(self, embedded);
    }

    /**
     * Embed a resource(s)
     *
     * @param {String}          rel
     * @param {Object|Object[]} resources
     */
    function embedResource(rel, resources) {
      if (Array.isArray(resources)) {
        embedded[rel] = [];
        resources.forEach(function (resource) {
          embedded[rel].push(new Resource(resource, response));
        });
        return;
      }
      embedded[rel] = new Resource(resources, response);
    }

    /**
     * Determine if a property name is a meta property
     * @param {String} propertyName
     * @return {Boolean}
     */
    function isMetaProperty(propertyName) {
      for (var i = 0; i < $halConfiguration.ignoreAttributePrefixes.length; i++) {
        if (propertyName.substr(0, 1) === $halConfiguration.ignoreAttributePrefixes[i]) {
          return true;
        }
        if (propertyName === $halConfiguration.linksAttribute || propertyName === $halConfiguration.embeddedAttribute) {
          return true;
        }
      }
      return false;
    }

    /**
     * @param {String} rel
     * @return {Boolean}
     */
    function $hasLink(rel) {
      return typeof links[rel] !== 'undefined';
    }

    /**
     * @param {String} rel
     * @return {Boolean}
     */
    function $hasEmbedded(rel) {
      return typeof embedded[rel] !== 'undefined';
    }

    /**
     * @param {String} rel
     * @return {Boolean}
     */
    function $has(rel) {
      return $hasLink(rel) || $hasEmbedded(rel);
    }

    /**
     * Get the href of a Link
     *
     * @param {String} rel
     * @param {Object} parameters
     * @return {String}
     */
    function $href(rel, parameters) {
      var link = $link(rel),
          href = link.href;

      if (Array.isArray(link)) {
        href = [];
        for (var i = 0; i < link.length; i++) {
          var subLink = link[i],
              subHref = subLink.href;
          if (typeof subLink.templated !== 'undefined' && subLink.templated) {
            subHref = (0, _generateUrl2.default)(subLink.href, parameters);
          }
          subHref = $halConfiguration.urlTransformer(subHref);
          href.push(subHref);
        }
      } else {
        if (typeof link.templated !== 'undefined' && link.templated) {
          href = (0, _generateUrl2.default)(link.href, parameters);
        }

        href = $halConfiguration.urlTransformer(href);
      }

      return href;
    }

    /**
     * Get a link
     *
     * !! To get a href, use $href instead !!
     *
     * @param {String} rel
     * @return {Object}
     */
    function $link(rel) {
      if (!$hasLink(rel)) {
        throw new Error('link "' + rel + '" is undefined');
      }
      var link = links[rel];

      if (typeof link.deprecation !== 'undefined') {
        $log.warn('The link "' + rel + '" is marked as deprecated with the value "' + link.deprecation + '".');
      }

      return link;
    }

    /**
     * Get meta properties
     *
     * !! To get a href, use $href instead !!
     * !! To get a link, use $link instead !!
     * !! To get an embedded resource, use $request().$get(rel) instead !!
     *
     * @param {String} rel
     * @return {Object}
     */
    function $meta(name) {
      for (var i = 0; i < $halConfiguration.ignoreAttributePrefixes.length; i++) {
        var fullName = $halConfiguration.ignoreAttributePrefixes[i] + name;
        return data[fullName];
      }
    }

    /**
     * Get the Original Response
     *
     * @return {Object)}
     */
    function $response() {
      return response;
    }

    /**
     * Get the client to perform requests
     *
     * @return {HalResourceClient)}
     */
    function $request() {
      return client;
    }

    /**
     * Execute a HTTP DELETE request on self
     *
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    function $delete(urlParams, options) {
      return client.$delete($halConfiguration.selfLink, urlParams, options);
    }

    /**
     * Execute a HTTP PUT request on self
     *
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    function $put(payload, urlParams, options) {
      return client.$put($halConfiguration.selfLink, urlParams, payload, options);
    }

    /**
     * Execute a HTTP GET request on self
     *
     * @param {String}      rel
     * @param {Object|null} urlParams
     * @param {Object}      options
     * @return {Promise}
     */
    function $get(urlParams, options) {
      return $request('GET', $halConfiguration.selfLink, urlParams, undefined, options);
    }
  }
}
ResourceFactory.$inject = ['HalResourceClient', '$halConfiguration', '$log'];

},{"../utility/define-read-only":17,"../utility/extend-read-only":18,"../utility/generate-url":19,"../utility/normalize-link":20}],17:[function(require,module,exports){
'use strict';

/**
 * Define read-only property in target
 * @param {Object} target
 * @param {String} key
 * @param {mixed}  value
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = defineReadOnly;
function defineReadOnly(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: false,
    enumerable: true,
    value: value,
    writable: false
  });
}

},{}],18:[function(require,module,exports){
'use strict';

/**
 * Extend properties from copy read-only to target
 * @param {Object} target
 * @param {Object} copy
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = extendReadOnly;
function extendReadOnly(target, copy) {
  for (var key in copy) {
    Object.defineProperty(target, key, {
      configurable: false,
      enumerable: false,
      value: copy[key]
    });
  }
}

},{}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = generateUrl;

var _main = require('rfc6570/src/main');

var _main2 = _interopRequireDefault(_main);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Generate url from template
 *
 * @param  {String} template
 * @param  {Object} parameters
 * @return {String}
 */
function generateUrl(template, parameters) {
  return new _main2.default.UriTemplate(template).stringify(parameters);
}

},{"rfc6570/src/main":4}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalizeLink;

var _resolveUrl = require('../utility/resolve-url');

var _resolveUrl2 = _interopRequireDefault(_resolveUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {String} baseUrl
 * @param {mixed}  link
 * @return {Object}
 */
function normalizeLink(baseUrl, link) {
  if (Array.isArray(link)) {
    return link.map(function (item) {
      return normalizeLink(baseUrl, item);
    });
  }
  if (typeof link === 'string') {
    return {
      href: (0, _resolveUrl2.default)(baseUrl, link)
    };
  }
  if (typeof link.href === 'string') {
    link.href = (0, _resolveUrl2.default)(baseUrl, link.href);
    return link;
  }
  if (Array.isArray(link.href)) {
    return link.href.map(function (href) {
      var newLink = angular.extend({}, link, {
        href: href
      });
      return normalizeLink(baseUrl, newLink);
    });
  }
  return {
    href: baseUrl
  };
}

},{"../utility/resolve-url":21}],21:[function(require,module,exports){
'use strict';

/**
 * Resolve whole URL
 *
 * @param {String} baseUrl
 * @param {String} path
 * @return {String}
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = resolveUrl;
function resolveUrl(baseUrl, path) {
  var resultHref = '',
      reFullUrl = /^((?:\w+\:)?)((?:\/\/)?)([^\/]*)((?:\/.*)?)$/,
      baseHrefMatch = reFullUrl.exec(baseUrl),
      hrefMatch = reFullUrl.exec(path);

  for (var partIndex = 1; partIndex < 5; partIndex++) {
    if (hrefMatch[partIndex]) {
      resultHref += hrefMatch[partIndex];
    } else {
      resultHref += baseHrefMatch[partIndex];
    }
  }

  return resultHref;
}

},{}]},{},[13])(13)
});
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY29udGVudC10eXBlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JmYzY1NzAvc3JjL1JvdXRlci5qcyIsIm5vZGVfbW9kdWxlcy9yZmM2NTcwL3NyYy9VcmlUZW1wbGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9yZmM2NTcwL3NyYy9tYWluLmpzIiwic3JjL2NsaWVudC9oYWwtY2xpZW50LmpzIiwic3JjL2NsaWVudC9pbmRleC5qcyIsInNyYy9jbGllbnQvbGluay1oZWFkZXIuanMiLCJzcmMvY29uZmlndXJhdGlvbi9oYWwtY29uZmlndXJhdGlvbi5wcm92aWRlci5qcyIsInNyYy9jb25maWd1cmF0aW9uL2luZGV4LmpzIiwic3JjL2h0dHAtaW50ZXJjZXB0aW9uL2h0dHAtaW50ZXJjZXB0aW9uLmNvbmZpZy5qcyIsInNyYy9odHRwLWludGVyY2VwdGlvbi9pbmRleC5qcyIsInNyYy9odHRwLWludGVyY2VwdGlvbi9yZXNvdXJjZS1odHRwLWludGVyY2VwdG9yLmZhY3RvcnkuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvcmVzb3VyY2UvaGFsLXJlc291cmNlLWNsaWVudC5mYWN0b3J5LmpzIiwic3JjL3Jlc291cmNlL2luZGV4LmpzIiwic3JjL3Jlc291cmNlL3Jlc291cmNlLmZhY3RvcnkuanMiLCJzcmMvdXRpbGl0eS9kZWZpbmUtcmVhZC1vbmx5LmpzIiwic3JjL3V0aWxpdHkvZXh0ZW5kLXJlYWQtb25seS5qcyIsInNyYy91dGlsaXR5L2dlbmVyYXRlLXVybC5qcyIsInNyYy91dGlsaXR5L25vcm1hbGl6ZS1saW5rLmpzIiwic3JjL3V0aWxpdHkvcmVzb2x2ZS11cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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RUksZ0JBQWdCLFVBQVUsSUFBVixDQUFlLE9BQWYsQ0FGcEI7TUFHSSxZQUFZLFVBQVUsSUFBVixDQUFlLElBQWYsQ0FIaEI7O0FBS0EsT0FBSyxJQUFJLFlBQVksQ0FBckIsRUFBd0IsWUFBWSxDQUFwQyxFQUF1QyxXQUF2QyxFQUFvRDtBQUNsRCxRQUFJLFVBQVUsU0FBVixDQUFKLEVBQTBCO0FBQ3hCLG9CQUFjLFVBQVUsU0FBVixDQUFkO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsb0JBQWMsY0FBYyxTQUFkLENBQWQ7QUFDRDtBQUNGOztBQUVELFNBQU8sVUFBUDtBQUNEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogY29udGVudC10eXBlXG4gKiBDb3B5cmlnaHQoYykgMjAxNSBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyoqXG4gKiBSZWdFeHAgdG8gbWF0Y2ggKiggXCI7XCIgcGFyYW1ldGVyICkgaW4gUkZDIDcyMzEgc2VjIDMuMS4xLjFcbiAqXG4gKiBwYXJhbWV0ZXIgICAgID0gdG9rZW4gXCI9XCIgKCB0b2tlbiAvIHF1b3RlZC1zdHJpbmcgKVxuICogdG9rZW4gICAgICAgICA9IDEqdGNoYXJcbiAqIHRjaGFyICAgICAgICAgPSBcIiFcIiAvIFwiI1wiIC8gXCIkXCIgLyBcIiVcIiAvIFwiJlwiIC8gXCInXCIgLyBcIipcIlxuICogICAgICAgICAgICAgICAvIFwiK1wiIC8gXCItXCIgLyBcIi5cIiAvIFwiXlwiIC8gXCJfXCIgLyBcImBcIiAvIFwifFwiIC8gXCJ+XCJcbiAqICAgICAgICAgICAgICAgLyBESUdJVCAvIEFMUEhBXG4gKiAgICAgICAgICAgICAgIDsgYW55IFZDSEFSLCBleGNlcHQgZGVsaW1pdGVyc1xuICogcXVvdGVkLXN0cmluZyA9IERRVU9URSAqKCBxZHRleHQgLyBxdW90ZWQtcGFpciApIERRVU9URVxuICogcWR0ZXh0ICAgICAgICA9IEhUQUIgLyBTUCAvICV4MjEgLyAleDIzLTVCIC8gJXg1RC03RSAvIG9icy10ZXh0XG4gKiBvYnMtdGV4dCAgICAgID0gJXg4MC1GRlxuICogcXVvdGVkLXBhaXIgICA9IFwiXFxcIiAoIEhUQUIgLyBTUCAvIFZDSEFSIC8gb2JzLXRleHQgKVxuICovXG52YXIgcGFyYW1SZWdFeHAgPSAvOyAqKFshIyQlJidcXCpcXCtcXC1cXC5cXF5fYFxcfH4wLTlBLVphLXpdKykgKj0gKihcIig/OltcXHUwMDBiXFx1MDAyMFxcdTAwMjFcXHUwMDIzLVxcdTAwNWJcXHUwMDVkLVxcdTAwN2VcXHUwMDgwLVxcdTAwZmZdfFxcXFxbXFx1MDAwYlxcdTAwMjAtXFx1MDBmZl0pKlwifFshIyQlJidcXCpcXCtcXC1cXC5cXF5fYFxcfH4wLTlBLVphLXpdKykgKi9nXG52YXIgdGV4dFJlZ0V4cCA9IC9eW1xcdTAwMGJcXHUwMDIwLVxcdTAwN2VcXHUwMDgwLVxcdTAwZmZdKyQvXG52YXIgdG9rZW5SZWdFeHAgPSAvXlshIyQlJidcXCpcXCtcXC1cXC5cXF5fYFxcfH4wLTlBLVphLXpdKyQvXG5cbi8qKlxuICogUmVnRXhwIHRvIG1hdGNoIHF1b3RlZC1wYWlyIGluIFJGQyA3MjMwIHNlYyAzLjIuNlxuICpcbiAqIHF1b3RlZC1wYWlyID0gXCJcXFwiICggSFRBQiAvIFNQIC8gVkNIQVIgLyBvYnMtdGV4dCApXG4gKiBvYnMtdGV4dCAgICA9ICV4ODAtRkZcbiAqL1xudmFyIHFlc2NSZWdFeHAgPSAvXFxcXChbXFx1MDAwYlxcdTAwMjAtXFx1MDBmZl0pL2dcblxuLyoqXG4gKiBSZWdFeHAgdG8gbWF0Y2ggY2hhcnMgdGhhdCBtdXN0IGJlIHF1b3RlZC1wYWlyIGluIFJGQyA3MjMwIHNlYyAzLjIuNlxuICovXG52YXIgcXVvdGVSZWdFeHAgPSAvKFtcXFxcXCJdKS9nXG5cbi8qKlxuICogUmVnRXhwIHRvIG1hdGNoIHR5cGUgaW4gUkZDIDY4MzhcbiAqXG4gKiBtZWRpYS10eXBlID0gdHlwZSBcIi9cIiBzdWJ0eXBlXG4gKiB0eXBlICAgICAgID0gdG9rZW5cbiAqIHN1YnR5cGUgICAgPSB0b2tlblxuICovXG52YXIgdHlwZVJlZ0V4cCA9IC9eWyEjJCUmJ1xcKlxcK1xcLVxcLlxcXl9gXFx8fjAtOUEtWmEtel0rXFwvWyEjJCUmJ1xcKlxcK1xcLVxcLlxcXl9gXFx8fjAtOUEtWmEtel0rJC9cblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqIEBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLmZvcm1hdCA9IGZvcm1hdFxuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXG5cbi8qKlxuICogRm9ybWF0IG9iamVjdCB0byBtZWRpYSB0eXBlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqIEBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBmb3JtYXQob2JqKSB7XG4gIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgb2JqIGlzIHJlcXVpcmVkJylcbiAgfVxuXG4gIHZhciBwYXJhbWV0ZXJzID0gb2JqLnBhcmFtZXRlcnNcbiAgdmFyIHR5cGUgPSBvYmoudHlwZVxuXG4gIGlmICghdHlwZSB8fCAhdHlwZVJlZ0V4cC50ZXN0KHR5cGUpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaW52YWxpZCB0eXBlJylcbiAgfVxuXG4gIHZhciBzdHJpbmcgPSB0eXBlXG5cbiAgLy8gYXBwZW5kIHBhcmFtZXRlcnNcbiAgaWYgKHBhcmFtZXRlcnMgJiYgdHlwZW9mIHBhcmFtZXRlcnMgPT09ICdvYmplY3QnKSB7XG4gICAgdmFyIHBhcmFtXG4gICAgdmFyIHBhcmFtcyA9IE9iamVjdC5rZXlzKHBhcmFtZXRlcnMpLnNvcnQoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhcmFtID0gcGFyYW1zW2ldXG5cbiAgICAgIGlmICghdG9rZW5SZWdFeHAudGVzdChwYXJhbSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaW52YWxpZCBwYXJhbWV0ZXIgbmFtZScpXG4gICAgICB9XG5cbiAgICAgIHN0cmluZyArPSAnOyAnICsgcGFyYW0gKyAnPScgKyBxc3RyaW5nKHBhcmFtZXRlcnNbcGFyYW1dKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzdHJpbmdcbn1cblxuLyoqXG4gKiBQYXJzZSBtZWRpYSB0eXBlIHRvIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHN0cmluZ1xuICogQHJldHVybiB7T2JqZWN0fVxuICogQHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cmluZykge1xuICBpZiAoIXN0cmluZykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHN0cmluZyBpcyByZXF1aXJlZCcpXG4gIH1cblxuICBpZiAodHlwZW9mIHN0cmluZyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBzdXBwb3J0IHJlcS9yZXMtbGlrZSBvYmplY3RzIGFzIGFyZ3VtZW50XG4gICAgc3RyaW5nID0gZ2V0Y29udGVudHR5cGUoc3RyaW5nKVxuXG4gICAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjb250ZW50LXR5cGUgaGVhZGVyIGlzIG1pc3NpbmcgZnJvbSBvYmplY3QnKTtcbiAgICB9XG4gIH1cblxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzdHJpbmcgaXMgcmVxdWlyZWQgdG8gYmUgYSBzdHJpbmcnKVxuICB9XG5cbiAgdmFyIGluZGV4ID0gc3RyaW5nLmluZGV4T2YoJzsnKVxuICB2YXIgdHlwZSA9IGluZGV4ICE9PSAtMVxuICAgID8gc3RyaW5nLnN1YnN0cigwLCBpbmRleCkudHJpbSgpXG4gICAgOiBzdHJpbmcudHJpbSgpXG5cbiAgaWYgKCF0eXBlUmVnRXhwLnRlc3QodHlwZSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIG1lZGlhIHR5cGUnKVxuICB9XG5cbiAgdmFyIGtleVxuICB2YXIgbWF0Y2hcbiAgdmFyIG9iaiA9IG5ldyBDb250ZW50VHlwZSh0eXBlLnRvTG93ZXJDYXNlKCkpXG4gIHZhciB2YWx1ZVxuXG4gIHBhcmFtUmVnRXhwLmxhc3RJbmRleCA9IGluZGV4XG5cbiAgd2hpbGUgKG1hdGNoID0gcGFyYW1SZWdFeHAuZXhlYyhzdHJpbmcpKSB7XG4gICAgaWYgKG1hdGNoLmluZGV4ICE9PSBpbmRleCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaW52YWxpZCBwYXJhbWV0ZXIgZm9ybWF0JylcbiAgICB9XG5cbiAgICBpbmRleCArPSBtYXRjaFswXS5sZW5ndGhcbiAgICBrZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpXG4gICAgdmFsdWUgPSBtYXRjaFsyXVxuXG4gICAgaWYgKHZhbHVlWzBdID09PSAnXCInKSB7XG4gICAgICAvLyByZW1vdmUgcXVvdGVzIGFuZCBlc2NhcGVzXG4gICAgICB2YWx1ZSA9IHZhbHVlXG4gICAgICAgIC5zdWJzdHIoMSwgdmFsdWUubGVuZ3RoIC0gMilcbiAgICAgICAgLnJlcGxhY2UocWVzY1JlZ0V4cCwgJyQxJylcbiAgICB9XG5cbiAgICBvYmoucGFyYW1ldGVyc1trZXldID0gdmFsdWVcbiAgfVxuXG4gIGlmIChpbmRleCAhPT0gLTEgJiYgaW5kZXggIT09IHN0cmluZy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIHBhcmFtZXRlciBmb3JtYXQnKVxuICB9XG5cbiAgcmV0dXJuIG9ialxufVxuXG4vKipcbiAqIEdldCBjb250ZW50LXR5cGUgZnJvbSByZXEvcmVzIG9iamVjdHMuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGdldGNvbnRlbnR0eXBlKG9iaikge1xuICBpZiAodHlwZW9mIG9iai5nZXRIZWFkZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyByZXMtbGlrZVxuICAgIHJldHVybiBvYmouZ2V0SGVhZGVyKCdjb250ZW50LXR5cGUnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmouaGVhZGVycyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyByZXEtbGlrZVxuICAgIHJldHVybiBvYmouaGVhZGVycyAmJiBvYmouaGVhZGVyc1snY29udGVudC10eXBlJ11cbiAgfVxufVxuXG4vKipcbiAqIFF1b3RlIGEgc3RyaW5nIGlmIG5lY2Vzc2FyeS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKiBAcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHFzdHJpbmcodmFsKSB7XG4gIHZhciBzdHIgPSBTdHJpbmcodmFsKVxuXG4gIC8vIG5vIG5lZWQgdG8gcXVvdGUgdG9rZW5zXG4gIGlmICh0b2tlblJlZ0V4cC50ZXN0KHN0cikpIHtcbiAgICByZXR1cm4gc3RyXG4gIH1cblxuICBpZiAoc3RyLmxlbmd0aCA+IDAgJiYgIXRleHRSZWdFeHAudGVzdChzdHIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaW52YWxpZCBwYXJhbWV0ZXIgdmFsdWUnKVxuICB9XG5cbiAgcmV0dXJuICdcIicgKyBzdHIucmVwbGFjZShxdW90ZVJlZ0V4cCwgJ1xcXFwkMScpICsgJ1wiJ1xufVxuXG4vKipcbiAqIENsYXNzIHRvIHJlcHJlc2VudCBhIGNvbnRlbnQgdHlwZS5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIENvbnRlbnRUeXBlKHR5cGUpIHtcbiAgdGhpcy5wYXJhbWV0ZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICB0aGlzLnR5cGUgPSB0eXBlXG59XG4iLCIvKiBqc2hpbnQgbm9kZTp0cnVlICovXG5cbnZhciBVcmlUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vVXJpVGVtcGxhdGUnKTtcblxuZnVuY3Rpb24gUm91dGVyKCkge1xuICAgIHZhciByb3V0ZXMgPSBbXTtcblxuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24gKHRlbXBsYXRlLCBoYW5kbGVyKSB7XG5cbiAgICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICAgICAgdGVtcGxhdGU6IG5ldyBVcmlUZW1wbGF0ZSh0ZW1wbGF0ZSksXG4gICAgICAgICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgICAgIH0pOyAvL1xuXG4gICAgfTsgLy9hZGRcblxuICAgIHRoaXMuaGFuZGxlID0gZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHJldHVybiByb3V0ZXMuc29tZShmdW5jdGlvbiAocm91dGUpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcm91dGUudGVtcGxhdGUucGFyc2UodXJsKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhICYmIHJvdXRlLmhhbmRsZXIoZGF0YSkgIT09IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgIH07IC8vZXhlY1xuXG59IC8vUm91dGVyXG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyOyIsIi8qIGpzaGludCBub2RlOnRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBVcmlUZW1wbGF0ZTtcblxuXG52YXIgb3BlcmF0b3JPcHRpb25zID0ge1xuICAgIFwiXCI6IHtcbiAgICAgICAgXCJwcmVmaXhcIjogXCJcIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCIsXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiBmYWxzZSxcbiAgICAgICAgXCJhc3NpZ25FbXB0eVwiOiBmYWxzZSxcbiAgICAgICAgXCJlbmNvZGVcIjogcGVyY2VudEVuY29kZVxuICAgIH0sXG4gICAgXCIrXCI6IHtcbiAgICAgICAgXCJwcmVmaXhcIjogXCJcIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCIsXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiBmYWxzZSxcbiAgICAgICAgXCJhc3NpZ25FbXB0eVwiOiBmYWxzZSxcbiAgICAgICAgXCJlbmNvZGVcIjogZW5jb2RlVVJJXG4gICAgfSxcbiAgICBcIiNcIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIiNcIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCIsXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiBmYWxzZSxcbiAgICAgICAgXCJhc3NpZ25FbXB0eVwiOiBmYWxzZSxcbiAgICAgICAgXCJlbmNvZGVcIjogZW5jb2RlVVJJXG4gICAgfSxcbiAgICBcIi5cIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIi5cIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCIuXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiBmYWxzZSxcbiAgICAgICAgXCJhc3NpZ25FbXB0eVwiOiBmYWxzZSxcbiAgICAgICAgXCJlbmNvZGVcIjogcGVyY2VudEVuY29kZVxuICAgIH0sXG4gICAgXCIvXCI6IHtcbiAgICAgICAgXCJwcmVmaXhcIjogXCIvXCIsXG4gICAgICAgIFwic2VwZXJhdG9yXCI6IFwiL1wiLFxuICAgICAgICBcImFzc2lnbm1lbnRcIjogZmFsc2UsXG4gICAgICAgIFwiZW5jb2RlXCI6IGVuY29kZVVSSUNvbXBvbmVudFxuICAgIH0sXG4gICAgXCI7XCI6IHtcbiAgICAgICAgXCJwcmVmaXhcIjogXCI7XCIsXG4gICAgICAgIFwic2VwZXJhdG9yXCI6IFwiO1wiLFxuICAgICAgICBcImFzc2lnbm1lbnRcIjogdHJ1ZSxcbiAgICAgICAgXCJhc3NpZ25FbXB0eVwiOiBmYWxzZSxcbiAgICAgICAgXCJlbmNvZGVcIjogZW5jb2RlVVJJQ29tcG9uZW50XG4gICAgfSxcbiAgICBcIj9cIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIj9cIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCImXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiB0cnVlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IHRydWUsXG4gICAgICAgIFwiZW5jb2RlXCI6IGVuY29kZVVSSUNvbXBvbmVudFxuICAgIH0sXG4gICAgXCImXCI6IHtcbiAgICAgICAgXCJwcmVmaXhcIjogXCImXCIsXG4gICAgICAgIFwic2VwZXJhdG9yXCI6IFwiJlwiLFxuICAgICAgICBcImFzc2lnbm1lbnRcIjogdHJ1ZSxcbiAgICAgICAgXCJhc3NpZ25FbXB0eVwiOiB0cnVlLFxuICAgICAgICBcImVuY29kZVwiOiBlbmNvZGVVUklDb21wb25lbnRcbiAgICB9XG59OyAvL29wZXJhdG9yT3B0aW9uc1xuXG5mdW5jdGlvbiBwZXJjZW50RW5jb2RlKHZhbHVlKSB7XG4gICAgLypcblx0aHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTIuM1xuXHQqL1xuICAgIHZhciB1bnJlc2VydmVkID0gXCItLl9+XCI7XG5cbiAgICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKSByZXR1cm4gJyc7XG5cbiAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKHZhbHVlLCBmdW5jdGlvbiAoY2gpIHtcbiAgICAgICAgdmFyIGNoYXJDb2RlID0gY2guY2hhckNvZGVBdCgwKTtcblxuICAgICAgICBpZiAoY2hhckNvZGUgPj0gMHgzMCAmJiBjaGFyQ29kZSA8PSAweDM5KSByZXR1cm4gY2g7XG4gICAgICAgIGlmIChjaGFyQ29kZSA+PSAweDQxICYmIGNoYXJDb2RlIDw9IDB4NWEpIHJldHVybiBjaDtcbiAgICAgICAgaWYgKGNoYXJDb2RlID49IDB4NjEgJiYgY2hhckNvZGUgPD0gMHg3YSkgcmV0dXJuIGNoO1xuXG4gICAgICAgIGlmICh+dW5yZXNlcnZlZC5pbmRleE9mKGNoKSkgcmV0dXJuIGNoO1xuXG4gICAgICAgIHJldHVybiAnJScgKyBjaGFyQ29kZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcbiAgICB9KS5qb2luKCcnKTtcblxufSAvL3BlcmNlbnRFbmNvZGVcblxuZnVuY3Rpb24gaXNEZWZpbmVkKHZhbHVlKSB7XG4gICAgcmV0dXJuICFpc1VuZGVmaW5lZCh2YWx1ZSk7XG59IC8vaXNEZWZpbmVkXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWx1ZSkge1xuICAgIC8qXG5cdGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY1NzAjc2VjdGlvbi0yLjNcblx0Ki9cbiAgICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufSAvL2lzVW5kZWZpbmVkXG5cblxuZnVuY3Rpb24gVXJpVGVtcGxhdGUodGVtcGxhdGUpIHtcbiAgICAvKlxuXHRodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2NTcwI3NlY3Rpb24tMi4yXG5cblx0ZXhwcmVzc2lvbiAgICA9ICBcIntcIiBbIG9wZXJhdG9yIF0gdmFyaWFibGUtbGlzdCBcIn1cIlxuXHRvcGVyYXRvciAgICAgID0gIG9wLWxldmVsMiAvIG9wLWxldmVsMyAvIG9wLXJlc2VydmVcblx0b3AtbGV2ZWwyICAgICA9ICBcIitcIiAvIFwiI1wiXG5cdG9wLWxldmVsMyAgICAgPSAgXCIuXCIgLyBcIi9cIiAvIFwiO1wiIC8gXCI/XCIgLyBcIiZcIlxuXHRvcC1yZXNlcnZlICAgID0gIFwiPVwiIC8gXCIsXCIgLyBcIiFcIiAvIFwiQFwiIC8gXCJ8XCJcblx0Ki9cbiAgICB2YXIgcmVUZW1wbGF0ZSA9IC9cXHsoW1xcKyNcXC5cXC87XFw/Jj1cXCwhQFxcfF0/KShbQS1aYS16MC05X1xcLFxcLlxcOlxcKl0rPylcXH0vZztcbiAgICB2YXIgcmVWYXJpYWJsZSA9IC9eKFtcXCRfYS16XVtcXCRfYS16MC05XSopKCg/OlxcOlsxLTldWzAtOV0/WzAtOV0/WzAtOV0/KT8pKFxcKj8pJC9pO1xuICAgIHZhciBtYXRjaDtcbiAgICB2YXIgcGllY2VzID0gW107XG4gICAgdmFyIGdsdWVzID0gW107XG4gICAgdmFyIG9mZnNldCA9IDA7XG4gICAgdmFyIHBpZWNlQ291bnQgPSAwO1xuXG4gICAgd2hpbGUgKCAhISAobWF0Y2ggPSByZVRlbXBsYXRlLmV4ZWModGVtcGxhdGUpKSkge1xuICAgICAgICBnbHVlcy5wdXNoKHRlbXBsYXRlLnN1YnN0cmluZyhvZmZzZXQsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8qXG5cdFx0VGhlIG9wZXJhdG9yIGNoYXJhY3RlcnMgZXF1YWxzIChcIj1cIiksIGNvbW1hIChcIixcIiksIGV4Y2xhbWF0aW9uIChcIiFcIiksXG5cdFx0YXQgc2lnbiAoXCJAXCIpLCBhbmQgcGlwZSAoXCJ8XCIpIGFyZSByZXNlcnZlZCBmb3IgZnV0dXJlIGV4dGVuc2lvbnMuXG5cdFx0Ki9cbiAgICAgICAgaWYgKG1hdGNoWzFdICYmIH4nPSwhQHwnLmluZGV4T2YobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICB0aHJvdyBcIm9wZXJhdG9yICdcIiArIG1hdGNoWzFdICsgXCInIGlzIHJlc2VydmVkIGZvciBmdXR1cmUgZXh0ZW5zaW9uc1wiO1xuICAgICAgICB9XG5cbiAgICAgICAgb2Zmc2V0ID0gbWF0Y2guaW5kZXg7XG4gICAgICAgIHBpZWNlcy5wdXNoKHtcbiAgICAgICAgICAgIG9wZXJhdG9yOiBtYXRjaFsxXSxcbiAgICAgICAgICAgIHZhcmlhYmxlczogbWF0Y2hbMl0uc3BsaXQoJywnKS5tYXAodmFyaWFibGVNYXBwZXIpXG4gICAgICAgIH0pO1xuICAgICAgICBvZmZzZXQgKz0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBwaWVjZUNvdW50Kys7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFyaWFibGVNYXBwZXIodmFyaWFibGUpIHtcbiAgICAgICAgdmFyIG1hdGNoID0gcmVWYXJpYWJsZS5leGVjKHZhcmlhYmxlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IG1hdGNoWzFdLFxuICAgICAgICAgICAgbWF4TGVuZ3RoOiBtYXRjaFsyXSAmJiBwYXJzZUludChtYXRjaFsyXS5zdWJzdHJpbmcoMSksIDEwKSxcbiAgICAgICAgICAgIGNvbXBvc2l0ZTogISEgbWF0Y2hbM11cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBnbHVlcy5wdXNoKHRlbXBsYXRlLnN1YnN0cmluZyhvZmZzZXQpKTtcblxuICAgIHRoaXMucGFyc2UgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIHZhciBvZmZzZXQgPSAwO1xuICAgICAgICB2YXIgb2Zmc2V0cyA9IFtdO1xuXG4gICAgICAgIGlmICghZ2x1ZXMuZXZlcnkoZnVuY3Rpb24gKGdsdWUsIGdsdWVJbmRleCkge1xuICAgICAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICAgICAgaWYgKGdsdWVJbmRleCA+IDAgJiYgZ2x1ZSA9PT0gJycpIGluZGV4ID0gc3RyLmxlbmd0aDtcbiAgICAgICAgICAgIGVsc2UgaW5kZXggPSBzdHIuaW5kZXhPZihnbHVlLCBvZmZzZXQpO1xuXG4gICAgICAgICAgICBvZmZzZXQgPSBpbmRleDtcbiAgICAgICAgICAgIG9mZnNldHMucHVzaChvZmZzZXQpO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGdsdWUubGVuZ3RoO1xuXG4gICAgICAgICAgICByZXR1cm5+IGluZGV4O1xuICAgICAgICB9KSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGlmICghcGllY2VzLmV2ZXJ5KGZ1bmN0aW9uIChwaWVjZSwgcGllY2VJbmRleCkge1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBvcGVyYXRvck9wdGlvbnNbcGllY2Uub3BlcmF0b3JdO1xuICAgICAgICAgICAgdmFyIHZhbHVlLCB2YWx1ZXM7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0QmVnaW4gPSBvZmZzZXRzW3BpZWNlSW5kZXhdICsgZ2x1ZXNbcGllY2VJbmRleF0ubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG9mZnNldEVuZCA9IG9mZnNldHNbcGllY2VJbmRleCArIDFdO1xuXG4gICAgICAgICAgICB2YWx1ZSA9IHN0ci5zdWJzdHJpbmcob2Zmc2V0QmVnaW4sIG9mZnNldEVuZCk7XG4gICAgICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmICh2YWx1ZS5zdWJzdHJpbmcoMCwgb3B0aW9ucy5wcmVmaXgubGVuZ3RoKSAhPT0gb3B0aW9ucy5wcmVmaXgpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKG9wdGlvbnMucHJlZml4Lmxlbmd0aCk7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZS5zcGxpdChvcHRpb25zLnNlcGVyYXRvcik7XG5cbiAgICAgICAgICAgIGlmICghcGllY2UudmFyaWFibGVzLmV2ZXJ5KGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFyaWFibGVJbmRleCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHZhbHVlc1t2YXJpYWJsZUluZGV4XTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZTtcblxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIG5hbWUgPSB2YXJpYWJsZS5uYW1lO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYXNzaWdubWVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUuc3Vic3RyaW5nKDAsIG5hbWUubGVuZ3RoKSAhPT0gbmFtZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cmluZyhuYW1lLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgJiYgb3B0aW9ucy5hc3NpZ25FbXB0eSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlWzBdICE9PSAnPScpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhbHVlID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBkYXRhW25hbWVdID0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIH0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfTsgLy9wYXJzZVxuXG4gICAgdGhpcy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xuXG4gICAgICAgIHN0ciArPSBnbHVlc1swXTtcbiAgICAgICAgaWYgKCFwaWVjZXMuZXZlcnkoZnVuY3Rpb24gKHBpZWNlLCBwaWVjZUluZGV4KSB7XG5cbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gb3BlcmF0b3JPcHRpb25zW3BpZWNlLm9wZXJhdG9yXTtcbiAgICAgICAgICAgIHZhciBwYXJ0cztcblxuICAgICAgICAgICAgcGFydHMgPSBwaWVjZS52YXJpYWJsZXMubWFwKGZ1bmN0aW9uICh2YXJpYWJsZSkge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGRhdGFbdmFyaWFibGUubmFtZV07XG5cbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB2YWx1ZSA9IFt2YWx1ZV07XG5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihpc0RlZmluZWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUuY29tcG9zaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBPYmplY3Qua2V5cyh2YWx1ZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleVZhbHVlID0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLm1heExlbmd0aCkga2V5VmFsdWUgPSBrZXlWYWx1ZS5zdWJzdHJpbmcoMCwgdmFyaWFibGUubWF4TGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlWYWx1ZSA9IG9wdGlvbnMuZW5jb2RlKGtleVZhbHVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5VmFsdWUpIGtleVZhbHVlID0ga2V5ICsgJz0nICsga2V5VmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5VmFsdWUgPSBrZXk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hc3NpZ25FbXB0eSkga2V5VmFsdWUgKz0gJz0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4ob3B0aW9ucy5zZXBlcmF0b3IpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS5tYXhMZW5ndGgpIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKDAsIHZhcmlhYmxlLm1heExlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9wdGlvbnMuZW5jb2RlKHZhbHVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFzc2lnbm1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZSA9IHZhcmlhYmxlLm5hbWUgKyAnPScgKyB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhcmlhYmxlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hc3NpZ25FbXB0eSkgdmFsdWUgKz0gJz0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuam9pbihvcHRpb25zLnNlcGVyYXRvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh2YWx1ZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleVZhbHVlID0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLm1heExlbmd0aCkga2V5VmFsdWUgPSBrZXlWYWx1ZS5zdWJzdHJpbmcoMCwgdmFyaWFibGUubWF4TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleSArICcsJyArIG9wdGlvbnMuZW5jb2RlKGtleVZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS5tYXhMZW5ndGgpIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKDAsIHZhcmlhYmxlLm1heExlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5lbmNvZGUodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmpvaW4oJywnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hc3NpZ25tZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHZhbHVlID0gdmFyaWFibGUubmFtZSArICc9JyArIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YXJpYWJsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFzc2lnbkVtcHR5KSB2YWx1ZSArPSAnPSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBwYXJ0cyA9IHBhcnRzLmZpbHRlcihpc0RlZmluZWQpO1xuICAgICAgICAgICAgaWYgKGlzRGVmaW5lZChwYXJ0cykpIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gb3B0aW9ucy5wcmVmaXg7XG4gICAgICAgICAgICAgICAgc3RyICs9IHBhcnRzLmpvaW4ob3B0aW9ucy5zZXBlcmF0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdHIgKz0gZ2x1ZXNbcGllY2VJbmRleCArIDFdO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9OyAvL3N0cmluZ2lmeVxuXG59IC8vVXJpVGVtcGxhdGUiLCIvKiBqc2hpbnQgbm9kZTp0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFJvdXRlcjogcmVxdWlyZSgnLi9Sb3V0ZXInKSxcbiAgICBVcmlUZW1wbGF0ZTogcmVxdWlyZSgnLi9VcmlUZW1wbGF0ZScpXG59OyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBUaGUgaGFsQ2xpZW50IHNlcnZpY2UgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSAkaHR0cCBkaXJlY3RseSBpbnN0ZWFkLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIYWxDbGllbnQge1xuICAvKipcbiAgICogQHBhcmFtIHtMb2d9ICAgICAgJGxvZ1xuICAgKiBAcGFyYW0ge0h0dHB9ICAgICAkaHR0cFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBMaW5rSGVhZGVyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgICRoYWxDb25maWd1cmF0aW9uXG4gICAqL1xuICBjb25zdHJ1Y3RvcigkbG9nLCAkaHR0cCwgTGlua0hlYWRlciwgJGhhbENvbmZpZ3VyYXRpb24pIHtcbiAgICB0aGlzLl8kbG9nID0gJGxvZztcbiAgICB0aGlzLl8kaHR0cCA9ICRodHRwO1xuICAgIHRoaXMuXyRoYWxDb25maWd1cmF0aW9uID0gJGhhbENvbmZpZ3VyYXRpb247XG4gICAgdGhpcy5MaW5rSGVhZGVyID0gTGlua0hlYWRlcjtcbiAgfVxuICAkZ2V0KGhyZWYsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy4kcmVxdWVzdCgnR0VUJywgaHJlZiwgb3B0aW9ucyk7XG4gIH1cbiAgJHBvc3QoaHJlZiwgb3B0aW9ucywgZGF0YSkge1xuICAgIHJldHVybiB0aGlzLiRyZXF1ZXN0KCdQT1NUJywgaHJlZiwgb3B0aW9ucywgZGF0YSk7XG4gIH1cbiAgJHB1dChocmVmLCBvcHRpb25zLCBkYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuJHJlcXVlc3QoJ1BVVCcsIGhyZWYsIG9wdGlvbnMsIGRhdGEpO1xuICB9XG4gICRwYXRjaChocmVmLCBvcHRpb25zLCBkYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuJHJlcXVlc3QoJ1BBVENIJywgaHJlZiwgb3B0aW9ucywgZGF0YSk7XG4gIH1cbiAgJGRlbGV0ZShocmVmLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuJHJlcXVlc3QoJ0RFTEVURScsIGhyZWYsIG9wdGlvbnMpO1xuICB9XG4gICRsaW5rKGhyZWYsIG9wdGlvbnMsIGxpbmtIZWFkZXJzKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9O1xuICAgIG9wdGlvbnMuaGVhZGVycy5MaW5rID0gbGlua0hlYWRlcnMubWFwKGZ1bmN0aW9uKGxpbmspIHsgcmV0dXJuIGxpbmsudG9TdHJpbmcoKTsgfSk7XG4gICAgcmV0dXJuIHRoaXMuJHJlcXVlc3QoJ0xJTksnLCBocmVmLCBvcHRpb25zKTtcbiAgfVxuICAkdW5saW5rKGhyZWYsIG9wdGlvbnMsIGxpbmtIZWFkZXJzKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9O1xuICAgIG9wdGlvbnMuaGVhZGVycy5MaW5rID0gbGlua0hlYWRlcnMubWFwKGZ1bmN0aW9uKGxpbmspIHsgcmV0dXJuIGxpbmsudG9TdHJpbmcoKTsgfSk7XG4gICAgcmV0dXJuIHRoaXMuJHJlcXVlc3QoJ1VOTElOSycsIGhyZWYsIG9wdGlvbnMpO1xuICB9XG4gICRyZXF1ZXN0KG1ldGhvZCwgaHJlZiwgb3B0aW9ucywgZGF0YSkge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuXyRsb2cubG9nKCdUaGUgaGFsQ2xpZW50IHNlcnZpY2UgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSAkaHR0cCBkaXJlY3RseSBpbnN0ZWFkLicpO1xuICAgIHJldHVybiB0aGlzLl8kaHR0cChhbmd1bGFyLmV4dGVuZCh7fSwgb3B0aW9ucywge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHRoaXMuXyRoYWxDb25maWd1cmF0aW9uLnVybFRyYW5zZm9ybWVyKGhyZWYpLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICB9KSk7XG4gIH1cbn1cblxuLy8gSW5qZWN0IERlcGVuZGVuY2llc1xuSGFsQ2xpZW50LiRpbmplY3QgPSBbXG4gICckbG9nJyxcbiAgJyRodHRwJyxcbiAgJ0xpbmtIZWFkZXInLFxuICAnJGhhbENvbmZpZ3VyYXRpb24nLFxuXTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTU9EVUxFX05BTUUgPSAnYW5ndWxhci1oYWwuY2xpZW50JztcblxuaW1wb3J0IEhhbENsaWVudCBmcm9tICcuL2hhbC1jbGllbnQnO1xuaW1wb3J0IExpbmtIZWFkZXIgZnJvbSAnLi9saW5rLWhlYWRlcic7XG5cbi8vIEFkZCBtb2R1bGUgZm9yIGNsaWVudFxuYW5ndWxhclxuICAubW9kdWxlKE1PRFVMRV9OQU1FLCBbXSlcblxuICAuc2VydmljZSgnaGFsQ2xpZW50JywgSGFsQ2xpZW50KVxuICAuc2VydmljZSgnJGhhbENsaWVudCcsIEhhbENsaWVudClcblxuICAudmFsdWUoJ0xpbmtIZWFkZXInLCBMaW5rSGVhZGVyKVxuO1xuXG5leHBvcnQgZGVmYXVsdCBNT0RVTEVfTkFNRTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBMaW5rIEhlYWRlclxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaW5rSGVhZGVyIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB1cmlSZWZlcmVuY2UgVGhlIExpbmsgVmFsdWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGxpbmtQYXJhbXMgICBUaGUgTGluayBQYXJhbXNcbiAgICovXG4gIGNvbnN0cnVjdG9yKHVyaVJlZmVyZW5jZSwgbGlua1BhcmFtcykge1xuICAgIHRoaXMudXJpUmVmZXJlbmNlID0gdXJpUmVmZXJlbmNlO1xuICAgIHRoaXMubGlua1BhcmFtcyA9IGFuZ3VsYXIuZXh0ZW5kKFxuICAgICAge1xuICAgICAgICByZWw6IG51bGwsXG4gICAgICAgIGFuY2hvcjogbnVsbCxcbiAgICAgICAgcmV2OiBudWxsLFxuICAgICAgICBocmVmbGFuZzogbnVsbCxcbiAgICAgICAgbWVkaWE6IG51bGwsXG4gICAgICAgIHRpdGxlOiBudWxsLFxuICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgfSxcbiAgICAgIGxpbmtQYXJhbXNcbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICB0b1N0cmluZygpIHtcbiAgICB2YXIgcmVzdWx0ID0gJzwnICsgdGhpcy51cmlSZWZlcmVuY2UgKyAnPidcbiAgICAgICwgcGFyYW1zID0gW107XG5cbiAgICBmb3IobGV0IHBhcmFtTmFtZSBpbiB0aGlzLmxpbmtQYXJhbXMpIHtcbiAgICAgIGxldCBwYXJhbVZhbHVlID0gdGhpcy5saW5rUGFyYW1zW3BhcmFtTmFtZV07XG4gICAgICBpZihwYXJhbVZhbHVlKSB7XG4gICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtTmFtZSArICc9XCInICsgcGFyYW1WYWx1ZSArICdcIicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHBhcmFtcy5sZW5ndGggPCAxKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHJlc3VsdCA9IHJlc3VsdCArICc7JyArIHBhcmFtcy5qb2luKCc7Jyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub29wVXJsVHJhbnNmb3JtZXIodXJsKSB7XG4gIHJldHVybiB1cmw7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhhbENvbmZpZ3VyYXRpb25Qcm92aWRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2xpbmtzQXR0cmlidXRlID0gJ19saW5rcyc7XG4gICAgdGhpcy5fZW1iZWRkZWRBdHRyaWJ1dGUgPSAnX2VtYmVkZGVkJztcbiAgICB0aGlzLl9pZ25vcmVBdHRyaWJ1dGVQcmVmaXhlcyA9IFtcbiAgICAgICdfJyxcbiAgICAgICckJyxcbiAgICBdO1xuICAgIHRoaXMuX3NlbGZMaW5rID0gJ3NlbGYnO1xuICAgIHRoaXMuX2ZvcmNlSlNPTlJlc291cmNlID0gZmFsc2U7XG4gICAgdGhpcy5fdXJsVHJhbnNmb3JtZXIgPSBub29wVXJsVHJhbnNmb3JtZXI7XG5cbiAgICB0aGlzLiRnZXQuJGluamVjdCA9IFtcbiAgICAgICckbG9nJyxcbiAgICBdO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsaW5rc0F0dHJpYnV0ZVxuICAgKi9cbiAgc2V0TGlua3NBdHRyaWJ1dGUobGlua3NBdHRyaWJ1dGUpIHtcbiAgICB0aGlzLl9saW5rc0F0dHJpYnV0ZSA9IGxpbmtzQXR0cmlidXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbWJlZGRlZEF0dHJpYnV0ZVxuICAgKi9cbiAgc2V0RW1iZWRkZWRBdHRyaWJ1dGUoZW1iZWRkZWRBdHRyaWJ1dGUpIHtcbiAgICB0aGlzLl9lbWJlZGRlZEF0dHJpYnV0ZSA9IGVtYmVkZGVkQXR0cmlidXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7U3RyaW5nW119IGlnbm9yZUF0dHJpYnV0ZVByZWZpeGVzXG4gICAqL1xuICBzZXRJZ25vcmVBdHRyaWJ1dGVQcmVmaXhlcyhpZ25vcmVBdHRyaWJ1dGVQcmVmaXhlcykge1xuICAgIHRoaXMuX2lnbm9yZUF0dHJpYnV0ZVByZWZpeGVzID0gaWdub3JlQXR0cmlidXRlUHJlZml4ZXM7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlnbm9yZUF0dHJpYnV0ZVByZWZpeFxuICAgKi9cbiAgYWRkSWdub3JlQXR0cmlidXRlUHJlZml4KGlnbm9yZUF0dHJpYnV0ZVByZWZpeCkge1xuICAgIHRoaXMuX2lnbm9yZUF0dHJpYnV0ZVByZWZpeGVzLnB1c2goaWdub3JlQXR0cmlidXRlUHJlZml4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VsZkxpbmtcbiAgICovXG4gIHNldFNlbGZMaW5rKHNlbGZMaW5rKSB7XG4gICAgdGhpcy5fc2VsZkxpbmsgPSBzZWxmTGluaztcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZvcmNlSlNPTlJlc291cmNlXG4gICAqL1xuICBzZXRGb3JjZUpTT05SZXNvdXJjZShmb3JjZUpTT05SZXNvdXJjZSkge1xuICAgIHRoaXMuX2ZvcmNlSlNPTlJlc291cmNlID0gZm9yY2VKU09OUmVzb3VyY2U7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gdXJsVHJhbnNmb3JtZXJcbiAgICogQGRlcHJlY2F0ZWQgJGhhbENvbmZpZ3VyYXRpb25Qcm92aWRlci5zZXRVcmxUcmFuc2Zvcm1lciBpcyBkZXByZWNhdGVkLiBQbGVhc2Ugd3JpdGUgYSBodHRwIGludGVyY2VwdG9yIGluc3RlYWQuXG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nL3NlcnZpY2UvJGh0dHAjaW50ZXJjZXB0b3JzXG4gICAqL1xuICBzZXRVcmxUcmFuc2Zvcm1lcih1cmxUcmFuc2Zvcm1lcikge1xuICAgIHRoaXMuX3VybFRyYW5zZm9ybWVyID0gdXJsVHJhbnNmb3JtZXI7XG4gIH1cblxuICAvKipcbiAgICogR2V0IENvbmZpZ3VyYXRpb25cbiAgICogQHBhcmFtICB7TG9nfSAkbG9nIGxvZ2dlclxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICAkZ2V0KCRsb2cpIHtcbiAgICBpZih0aGlzLl91cmxUcmFuc2Zvcm1lciAhPT0gbm9vcFVybFRyYW5zZm9ybWVyKSB7XG4gICAgICAkbG9nLmxvZygnJGhhbENvbmZpZ3VyYXRpb25Qcm92aWRlci5zZXRVcmxUcmFuc2Zvcm1lciBpcyBkZXByZWNhdGVkLiBQbGVhc2Ugd3JpdGUgYSBodHRwIGludGVyY2VwdG9yIGluc3RlYWQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgbGlua3NBdHRyaWJ1dGU6IHRoaXMuX2xpbmtzQXR0cmlidXRlLFxuICAgICAgZW1iZWRkZWRBdHRyaWJ1dGU6IHRoaXMuX2VtYmVkZGVkQXR0cmlidXRlLFxuICAgICAgaWdub3JlQXR0cmlidXRlUHJlZml4ZXM6IHRoaXMuX2lnbm9yZUF0dHJpYnV0ZVByZWZpeGVzLFxuICAgICAgc2VsZkxpbms6IHRoaXMuX3NlbGZMaW5rLFxuICAgICAgZm9yY2VKU09OUmVzb3VyY2U6IHRoaXMuX2ZvcmNlSlNPTlJlc291cmNlLFxuICAgICAgdXJsVHJhbnNmb3JtZXI6IHRoaXMuX3VybFRyYW5zZm9ybWVyLFxuICAgIH0pO1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IE1PRFVMRV9OQU1FID0gJ2FuZ3VsYXItaGFsLmNvbmZpZ3VyYXRpb24nO1xuXG5cblxuaW1wb3J0IEhhbENvbmZpZ3VyYXRpb25Qcm92aWRlciBmcm9tICcuL2hhbC1jb25maWd1cmF0aW9uLnByb3ZpZGVyJztcblxuLy8gQWRkIG1vZHVsZSBmb3IgY29uZmlndXJhdGlvblxuYW5ndWxhclxuICAubW9kdWxlKE1PRFVMRV9OQU1FLCBbXSlcblxuICAucHJvdmlkZXIoJyRoYWxDb25maWd1cmF0aW9uJywgSGFsQ29uZmlndXJhdGlvblByb3ZpZGVyKVxuO1xuXG5leHBvcnQgZGVmYXVsdCBNT0RVTEVfTkFNRTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFJlc291cmNlSHR0cEludGVyY2VwdG9yRmFjdG9yeSBmcm9tICcuL3Jlc291cmNlLWh0dHAtaW50ZXJjZXB0b3IuZmFjdG9yeSc7XG5cbi8qKlxuICogQHBhcmFtIHtIdHRwUHJvdmlkZXJ9ICRodHRwUHJvdmlkZXJcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gSHR0cEludGVyY2VwdG9yQ29uZmlndXJhdGlvbigkaHR0cFByb3ZpZGVyKSB7XG4gICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goUmVzb3VyY2VIdHRwSW50ZXJjZXB0b3JGYWN0b3J5KTtcbn1cblxuSHR0cEludGVyY2VwdG9yQ29uZmlndXJhdGlvbi4kaW5qZWN0ID0gW1xuICAnJGh0dHBQcm92aWRlcicsXG5dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBNT0RVTEVfTkFNRSA9ICdhbmd1bGFyLWhhbC5odHRwLWludGVyY2VwdGlvbic7XG5cbmltcG9ydCByZXNvdXJjZSBmcm9tICcuLi9yZXNvdXJjZSc7XG5pbXBvcnQgY29uZmlndXJhdGlvbiBmcm9tICcuLi9jb25maWd1cmF0aW9uJztcblxuaW1wb3J0IEh0dHBJbnRlcmNlcHRvckNvbmZpZ3VyYXRpb24gZnJvbSAnLi9odHRwLWludGVyY2VwdGlvbi5jb25maWcnO1xuXG4vLyBBZGQgbW9kdWxlIGZvciBodHRwIGludGVyY2VwdGlvblxuYW5ndWxhclxuICAubW9kdWxlKE1PRFVMRV9OQU1FLCBbXG4gICAgcmVzb3VyY2UsXG4gICAgY29uZmlndXJhdGlvbixcbiAgXSlcblxuICAuY29uZmlnKEh0dHBJbnRlcmNlcHRvckNvbmZpZ3VyYXRpb24pXG47XG5cbmV4cG9ydCBkZWZhdWx0IE1PRFVMRV9OQU1FO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBDT05URU5UX1RZUEUgPSAnYXBwbGljYXRpb24vaGFsK2pzb24nO1xuXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ2NvbnRlbnQtdHlwZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFJlc291cmNlSHR0cEludGVyY2VwdG9yRmFjdG9yeSgkaGFsQ29uZmlndXJhdGlvbiwgUmVzb3VyY2UpIHtcbiAgcmV0dXJuIHtcbiAgICByZXF1ZXN0OiB0cmFuc2Zvcm1SZXF1ZXN0LFxuICAgIHJlc3BvbnNlOiB0cmFuc2Zvcm1SZXNwb25zZSxcbiAgfTtcblxuICAvKipcbiAgICogQWRkIEhhbCBKc29uIEFzIGFuIGFjY2VwdGVkIGZvcm1hdFxuICAgKiBAcGFyYW0ge1JlcXVlc3R9IHJlcXVlc3RcbiAgICogQHJldHVybiB7UmVxdWVzdH1cbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVJlcXVlc3QocmVxdWVzdCkge1xuICAgIGlmKHR5cGVvZiByZXF1ZXN0LmhlYWRlcnMuQWNjZXB0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmVxdWVzdC5oZWFkZXJzLkFjY2VwdCA9IENPTlRFTlRfVFlQRTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxdWVzdC5oZWFkZXJzLkFjY2VwdCA9IFtcbiAgICAgICAgQ09OVEVOVF9UWVBFLFxuICAgICAgICByZXF1ZXN0LmhlYWRlcnMuQWNjZXB0XG4gICAgICBdLmpvaW4oJywgJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIFJlc3BvbnNlXG4gICAqXG4gICAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc3BvbnNlXG4gICAqIEByZXR1cm4ge1Jlc3BvbnNlfFJlc291cmNlfVxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNmb3JtUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICB0cnkge1xuICAgICAgaWYocGFyc2UocmVzcG9uc2UuaGVhZGVycygnQ29udGVudC1UeXBlJykpLnR5cGUgPT09IENPTlRFTlRfVFlQRSkge1xuICAgICAgICByZXR1cm4gdHJhbnNmb3JtUmVzcG9uc2VUb1Jlc291cmNlKHJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIC8vIFRoZSBwYXJzZSBmdW5jdGlvbiBjb3VsZCB0aHJvdyBhbiBlcnJvciwgd2UgZG8gbm90IHdhbnQgdGhhdC5cbiAgICB9XG4gICAgaWYocmVzcG9uc2UuY29uZmlnLmZvcmNlSGFsKSB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtUmVzcG9uc2VUb1Jlc291cmNlKHJlc3BvbnNlKTtcbiAgICB9XG4gICAgaWYoKFxuICAgICAgICByZXNwb25zZS5oZWFkZXJzKCdDb250ZW50LVR5cGUnKSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nIHx8XG4gICAgICAgIHJlc3BvbnNlLmhlYWRlcnMoJ0NvbnRlbnQtVHlwZScpID09PSBudWxsXG4gICAgICApICYmXG4gICAgICAkaGFsQ29uZmlndXJhdGlvbi5mb3JjZUpTT05SZXNvdXJjZSkge1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybVJlc3BvbnNlVG9SZXNvdXJjZShyZXNwb25zZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVJlc3BvbnNlVG9SZXNvdXJjZShyZXNwb25zZSkge1xuICAgIHJldHVybiBuZXcgUmVzb3VyY2UocmVzcG9uc2UuZGF0YSwgcmVzcG9uc2UpO1xuICB9XG59XG5cblJlc291cmNlSHR0cEludGVyY2VwdG9yRmFjdG9yeS4kaW5qZWN0ID0gW1xuICAnJGhhbENvbmZpZ3VyYXRpb24nLFxuICAnUmVzb3VyY2UnLFxuXTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTU9EVUxFX05BTUUgPSAnYW5ndWxhci1oYWwnO1xuXG5pbXBvcnQgaHR0cEludGVyY2VwdGlvbiBmcm9tICcuL2h0dHAtaW50ZXJjZXB0aW9uJztcbmltcG9ydCBjbGllbnQgZnJvbSAnLi9jbGllbnQnO1xuXG4vLyBDb21iaW5lIG5lZWRlZCBNb2R1bGVzXG5hbmd1bGFyXG4gIC5tb2R1bGUoTU9EVUxFX05BTUUsIFtcbiAgICBodHRwSW50ZXJjZXB0aW9uLFxuICAgIGNsaWVudCxcbiAgXSlcbjtcblxuZXhwb3J0IGRlZmF1bHQgTU9EVUxFX05BTUU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBleHRlbmRSZWFkT25seSBmcm9tICcuLi91dGlsaXR5L2V4dGVuZC1yZWFkLW9ubHknO1xuXG4vKipcbiAqIEZhY3RvcnkgZm9yIEhhbFJlc291cmNlQ2xpZW50XG4gKiBAcGFyYW0ge1F9ICAgICAgICAkcVxuICogQHBhcmFtIHtJbmplY3Rvcn0gJGluamVjdG9yIFByZXZlbnQgQ2lyY3VsYXIgRGVwZW5kZW5jeSBieSBpbmplY3RpbmcgJGluamVjdG9yIGluc3RlYWQgb2YgJGh0dHBcbiAqIEBwYXJhbSB7T2JqZWN0fSAgICRoYWxDb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEhhbFJlc291cmNlQ2xpZW50RmFjdG9yeSgkcSwgJGluamVjdG9yLCAkaGFsQ29uZmlndXJhdGlvbiwgJGxvZykge1xuICByZXR1cm4gSGFsUmVzb3VyY2VDbGllbnQ7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7UmVzb3VyY2V9IHJlc291cmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgIGxpbmtzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgIGVtYmVkZGVkXG4gICAqL1xuICBmdW5jdGlvbiBIYWxSZXNvdXJjZUNsaWVudChyZXNvdXJjZSwgZW1iZWRkZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgJGh0dHAgPSAkaW5qZWN0b3IuZ2V0KCckaHR0cCcpO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgY2xpZW50XG4gICAgICovXG4gICAgKGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBleHRlbmRSZWFkT25seShzZWxmLCB7XG4gICAgICAgICRyZXF1ZXN0OiAkcmVxdWVzdCxcbiAgICAgICAgJGdldDogJGdldCxcbiAgICAgICAgJGdldENvbGxlY3Rpb246ICRnZXRDb2xsZWN0aW9uLFxuICAgICAgICAkcG9zdDogJHBvc3QsXG4gICAgICAgICRwdXQ6ICRwdXQsXG4gICAgICAgICRwYXRjaDogJHBhdGNoLFxuICAgICAgICAkZGVsZXRlOiAkZGVsZXRlLFxuICAgICAgICAkZGVsOiAkZGVsZXRlLFxuICAgICAgICAkbGluazogJGxpbmssXG4gICAgICAgICR1bmxpbms6ICR1bmxpbmtcbiAgICAgIH0pO1xuICAgIH0pKCk7XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCByZXF1ZXN0IGFnYWluc3QgYSBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICBtZXRob2RcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICByZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge21peGVkfG51bGx9ICBib2R5XG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJHJlcXVlc3QobWV0aG9kLCByZWwsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucykge1xuICAgICAgdmFyIHByb21pc2VzO1xuXG4gICAgICBtZXRob2QgPSBtZXRob2QgfHwgJ0dFVCc7XG4gICAgICByZWwgPSByZWwgfHwgJGhhbENvbmZpZ3VyYXRpb24uc2VsZkxpbms7XG4gICAgICB1cmxQYXJhbXMgPSB1cmxQYXJhbXMgfHwge307XG4gICAgICBib2R5ID0gYm9keSB8fCBudWxsO1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIGlmKG1ldGhvZCA9PT0gJ0dFVCcgJiZcbiAgICAgICAgICByZWwgPT09ICRoYWxDb25maWd1cmF0aW9uLnNlbGZMaW5rKSB7XG4gICAgICAgIHJldHVybiAkcS5yZXNvbHZlKHJlc291cmNlKTtcbiAgICAgIH1cblxuICAgICAgaWYocmVzb3VyY2UuJGhhc0VtYmVkZGVkKHJlbCkgJiZcbiAgICAgICAgQXJyYXkuaXNBcnJheShlbWJlZGRlZFtyZWxdKSkge1xuICAgICAgICBwcm9taXNlcyA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZW1iZWRkZWRbcmVsXS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goZW1iZWRkZWRbcmVsXVtpXS4kcmVxdWVzdCgpLiRyZXF1ZXN0KG1ldGhvZCwgJ3NlbGYnLCB1cmxQYXJhbXMsIGJvZHksIG9wdGlvbnMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKTtcbiAgICAgIH1cblxuICAgICAgaWYocmVzb3VyY2UuJGhhc0VtYmVkZGVkKHJlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVtYmVkZGVkW3JlbF0uJHJlcXVlc3QoKS4kcmVxdWVzdChtZXRob2QsICdzZWxmJywgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgaWYocmVzb3VyY2UuJGhhc0xpbmsocmVsKSkge1xuICAgICAgICB2YXIgdXJsID0gcmVzb3VyY2UuJGhyZWYocmVsLCB1cmxQYXJhbXMpO1xuXG4gICAgICAgIGFuZ3VsYXIuZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICBkYXRhOiBib2R5LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZihBcnJheS5pc0FycmF5KHVybCkpIHtcbiAgICAgICAgICBwcm9taXNlcyA9IFtdO1xuICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCB1cmwubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2goJGh0dHAoYW5ndWxhci5leHRlbmQoe30sIG9wdGlvbnMsIHt1cmw6IHVybFtqXX0pKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICRodHRwKGFuZ3VsYXIuZXh0ZW5kKHt9LCBvcHRpb25zLCB7XG4gICAgICAgICAgdXJsOiByZXNvdXJjZS4kaHJlZihyZWwsIHVybFBhcmFtcyksXG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKCdsaW5rIFwiJyArIHJlbCArICdcIiBpcyB1bmRlZmluZWQnKTtcbiAgICAgICRsb2cuZXJyb3IoZXJyb3IpO1xuICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBhIEhUVFAgR0VUIHJlcXVlc3QgYWdhaW5zdCBhIGxpbmsgb3JcbiAgICAgKiBsb2FkIGFuIGVtYmVkZGVkIHJlc291cmNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICByZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkZ2V0KHJlbCwgdXJsUGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ0dFVCcsIHJlbCwgdXJsUGFyYW1zLCB1bmRlZmluZWQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIEdFVCByZXF1ZXN0IGFnYWluc3QgYSBsaW5rIG9yXG4gICAgICogbG9hZCBhbiBlbWJlZGRlZCByZXNvdXJjZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgcmVsXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGdldENvbGxlY3Rpb24ocmVsLCB1cmxQYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiAkZ2V0KHJlbCwgdXJsUGFyYW1zLCBvcHRpb25zKVxuICAgICAgICAudGhlbihyZXNvdXJjZSA9PiB7XG4gICAgICAgICAgaWYoIXJlc291cmNlLiRoYXNFbWJlZGRlZChyZWwpKXtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZS4kcmVxdWVzdCgpLiRnZXQocmVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIFBPU1QgcmVxdWVzdCBhZ2FpbnN0IGEgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgcmVsXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHttaXhlZHxudWxsfSAgYm9keVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICRwb3N0KHJlbCwgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ1BPU1QnLCByZWwsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBhIEhUVFAgUFVUIHJlcXVlc3QgYWdhaW5zdCBhIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9IHVybFBhcmFtc1xuICAgICAqIEBwYXJhbSB7bWl4ZWR8bnVsbH0gIGJvZHlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkcHV0KHJlbCwgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ1BVVCcsIHJlbCwgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCBQQVRDSCByZXF1ZXN0IGFnYWluc3QgYSBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICByZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge21peGVkfG51bGx9ICBib2R5XG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJHBhdGNoKHJlbCwgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ1BBVENIJywgcmVsLCB1cmxQYXJhbXMsIGJvZHksIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIERFTEVFVCByZXF1ZXN0IGFnYWluc3QgYSBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICByZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkZGVsZXRlKHJlbCwgdXJsUGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ0RFTEVURScsIHJlbCwgdXJsUGFyYW1zLCB1bmRlZmluZWQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIExJTksgcmVxdWVzdCBhZ2FpbnN0IGEgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9ICB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge0xpbmtIZWFkZXJbXX0gYm9keVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkbGluayhyZWwsIHVybFBhcmFtcywgbGlua3MsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgb3B0aW9ucy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9O1xuICAgICAgb3B0aW9ucy5oZWFkZXJzLkxpbmsgPSBsaW5rcy5tYXAodG9TdHJpbmdJdGVtKTtcbiAgICAgIHJldHVybiAkcmVxdWVzdCgnTElOSycsIHJlbCwgdXJsUGFyYW1zLCB1bmRlZmluZWQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIFVOTElOSyByZXF1ZXN0IGFnYWluc3QgYSBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICAgcmVsXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gIHVybFBhcmFtc1xuICAgICAqIEBwYXJhbSB7TGlua0hlYWRlcltdfSBib2R5XG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICR1bmxpbmsocmVsLCB1cmxQYXJhbXMsIGxpbmtzLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICAgIG9wdGlvbnMuaGVhZGVycy5MaW5rID0gbGlua3MubWFwKHRvU3RyaW5nSXRlbSk7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ1VOTElOSycsIHJlbCwgdXJsUGFyYW1zLCB1bmRlZmluZWQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7bWl4ZWR9IGl0ZW1cbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gdG9TdHJpbmdJdGVtKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLnRvU3RyaW5nKCk7XG4gICAgfVxuICB9XG59XG5cbkhhbFJlc291cmNlQ2xpZW50RmFjdG9yeS4kaW5qZWN0ID0gW1xuICAnJHEnLFxuICAnJGluamVjdG9yJyxcbiAgJyRoYWxDb25maWd1cmF0aW9uJyxcbiAgJyRsb2cnXG5dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBNT0RVTEVfTkFNRSA9ICdhbmd1bGFyLWhhbC5yZXNvdXJjZSc7XG5cblxuaW1wb3J0IGNvbmZpZ3VyYXRpb24gZnJvbSAnLi4vY29uZmlndXJhdGlvbic7XG5cbmltcG9ydCBSZXNvdXJjZUZhY3RvcnkgZnJvbSAnLi9yZXNvdXJjZS5mYWN0b3J5JztcbmltcG9ydCBIYWxSZXNvdXJjZUNsaWVudEZhY3RvcnkgZnJvbSAnLi9oYWwtcmVzb3VyY2UtY2xpZW50LmZhY3RvcnknO1xuXG4vLyBBZGQgbW9kdWxlIGZvciByZXNvdXJjZVxuYW5ndWxhclxuICAubW9kdWxlKE1PRFVMRV9OQU1FLCBbXG4gICAgY29uZmlndXJhdGlvbixcbiAgXSlcblxuICAuZmFjdG9yeSgnUmVzb3VyY2UnLCBSZXNvdXJjZUZhY3RvcnkpXG5cbiAgLmZhY3RvcnkoJ0hhbFJlc291cmNlQ2xpZW50JywgSGFsUmVzb3VyY2VDbGllbnRGYWN0b3J5KVxuO1xuXG5leHBvcnQgZGVmYXVsdCBNT0RVTEVfTkFNRTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGV4dGVuZFJlYWRPbmx5IGZyb20gJy4uL3V0aWxpdHkvZXh0ZW5kLXJlYWQtb25seSc7XG5pbXBvcnQgZGVmaW5lUmVhZE9ubHkgZnJvbSAnLi4vdXRpbGl0eS9kZWZpbmUtcmVhZC1vbmx5JztcbmltcG9ydCBnZW5lcmF0ZVVybCBmcm9tICcuLi91dGlsaXR5L2dlbmVyYXRlLXVybCc7XG5pbXBvcnQgbm9ybWFsaXplTGluayBmcm9tICcuLi91dGlsaXR5L25vcm1hbGl6ZS1saW5rJztcblxuLyoqXG4gKiBGYWN0b3J5IGZvciBSZXNvdXJjZVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IEhhbFJlc291cmNlQ2xpZW50XG4gKiBAcGFyYW0ge09iamVjdH0gICAkaGFsQ29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBSZXNvdXJjZUZhY3RvcnkoSGFsUmVzb3VyY2VDbGllbnQsICRoYWxDb25maWd1cmF0aW9uKSB7XG4gIHJldHVybiBSZXNvdXJjZTtcblxuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGFcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlXG4gICAqL1xuICBmdW5jdGlvbiBSZXNvdXJjZShkYXRhLCByZXNwb25zZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCBsaW5rcyA9IHt9XG4gICAgICAsIGVtYmVkZGVkID0ge31cbiAgICAgICwgY2xpZW50O1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgUmVzb3VyY2VcbiAgICAgKi9cbiAgICAoZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JyB8fFxuICAgICAgICBkYXRhID09PSBudWxsKSB7XG4gICAgICAgIGRhdGEgPSB7fTtcbiAgICAgIH1cbiAgICAgIGluaXRpYWxpemVEYXRhKCk7XG4gICAgICBpbml0aWFsaXplRW1iZWRkZWQoKTtcbiAgICAgIGluaXRpYWxpemVMaW5rcygpO1xuICAgICAgaW5pdGl0YWxpemVDbGllbnQoKTtcblxuICAgICAgZXh0ZW5kUmVhZE9ubHkoc2VsZiwge1xuICAgICAgICAkaGFzTGluazogJGhhc0xpbmssXG4gICAgICAgICRoYXNFbWJlZGRlZDogJGhhc0VtYmVkZGVkLFxuICAgICAgICAkaGFzOiAkaGFzLFxuICAgICAgICAkaHJlZjogJGhyZWYsXG4gICAgICAgICRtZXRhOiAkbWV0YSxcbiAgICAgICAgJGxpbms6ICRsaW5rLFxuICAgICAgICAkcmVxdWVzdDogJHJlcXVlc3QsXG4gICAgICAgICRyZXNwb25zZTogJHJlc3BvbnNlLFxuICAgICAgICAkcHV0OiAkcHV0LFxuICAgICAgICAkZGVsZXRlOiAkZGVsZXRlXG4gICAgICB9KTtcbiAgICB9KSgpO1xuXG4gICAgLyoqXG4gICAgICogQWRkIGFsbCBkYXRhIGZyb20gZGF0YSB0byBpdHNlbGZcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplRGF0YSgpIHtcbiAgICAgIGZvcih2YXIgcHJvcGVydHlOYW1lIGluIGRhdGEpIHtcbiAgICAgICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmKGlzTWV0YVByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBzZWxmW3Byb3BlcnR5TmFtZV0gPSBkYXRhW3Byb3BlcnR5TmFtZV07XG4gICAgICAgIC8vZGVmaW5lUmVhZE9ubHkoc2VsZiwgcHJvcGVydHlOYW1lLCBkYXRhW3Byb3BlcnR5TmFtZV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZSBhbGwgTGlua3NcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplTGlua3MoKSB7XG4gICAgICBpZih0eXBlb2YgZGF0YVskaGFsQ29uZmlndXJhdGlvbi5saW5rc0F0dHJpYnV0ZV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgT2JqZWN0XG4gICAgICAgIC5rZXlzKGRhdGFbJGhhbENvbmZpZ3VyYXRpb24ubGlua3NBdHRyaWJ1dGVdKVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICB2YXIgbGluayA9IGRhdGFbJGhhbENvbmZpZ3VyYXRpb24ubGlua3NBdHRyaWJ1dGVdW3JlbF07XG4gICAgICAgICAgbGlua3NbcmVsXSA9IG5vcm1hbGl6ZUxpbmsocmVzcG9uc2UuY29uZmlnLnVybCwgbGluayk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZSBFbWJlZGRlZCBDb250ZW50c1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVFbWJlZGRlZCgpIHtcbiAgICAgIGlmKHR5cGVvZiBkYXRhWyRoYWxDb25maWd1cmF0aW9uLmVtYmVkZGVkQXR0cmlidXRlXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBPYmplY3RcbiAgICAgICAgLmtleXMoZGF0YVskaGFsQ29uZmlndXJhdGlvbi5lbWJlZGRlZEF0dHJpYnV0ZV0pXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIGVtYmVkUmVzb3VyY2UocmVsLCBkYXRhWyRoYWxDb25maWd1cmF0aW9uLmVtYmVkZGVkQXR0cmlidXRlXVtyZWxdKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgSFRUUCBDTElFTlRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbml0aXRhbGl6ZUNsaWVudCgpIHtcbiAgICAgIGNsaWVudCA9IG5ldyBIYWxSZXNvdXJjZUNsaWVudChzZWxmLCBlbWJlZGRlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW1iZWQgYSByZXNvdXJjZShzKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fE9iamVjdFtdfSByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlbWJlZFJlc291cmNlKHJlbCwgcmVzb3VyY2VzKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNvdXJjZXMpKSB7XG4gICAgICAgIGVtYmVkZGVkW3JlbF0gPSBbXTtcbiAgICAgICAgcmVzb3VyY2VzLmZvckVhY2goZnVuY3Rpb24gKHJlc291cmNlKSB7XG4gICAgICAgICAgZW1iZWRkZWRbcmVsXS5wdXNoKG5ldyBSZXNvdXJjZShyZXNvdXJjZSwgcmVzcG9uc2UpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVtYmVkZGVkW3JlbF0gPSBuZXcgUmVzb3VyY2UocmVzb3VyY2VzLCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lIGlmIGEgcHJvcGVydHkgbmFtZSBpcyBhIG1ldGEgcHJvcGVydHlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlOYW1lXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01ldGFQcm9wZXJ0eShwcm9wZXJ0eU5hbWUpIHtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCAkaGFsQ29uZmlndXJhdGlvbi5pZ25vcmVBdHRyaWJ1dGVQcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihwcm9wZXJ0eU5hbWUuc3Vic3RyKDAsIDEpID09PSAkaGFsQ29uZmlndXJhdGlvbi5pZ25vcmVBdHRyaWJ1dGVQcmVmaXhlc1tpXSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmKHByb3BlcnR5TmFtZSA9PT0gJGhhbENvbmZpZ3VyYXRpb24ubGlua3NBdHRyaWJ1dGUgfHxcbiAgICAgICAgICBwcm9wZXJ0eU5hbWUgPT09ICRoYWxDb25maWd1cmF0aW9uLmVtYmVkZGVkQXR0cmlidXRlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVsXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkaGFzTGluayhyZWwpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgbGlua3NbcmVsXSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlbFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGhhc0VtYmVkZGVkKHJlbCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBlbWJlZGRlZFtyZWxdICE9PSAndW5kZWZpbmVkJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVsXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkaGFzKHJlbCkge1xuICAgICAgcmV0dXJuICRoYXNMaW5rKHJlbCkgfHwgJGhhc0VtYmVkZGVkKHJlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBocmVmIG9mIGEgTGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICRocmVmKHJlbCwgcGFyYW1ldGVycykge1xuICAgICAgaWYoISRoYXNMaW5rKHJlbCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdsaW5rIFwiJyArIHJlbCArICdcIiBpcyB1bmRlZmluZWQnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGxpbmsgPSBsaW5rc1tyZWxdXG4gICAgICAgICwgaHJlZiA9IGxpbmsuaHJlZjtcblxuICAgICAgaWYoQXJyYXkuaXNBcnJheShsaW5rKSkge1xuICAgICAgICBocmVmID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsaW5rLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHN1YkxpbmsgPSBsaW5rW2ldXG4gICAgICAgICAgICAsIHN1YkhyZWYgPSBzdWJMaW5rLmhyZWY7XG4gICAgICAgICAgaWYodHlwZW9mIHN1YkxpbmsudGVtcGxhdGVkICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgc3ViTGluay50ZW1wbGF0ZWQpIHtcbiAgICAgICAgICAgIHN1YkhyZWYgPSBnZW5lcmF0ZVVybChzdWJMaW5rLmhyZWYsIHBhcmFtZXRlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdWJIcmVmID0gJGhhbENvbmZpZ3VyYXRpb24udXJsVHJhbnNmb3JtZXIoc3ViSHJlZik7XG4gICAgICAgICAgaHJlZi5wdXNoKHN1YkhyZWYpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZih0eXBlb2YgbGluay50ZW1wbGF0ZWQgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgbGluay50ZW1wbGF0ZWQpIHtcbiAgICAgICAgICBocmVmID0gZ2VuZXJhdGVVcmwobGluay5ocmVmLCBwYXJhbWV0ZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhyZWYgPSAkaGFsQ29uZmlndXJhdGlvbi51cmxUcmFuc2Zvcm1lcihocmVmKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhyZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGEgbGlua1xuICAgICAqXG4gICAgICogISEgVG8gZ2V0IGEgaHJlZiwgdXNlICRocmVmIGluc3RlYWQgISFcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZWxcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGxpbmsocmVsKSB7XG4gICAgICBpZighJGhhc0xpbmsocmVsKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2xpbmsgXCInICsgcmVsICsgJ1wiIGlzIHVuZGVmaW5lZCcpO1xuICAgICAgfVxuICAgICAgdmFyIGxpbmsgPSBsaW5rc1tyZWxdO1xuICAgICAgcmV0dXJuIGxpbms7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IG1ldGEgcHJvcGVydGllc1xuICAgICAqXG4gICAgICogISEgVG8gZ2V0IGEgaHJlZiwgdXNlICRocmVmIGluc3RlYWQgISFcbiAgICAgKiAhISBUbyBnZXQgYSBsaW5rLCB1c2UgJGxpbmsgaW5zdGVhZCAhIVxuICAgICAqICEhIFRvIGdldCBhbiBlbWJlZGRlZCByZXNvdXJjZSwgdXNlICRyZXF1ZXN0KCkuJGdldChyZWwpIGluc3RlYWQgISFcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZWxcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJG1ldGEobmFtZSkge1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8ICRoYWxDb25maWd1cmF0aW9uLmlnbm9yZUF0dHJpYnV0ZVByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBmdWxsTmFtZSA9ICRoYWxDb25maWd1cmF0aW9uLmlnbm9yZUF0dHJpYnV0ZVByZWZpeGVzW2ldICsgbmFtZTtcbiAgICAgICAgcmV0dXJuIGRhdGFbZnVsbE5hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgT3JpZ2luYWwgUmVzcG9uc2VcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge09iamVjdCl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJHJlc3BvbnNlKCkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY2xpZW50IHRvIHBlcmZvcm0gcmVxdWVzdHNcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0hhbFJlc291cmNlQ2xpZW50KX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkcmVxdWVzdCgpIHtcbiAgICAgIHJldHVybiBjbGllbnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBhIEhUVFAgREVMRVRFIHJlcXVlc3Qgb24gc2VsZlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGRlbGV0ZSh1cmxQYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBjbGllbnQuJGRlbGV0ZSgkaGFsQ29uZmlndXJhdGlvbi5zZWxmTGluaywgdXJsUGFyYW1zLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCBQVVQgcmVxdWVzdCBvbiBzZWxmXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkcHV0KHBheWxvYWQsIHVybFBhcmFtcywgb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGNsaWVudC4kcHV0KCRoYWxDb25maWd1cmF0aW9uLnNlbGZMaW5rLCB1cmxQYXJhbXMsIHBheWxvYWQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIEdFVCByZXF1ZXN0IG9uIHNlbGZcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9IHVybFBhcmFtc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICRnZXQodXJsUGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ0dFVCcsICRoYWxDb25maWd1cmF0aW9uLnNlbGZMaW5rLCB1cmxQYXJhbXMsIHVuZGVmaW5lZCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gIH1cbn1cblJlc291cmNlRmFjdG9yeS4kaW5qZWN0ID0gW1xuICAnSGFsUmVzb3VyY2VDbGllbnQnLFxuICAnJGhhbENvbmZpZ3VyYXRpb24nXG5dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERlZmluZSByZWFkLW9ubHkgcHJvcGVydHkgaW4gdGFyZ2V0XG4gKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge21peGVkfSAgdmFsdWVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVmaW5lUmVhZE9ubHkodGFyZ2V0LCBrZXksIHZhbHVlKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwge1xuICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogdmFsdWUsXG4gICAgd3JpdGFibGU6IGZhbHNlLFxuICB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBFeHRlbmQgcHJvcGVydGllcyBmcm9tIGNvcHkgcmVhZC1vbmx5IHRvIHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IGNvcHlcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZXh0ZW5kUmVhZE9ubHkodGFyZ2V0LCBjb3B5KSB7XG4gIGZvcih2YXIga2V5IGluIGNvcHkpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBjb3B5W2tleV0sXG4gICAgfSk7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHJmYzY1NzAgZnJvbSAncmZjNjU3MC9zcmMvbWFpbic7XG5cbi8qKlxuICogR2VuZXJhdGUgdXJsIGZyb20gdGVtcGxhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRlbXBsYXRlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtZXRlcnNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2VuZXJhdGVVcmwodGVtcGxhdGUsIHBhcmFtZXRlcnMpIHtcbiAgcmV0dXJuIG5ldyByZmM2NTcwLlVyaVRlbXBsYXRlKHRlbXBsYXRlKS5zdHJpbmdpZnkocGFyYW1ldGVycyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCByZXNvbHZlVXJsIGZyb20gJy4uL3V0aWxpdHkvcmVzb2x2ZS11cmwnO1xuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlVXJsXG4gKiBAcGFyYW0ge21peGVkfSAgbGlua1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBub3JtYWxpemVMaW5rKGJhc2VVcmwsIGxpbmspIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkobGluaykpIHtcbiAgICByZXR1cm4gbGluay5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBub3JtYWxpemVMaW5rKGJhc2VVcmwsIGl0ZW0pO1xuICAgIH0pO1xuICB9XG4gIGlmKHR5cGVvZiBsaW5rID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB7XG4gICAgICBocmVmOiByZXNvbHZlVXJsKGJhc2VVcmwsIGxpbmspLFxuICAgIH07XG4gIH1cbiAgaWYodHlwZW9mIGxpbmsuaHJlZiA9PT0gJ3N0cmluZycpIHtcbiAgICBsaW5rLmhyZWYgPSByZXNvbHZlVXJsKGJhc2VVcmwsIGxpbmsuaHJlZik7XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cbiAgaWYoQXJyYXkuaXNBcnJheShsaW5rLmhyZWYpKSB7XG4gICAgcmV0dXJuIGxpbmsuaHJlZi5tYXAoZnVuY3Rpb24gKGhyZWYpIHtcbiAgICAgIHZhciBuZXdMaW5rID0gYW5ndWxhci5leHRlbmQoe30sIGxpbmssIHtcbiAgICAgICAgaHJlZjogaHJlZixcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZUxpbmsoYmFzZVVybCwgbmV3TGluayk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBocmVmOiBiYXNlVXJsLFxuICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFJlc29sdmUgd2hvbGUgVVJMXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGJhc2VVcmxcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlc29sdmVVcmwoYmFzZVVybCwgcGF0aCkge1xuICB2YXIgcmVzdWx0SHJlZiA9ICcnXG4gICAgLCByZUZ1bGxVcmwgPSAvXigoPzpcXHcrXFw6KT8pKCg/OlxcL1xcLyk/KShbXlxcL10qKSgoPzpcXC8uKik/KSQvXG4gICAgLCBiYXNlSHJlZk1hdGNoID0gcmVGdWxsVXJsLmV4ZWMoYmFzZVVybClcbiAgICAsIGhyZWZNYXRjaCA9IHJlRnVsbFVybC5leGVjKHBhdGgpO1xuXG4gIGZvciAodmFyIHBhcnRJbmRleCA9IDE7IHBhcnRJbmRleCA8IDU7IHBhcnRJbmRleCsrKSB7XG4gICAgaWYgKGhyZWZNYXRjaFtwYXJ0SW5kZXhdKSB7XG4gICAgICByZXN1bHRIcmVmICs9IGhyZWZNYXRjaFtwYXJ0SW5kZXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRIcmVmICs9IGJhc2VIcmVmTWF0Y2hbcGFydEluZGV4XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0SHJlZjtcbn1cbiJdfQ==
=======
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvY29udGVudC10eXBlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JmYzY1NzAvc3JjL1JvdXRlci5qcyIsIm5vZGVfbW9kdWxlcy9yZmM2NTcwL3NyYy9VcmlUZW1wbGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9yZmM2NTcwL3NyYy9tYWluLmpzIiwic3JjL2NsaWVudC9oYWwtY2xpZW50LmpzIiwic3JjL2NsaWVudC9pbmRleC5qcyIsInNyYy9jbGllbnQvbGluay1oZWFkZXIuanMiLCJzcmMvY29uZmlndXJhdGlvbi9oYWwtY29uZmlndXJhdGlvbi5wcm92aWRlci5qcyIsInNyYy9jb25maWd1cmF0aW9uL2luZGV4LmpzIiwic3JjL2h0dHAtaW50ZXJjZXB0aW9uL2h0dHAtaW50ZXJjZXB0aW9uLmNvbmZpZy5qcyIsInNyYy9odHRwLWludGVyY2VwdGlvbi9pbmRleC5qcyIsInNyYy9odHRwLWludGVyY2VwdGlvbi9yZXNvdXJjZS1odHRwLWludGVyY2VwdG9yLmZhY3RvcnkuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvcmVzb3VyY2UvaGFsLXJlc291cmNlLWNsaWVudC5mYWN0b3J5LmpzIiwic3JjL3Jlc291cmNlL2luZGV4LmpzIiwic3JjL3Jlc291cmNlL3Jlc291cmNlLmZhY3RvcnkuanMiLCJzcmMvdXRpbGl0eS9kZWZpbmUtcmVhZC1vbmx5LmpzIiwic3JjL3V0aWxpdHkvZXh0ZW5kLXJlYWQtb25seS5qcyIsInNyYy91dGlsaXR5L2dlbmVyYXRlLXVybC5qcyIsInNyYy91dGlsaXR5L25vcm1hbGl6ZS1saW5rLmpzIiwic3JjL3V0aWxpdHkvcmVzb2x2ZS11cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUdEOzs7QUNuQ0Q7Ozs7Ozs7Ozs7Ozs7a0JBU3dCLFU7QUFBVCxTQUFTLFVBQVQsQ0FBb0IsT0FBcEIsRUFBNkIsSUFBN0IsRUFBbUM7QUFDaEQsTUFBSSxhQUFhLEVBQWpCO01BQ0ksWUFBWSw4Q0FEaEI7TUFFSSxnQkFBZ0IsVUFBVSxJQUFWLENBQWUsT0FBZixDQUZwQjtNQUdJLFlBQVksVUFBVSxJQUFWLENBQWUsSUFBZixDQUhoQjs7QUFLQSxPQUFLLElBQUksWUFBWSxDQUFyQixFQUF3QixZQUFZLENBQXBDLEVBQXVDLFdBQXZDLEVBQW9EO0FBQ2xELFFBQUksVUFBVSxTQUFWLENBQUosRUFBMEI7QUFDeEIsb0JBQWMsVUFBVSxTQUFWLENBQWQ7QUFDRCxLQUZELE1BRU87QUFDTCxvQkFBYyxjQUFjLFNBQWQsQ0FBZDtBQUNEO0FBQ0Y7O0FBRUQsU0FBTyxVQUFQO0FBQ0QiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBjb250ZW50LXR5cGVcbiAqIENvcHlyaWdodChjKSAyMDE1IERvdWdsYXMgQ2hyaXN0b3BoZXIgV2lsc29uXG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4vKipcbiAqIFJlZ0V4cCB0byBtYXRjaCAqKCBcIjtcIiBwYXJhbWV0ZXIgKSBpbiBSRkMgNzIzMSBzZWMgMy4xLjEuMVxuICpcbiAqIHBhcmFtZXRlciAgICAgPSB0b2tlbiBcIj1cIiAoIHRva2VuIC8gcXVvdGVkLXN0cmluZyApXG4gKiB0b2tlbiAgICAgICAgID0gMSp0Y2hhclxuICogdGNoYXIgICAgICAgICA9IFwiIVwiIC8gXCIjXCIgLyBcIiRcIiAvIFwiJVwiIC8gXCImXCIgLyBcIidcIiAvIFwiKlwiXG4gKiAgICAgICAgICAgICAgIC8gXCIrXCIgLyBcIi1cIiAvIFwiLlwiIC8gXCJeXCIgLyBcIl9cIiAvIFwiYFwiIC8gXCJ8XCIgLyBcIn5cIlxuICogICAgICAgICAgICAgICAvIERJR0lUIC8gQUxQSEFcbiAqICAgICAgICAgICAgICAgOyBhbnkgVkNIQVIsIGV4Y2VwdCBkZWxpbWl0ZXJzXG4gKiBxdW90ZWQtc3RyaW5nID0gRFFVT1RFICooIHFkdGV4dCAvIHF1b3RlZC1wYWlyICkgRFFVT1RFXG4gKiBxZHRleHQgICAgICAgID0gSFRBQiAvIFNQIC8gJXgyMSAvICV4MjMtNUIgLyAleDVELTdFIC8gb2JzLXRleHRcbiAqIG9icy10ZXh0ICAgICAgPSAleDgwLUZGXG4gKiBxdW90ZWQtcGFpciAgID0gXCJcXFwiICggSFRBQiAvIFNQIC8gVkNIQVIgLyBvYnMtdGV4dCApXG4gKi9cbnZhciBwYXJhbVJlZ0V4cCA9IC87ICooWyEjJCUmJ1xcKlxcK1xcLVxcLlxcXl9gXFx8fjAtOUEtWmEtel0rKSAqPSAqKFwiKD86W1xcdTAwMGJcXHUwMDIwXFx1MDAyMVxcdTAwMjMtXFx1MDA1YlxcdTAwNWQtXFx1MDA3ZVxcdTAwODAtXFx1MDBmZl18XFxcXFtcXHUwMDBiXFx1MDAyMC1cXHUwMGZmXSkqXCJ8WyEjJCUmJ1xcKlxcK1xcLVxcLlxcXl9gXFx8fjAtOUEtWmEtel0rKSAqL2dcbnZhciB0ZXh0UmVnRXhwID0gL15bXFx1MDAwYlxcdTAwMjAtXFx1MDA3ZVxcdTAwODAtXFx1MDBmZl0rJC9cbnZhciB0b2tlblJlZ0V4cCA9IC9eWyEjJCUmJ1xcKlxcK1xcLVxcLlxcXl9gXFx8fjAtOUEtWmEtel0rJC9cblxuLyoqXG4gKiBSZWdFeHAgdG8gbWF0Y2ggcXVvdGVkLXBhaXIgaW4gUkZDIDcyMzAgc2VjIDMuMi42XG4gKlxuICogcXVvdGVkLXBhaXIgPSBcIlxcXCIgKCBIVEFCIC8gU1AgLyBWQ0hBUiAvIG9icy10ZXh0IClcbiAqIG9icy10ZXh0ICAgID0gJXg4MC1GRlxuICovXG52YXIgcWVzY1JlZ0V4cCA9IC9cXFxcKFtcXHUwMDBiXFx1MDAyMC1cXHUwMGZmXSkvZ1xuXG4vKipcbiAqIFJlZ0V4cCB0byBtYXRjaCBjaGFycyB0aGF0IG11c3QgYmUgcXVvdGVkLXBhaXIgaW4gUkZDIDcyMzAgc2VjIDMuMi42XG4gKi9cbnZhciBxdW90ZVJlZ0V4cCA9IC8oW1xcXFxcIl0pL2dcblxuLyoqXG4gKiBSZWdFeHAgdG8gbWF0Y2ggdHlwZSBpbiBSRkMgNjgzOFxuICpcbiAqIG1lZGlhLXR5cGUgPSB0eXBlIFwiL1wiIHN1YnR5cGVcbiAqIHR5cGUgICAgICAgPSB0b2tlblxuICogc3VidHlwZSAgICA9IHRva2VuXG4gKi9cbnZhciB0eXBlUmVnRXhwID0gL15bISMkJSYnXFwqXFwrXFwtXFwuXFxeX2BcXHx+MC05QS1aYS16XStcXC9bISMkJSYnXFwqXFwrXFwtXFwuXFxeX2BcXHx+MC05QS1aYS16XSskL1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICogQHB1YmxpY1xuICovXG5cbmV4cG9ydHMuZm9ybWF0ID0gZm9ybWF0XG5leHBvcnRzLnBhcnNlID0gcGFyc2VcblxuLyoqXG4gKiBGb3JtYXQgb2JqZWN0IHRvIG1lZGlhIHR5cGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9ialxuICogQHJldHVybiB7c3RyaW5nfVxuICogQHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGZvcm1hdChvYmopIHtcbiAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBvYmogaXMgcmVxdWlyZWQnKVxuICB9XG5cbiAgdmFyIHBhcmFtZXRlcnMgPSBvYmoucGFyYW1ldGVyc1xuICB2YXIgdHlwZSA9IG9iai50eXBlXG5cbiAgaWYgKCF0eXBlIHx8ICF0eXBlUmVnRXhwLnRlc3QodHlwZSkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIHR5cGUnKVxuICB9XG5cbiAgdmFyIHN0cmluZyA9IHR5cGVcblxuICAvLyBhcHBlbmQgcGFyYW1ldGVyc1xuICBpZiAocGFyYW1ldGVycyAmJiB0eXBlb2YgcGFyYW1ldGVycyA9PT0gJ29iamVjdCcpIHtcbiAgICB2YXIgcGFyYW1cbiAgICB2YXIgcGFyYW1zID0gT2JqZWN0LmtleXMocGFyYW1ldGVycykuc29ydCgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgcGFyYW0gPSBwYXJhbXNbaV1cblxuICAgICAgaWYgKCF0b2tlblJlZ0V4cC50ZXN0KHBhcmFtKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIHBhcmFtZXRlciBuYW1lJylcbiAgICAgIH1cblxuICAgICAgc3RyaW5nICs9ICc7ICcgKyBwYXJhbSArICc9JyArIHFzdHJpbmcocGFyYW1ldGVyc1twYXJhbV0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHN0cmluZ1xufVxuXG4vKipcbiAqIFBhcnNlIG1lZGlhIHR5cGUgdG8gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gc3RyaW5nXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAcHVibGljXG4gKi9cblxuZnVuY3Rpb24gcGFyc2Uoc3RyaW5nKSB7XG4gIGlmICghc3RyaW5nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgc3RyaW5nIGlzIHJlcXVpcmVkJylcbiAgfVxuXG4gIGlmICh0eXBlb2Ygc3RyaW5nID09PSAnb2JqZWN0Jykge1xuICAgIC8vIHN1cHBvcnQgcmVxL3Jlcy1saWtlIG9iamVjdHMgYXMgYXJndW1lbnRcbiAgICBzdHJpbmcgPSBnZXRjb250ZW50dHlwZShzdHJpbmcpXG5cbiAgICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NvbnRlbnQtdHlwZSBoZWFkZXIgaXMgbWlzc2luZyBmcm9tIG9iamVjdCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHN0cmluZyBpcyByZXF1aXJlZCB0byBiZSBhIHN0cmluZycpXG4gIH1cblxuICB2YXIgaW5kZXggPSBzdHJpbmcuaW5kZXhPZignOycpXG4gIHZhciB0eXBlID0gaW5kZXggIT09IC0xXG4gICAgPyBzdHJpbmcuc3Vic3RyKDAsIGluZGV4KS50cmltKClcbiAgICA6IHN0cmluZy50cmltKClcblxuICBpZiAoIXR5cGVSZWdFeHAudGVzdCh0eXBlKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2ludmFsaWQgbWVkaWEgdHlwZScpXG4gIH1cblxuICB2YXIga2V5XG4gIHZhciBtYXRjaFxuICB2YXIgb2JqID0gbmV3IENvbnRlbnRUeXBlKHR5cGUudG9Mb3dlckNhc2UoKSlcbiAgdmFyIHZhbHVlXG5cbiAgcGFyYW1SZWdFeHAubGFzdEluZGV4ID0gaW5kZXhcblxuICB3aGlsZSAobWF0Y2ggPSBwYXJhbVJlZ0V4cC5leGVjKHN0cmluZykpIHtcbiAgICBpZiAobWF0Y2guaW5kZXggIT09IGluZGV4KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIHBhcmFtZXRlciBmb3JtYXQnKVxuICAgIH1cblxuICAgIGluZGV4ICs9IG1hdGNoWzBdLmxlbmd0aFxuICAgIGtleSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKClcbiAgICB2YWx1ZSA9IG1hdGNoWzJdXG5cbiAgICBpZiAodmFsdWVbMF0gPT09ICdcIicpIHtcbiAgICAgIC8vIHJlbW92ZSBxdW90ZXMgYW5kIGVzY2FwZXNcbiAgICAgIHZhbHVlID0gdmFsdWVcbiAgICAgICAgLnN1YnN0cigxLCB2YWx1ZS5sZW5ndGggLSAyKVxuICAgICAgICAucmVwbGFjZShxZXNjUmVnRXhwLCAnJDEnKVxuICAgIH1cblxuICAgIG9iai5wYXJhbWV0ZXJzW2tleV0gPSB2YWx1ZVxuICB9XG5cbiAgaWYgKGluZGV4ICE9PSAtMSAmJiBpbmRleCAhPT0gc3RyaW5nLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2ludmFsaWQgcGFyYW1ldGVyIGZvcm1hdCcpXG4gIH1cblxuICByZXR1cm4gb2JqXG59XG5cbi8qKlxuICogR2V0IGNvbnRlbnQtdHlwZSBmcm9tIHJlcS9yZXMgb2JqZWN0cy5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZ2V0Y29udGVudHR5cGUob2JqKSB7XG4gIGlmICh0eXBlb2Ygb2JqLmdldEhlYWRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIHJlcy1saWtlXG4gICAgcmV0dXJuIG9iai5nZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScpXG4gIH1cblxuICBpZiAodHlwZW9mIG9iai5oZWFkZXJzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIHJlcS1saWtlXG4gICAgcmV0dXJuIG9iai5oZWFkZXJzICYmIG9iai5oZWFkZXJzWydjb250ZW50LXR5cGUnXVxuICB9XG59XG5cbi8qKlxuICogUXVvdGUgYSBzdHJpbmcgaWYgbmVjZXNzYXJ5LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqIEBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcXN0cmluZyh2YWwpIHtcbiAgdmFyIHN0ciA9IFN0cmluZyh2YWwpXG5cbiAgLy8gbm8gbmVlZCB0byBxdW90ZSB0b2tlbnNcbiAgaWYgKHRva2VuUmVnRXhwLnRlc3Qoc3RyKSkge1xuICAgIHJldHVybiBzdHJcbiAgfVxuXG4gIGlmIChzdHIubGVuZ3RoID4gMCAmJiAhdGV4dFJlZ0V4cC50ZXN0KHN0cikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIHBhcmFtZXRlciB2YWx1ZScpXG4gIH1cblxuICByZXR1cm4gJ1wiJyArIHN0ci5yZXBsYWNlKHF1b3RlUmVnRXhwLCAnXFxcXCQxJykgKyAnXCInXG59XG5cbi8qKlxuICogQ2xhc3MgdG8gcmVwcmVzZW50IGEgY29udGVudCB0eXBlLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gQ29udGVudFR5cGUodHlwZSkge1xuICB0aGlzLnBhcmFtZXRlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHRoaXMudHlwZSA9IHR5cGVcbn1cbiIsIi8qIGpzaGludCBub2RlOnRydWUgKi9cblxudmFyIFVyaVRlbXBsYXRlID0gcmVxdWlyZSgnLi9VcmlUZW1wbGF0ZScpO1xuXG5mdW5jdGlvbiBSb3V0ZXIoKSB7XG4gICAgdmFyIHJvdXRlcyA9IFtdO1xuXG4gICAgdGhpcy5hZGQgPSBmdW5jdGlvbiAodGVtcGxhdGUsIGhhbmRsZXIpIHtcblxuICAgICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogbmV3IFVyaVRlbXBsYXRlKHRlbXBsYXRlKSxcbiAgICAgICAgICAgIGhhbmRsZXI6IGhhbmRsZXJcbiAgICAgICAgfSk7IC8vXG5cbiAgICB9OyAvL2FkZFxuXG4gICAgdGhpcy5oYW5kbGUgPSBmdW5jdGlvbiAodXJsKSB7XG5cbiAgICAgICAgcmV0dXJuIHJvdXRlcy5zb21lKGZ1bmN0aW9uIChyb3V0ZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByb3V0ZS50ZW1wbGF0ZS5wYXJzZSh1cmwpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEgJiYgcm91dGUuaGFuZGxlcihkYXRhKSAhPT0gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgfTsgLy9leGVjXG5cbn0gLy9Sb3V0ZXJcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7IiwiLyoganNoaW50IG5vZGU6dHJ1ZSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVyaVRlbXBsYXRlO1xuXG5cbnZhciBvcGVyYXRvck9wdGlvbnMgPSB7XG4gICAgXCJcIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIlwiLFxuICAgICAgICBcInNlcGVyYXRvclwiOiBcIixcIixcbiAgICAgICAgXCJhc3NpZ25tZW50XCI6IGZhbHNlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IGZhbHNlLFxuICAgICAgICBcImVuY29kZVwiOiBwZXJjZW50RW5jb2RlXG4gICAgfSxcbiAgICBcIitcIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIlwiLFxuICAgICAgICBcInNlcGVyYXRvclwiOiBcIixcIixcbiAgICAgICAgXCJhc3NpZ25tZW50XCI6IGZhbHNlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IGZhbHNlLFxuICAgICAgICBcImVuY29kZVwiOiBlbmNvZGVVUklcbiAgICB9LFxuICAgIFwiI1wiOiB7XG4gICAgICAgIFwicHJlZml4XCI6IFwiI1wiLFxuICAgICAgICBcInNlcGVyYXRvclwiOiBcIixcIixcbiAgICAgICAgXCJhc3NpZ25tZW50XCI6IGZhbHNlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IGZhbHNlLFxuICAgICAgICBcImVuY29kZVwiOiBlbmNvZGVVUklcbiAgICB9LFxuICAgIFwiLlwiOiB7XG4gICAgICAgIFwicHJlZml4XCI6IFwiLlwiLFxuICAgICAgICBcInNlcGVyYXRvclwiOiBcIi5cIixcbiAgICAgICAgXCJhc3NpZ25tZW50XCI6IGZhbHNlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IGZhbHNlLFxuICAgICAgICBcImVuY29kZVwiOiBwZXJjZW50RW5jb2RlXG4gICAgfSxcbiAgICBcIi9cIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIi9cIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCIvXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiBmYWxzZSxcbiAgICAgICAgXCJlbmNvZGVcIjogZW5jb2RlVVJJQ29tcG9uZW50XG4gICAgfSxcbiAgICBcIjtcIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIjtcIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCI7XCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiB0cnVlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IGZhbHNlLFxuICAgICAgICBcImVuY29kZVwiOiBlbmNvZGVVUklDb21wb25lbnRcbiAgICB9LFxuICAgIFwiP1wiOiB7XG4gICAgICAgIFwicHJlZml4XCI6IFwiP1wiLFxuICAgICAgICBcInNlcGVyYXRvclwiOiBcIiZcIixcbiAgICAgICAgXCJhc3NpZ25tZW50XCI6IHRydWUsXG4gICAgICAgIFwiYXNzaWduRW1wdHlcIjogdHJ1ZSxcbiAgICAgICAgXCJlbmNvZGVcIjogZW5jb2RlVVJJQ29tcG9uZW50XG4gICAgfSxcbiAgICBcIiZcIjoge1xuICAgICAgICBcInByZWZpeFwiOiBcIiZcIixcbiAgICAgICAgXCJzZXBlcmF0b3JcIjogXCImXCIsXG4gICAgICAgIFwiYXNzaWdubWVudFwiOiB0cnVlLFxuICAgICAgICBcImFzc2lnbkVtcHR5XCI6IHRydWUsXG4gICAgICAgIFwiZW5jb2RlXCI6IGVuY29kZVVSSUNvbXBvbmVudFxuICAgIH1cbn07IC8vb3BlcmF0b3JPcHRpb25zXG5cbmZ1bmN0aW9uIHBlcmNlbnRFbmNvZGUodmFsdWUpIHtcbiAgICAvKlxuXHRodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMi4zXG5cdCovXG4gICAgdmFyIHVucmVzZXJ2ZWQgPSBcIi0uX35cIjtcblxuICAgIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpIHJldHVybiAnJztcblxuICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcblxuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwodmFsdWUsIGZ1bmN0aW9uIChjaCkge1xuICAgICAgICB2YXIgY2hhckNvZGUgPSBjaC5jaGFyQ29kZUF0KDApO1xuXG4gICAgICAgIGlmIChjaGFyQ29kZSA+PSAweDMwICYmIGNoYXJDb2RlIDw9IDB4MzkpIHJldHVybiBjaDtcbiAgICAgICAgaWYgKGNoYXJDb2RlID49IDB4NDEgJiYgY2hhckNvZGUgPD0gMHg1YSkgcmV0dXJuIGNoO1xuICAgICAgICBpZiAoY2hhckNvZGUgPj0gMHg2MSAmJiBjaGFyQ29kZSA8PSAweDdhKSByZXR1cm4gY2g7XG5cbiAgICAgICAgaWYgKH51bnJlc2VydmVkLmluZGV4T2YoY2gpKSByZXR1cm4gY2g7XG5cbiAgICAgICAgcmV0dXJuICclJyArIGNoYXJDb2RlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuICAgIH0pLmpvaW4oJycpO1xuXG59IC8vcGVyY2VudEVuY29kZVxuXG5mdW5jdGlvbiBpc0RlZmluZWQodmFsdWUpIHtcbiAgICByZXR1cm4gIWlzVW5kZWZpbmVkKHZhbHVlKTtcbn0gLy9pc0RlZmluZWRcbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gICAgLypcblx0aHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjU3MCNzZWN0aW9uLTIuM1xuXHQqL1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59IC8vaXNVbmRlZmluZWRcblxuXG5mdW5jdGlvbiBVcmlUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICAgIC8qXG5cdGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY1NzAjc2VjdGlvbi0yLjJcblxuXHRleHByZXNzaW9uICAgID0gIFwie1wiIFsgb3BlcmF0b3IgXSB2YXJpYWJsZS1saXN0IFwifVwiXG5cdG9wZXJhdG9yICAgICAgPSAgb3AtbGV2ZWwyIC8gb3AtbGV2ZWwzIC8gb3AtcmVzZXJ2ZVxuXHRvcC1sZXZlbDIgICAgID0gIFwiK1wiIC8gXCIjXCJcblx0b3AtbGV2ZWwzICAgICA9ICBcIi5cIiAvIFwiL1wiIC8gXCI7XCIgLyBcIj9cIiAvIFwiJlwiXG5cdG9wLXJlc2VydmUgICAgPSAgXCI9XCIgLyBcIixcIiAvIFwiIVwiIC8gXCJAXCIgLyBcInxcIlxuXHQqL1xuICAgIHZhciByZVRlbXBsYXRlID0gL1xceyhbXFwrI1xcLlxcLztcXD8mPVxcLCFAXFx8XT8pKFtBLVphLXowLTlfXFwsXFwuXFw6XFwqXSs/KVxcfS9nO1xuICAgIHZhciByZVZhcmlhYmxlID0gL14oW1xcJF9hLXpdW1xcJF9hLXowLTldKikoKD86XFw6WzEtOV1bMC05XT9bMC05XT9bMC05XT8pPykoXFwqPykkL2k7XG4gICAgdmFyIG1hdGNoO1xuICAgIHZhciBwaWVjZXMgPSBbXTtcbiAgICB2YXIgZ2x1ZXMgPSBbXTtcbiAgICB2YXIgb2Zmc2V0ID0gMDtcbiAgICB2YXIgcGllY2VDb3VudCA9IDA7XG5cbiAgICB3aGlsZSAoICEhIChtYXRjaCA9IHJlVGVtcGxhdGUuZXhlYyh0ZW1wbGF0ZSkpKSB7XG4gICAgICAgIGdsdWVzLnB1c2godGVtcGxhdGUuc3Vic3RyaW5nKG9mZnNldCwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgLypcblx0XHRUaGUgb3BlcmF0b3IgY2hhcmFjdGVycyBlcXVhbHMgKFwiPVwiKSwgY29tbWEgKFwiLFwiKSwgZXhjbGFtYXRpb24gKFwiIVwiKSxcblx0XHRhdCBzaWduIChcIkBcIiksIGFuZCBwaXBlIChcInxcIikgYXJlIHJlc2VydmVkIGZvciBmdXR1cmUgZXh0ZW5zaW9ucy5cblx0XHQqL1xuICAgICAgICBpZiAobWF0Y2hbMV0gJiYgfic9LCFAfCcuaW5kZXhPZihtYXRjaFsxXSkpIHtcbiAgICAgICAgICAgIHRocm93IFwib3BlcmF0b3IgJ1wiICsgbWF0Y2hbMV0gKyBcIicgaXMgcmVzZXJ2ZWQgZm9yIGZ1dHVyZSBleHRlbnNpb25zXCI7XG4gICAgICAgIH1cblxuICAgICAgICBvZmZzZXQgPSBtYXRjaC5pbmRleDtcbiAgICAgICAgcGllY2VzLnB1c2goe1xuICAgICAgICAgICAgb3BlcmF0b3I6IG1hdGNoWzFdLFxuICAgICAgICAgICAgdmFyaWFibGVzOiBtYXRjaFsyXS5zcGxpdCgnLCcpLm1hcCh2YXJpYWJsZU1hcHBlcilcbiAgICAgICAgfSk7XG4gICAgICAgIG9mZnNldCArPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIHBpZWNlQ291bnQrKztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YXJpYWJsZU1hcHBlcih2YXJpYWJsZSkge1xuICAgICAgICB2YXIgbWF0Y2ggPSByZVZhcmlhYmxlLmV4ZWModmFyaWFibGUpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogbWF0Y2hbMV0sXG4gICAgICAgICAgICBtYXhMZW5ndGg6IG1hdGNoWzJdICYmIHBhcnNlSW50KG1hdGNoWzJdLnN1YnN0cmluZygxKSwgMTApLFxuICAgICAgICAgICAgY29tcG9zaXRlOiAhISBtYXRjaFszXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGdsdWVzLnB1c2godGVtcGxhdGUuc3Vic3RyaW5nKG9mZnNldCkpO1xuXG4gICAgdGhpcy5wYXJzZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgdmFyIG9mZnNldCA9IDA7XG4gICAgICAgIHZhciBvZmZzZXRzID0gW107XG5cbiAgICAgICAgaWYgKCFnbHVlcy5ldmVyeShmdW5jdGlvbiAoZ2x1ZSwgZ2x1ZUluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgICAgICBpZiAoZ2x1ZUluZGV4ID4gMCAmJiBnbHVlID09PSAnJykgaW5kZXggPSBzdHIubGVuZ3RoO1xuICAgICAgICAgICAgZWxzZSBpbmRleCA9IHN0ci5pbmRleE9mKGdsdWUsIG9mZnNldCk7XG5cbiAgICAgICAgICAgIG9mZnNldCA9IGluZGV4O1xuICAgICAgICAgICAgb2Zmc2V0cy5wdXNoKG9mZnNldCk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gZ2x1ZS5sZW5ndGg7XG5cbiAgICAgICAgICAgIHJldHVybn4gaW5kZXg7XG4gICAgICAgIH0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgaWYgKCFwaWVjZXMuZXZlcnkoZnVuY3Rpb24gKHBpZWNlLCBwaWVjZUluZGV4KSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IG9wZXJhdG9yT3B0aW9uc1twaWVjZS5vcGVyYXRvcl07XG4gICAgICAgICAgICB2YXIgdmFsdWUsIHZhbHVlcztcbiAgICAgICAgICAgIHZhciBvZmZzZXRCZWdpbiA9IG9mZnNldHNbcGllY2VJbmRleF0gKyBnbHVlc1twaWVjZUluZGV4XS5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0RW5kID0gb2Zmc2V0c1twaWVjZUluZGV4ICsgMV07XG5cbiAgICAgICAgICAgIHZhbHVlID0gc3RyLnN1YnN0cmluZyhvZmZzZXRCZWdpbiwgb2Zmc2V0RW5kKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKHZhbHVlLnN1YnN0cmluZygwLCBvcHRpb25zLnByZWZpeC5sZW5ndGgpICE9PSBvcHRpb25zLnByZWZpeCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHJpbmcob3B0aW9ucy5wcmVmaXgubGVuZ3RoKTtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlLnNwbGl0KG9wdGlvbnMuc2VwZXJhdG9yKTtcblxuICAgICAgICAgICAgaWYgKCFwaWVjZS52YXJpYWJsZXMuZXZlcnkoZnVuY3Rpb24gKHZhcmlhYmxlLCB2YXJpYWJsZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdmFsdWVzW3ZhcmlhYmxlSW5kZXhdO1xuICAgICAgICAgICAgICAgIHZhciBuYW1lO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuXG4gICAgICAgICAgICAgICAgbmFtZSA9IHZhcmlhYmxlLm5hbWU7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hc3NpZ25tZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5zdWJzdHJpbmcoMCwgbmFtZS5sZW5ndGgpICE9PSBuYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyaW5nKG5hbWUubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiBvcHRpb25zLmFzc2lnbkVtcHR5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWVbMF0gIT09ICc9JykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGRhdGFbbmFtZV0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgfSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9OyAvL3BhcnNlXG5cbiAgICB0aGlzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgICAgZGF0YSA9IGRhdGEgfHwge307XG5cbiAgICAgICAgc3RyICs9IGdsdWVzWzBdO1xuICAgICAgICBpZiAoIXBpZWNlcy5ldmVyeShmdW5jdGlvbiAocGllY2UsIHBpZWNlSW5kZXgpIHtcblxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBvcGVyYXRvck9wdGlvbnNbcGllY2Uub3BlcmF0b3JdO1xuICAgICAgICAgICAgdmFyIHBhcnRzO1xuXG4gICAgICAgICAgICBwYXJ0cyA9IHBpZWNlLnZhcmlhYmxlcy5tYXAoZnVuY3Rpb24gKHZhcmlhYmxlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gZGF0YVt2YXJpYWJsZS5uYW1lXTtcblxuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHZhbHVlID0gW3ZhbHVlXTtcblxuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKSByZXR1cm4gbnVsbDtcblxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS5jb21wb3NpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE9iamVjdC5rZXlzKHZhbHVlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5VmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUubWF4TGVuZ3RoKSBrZXlWYWx1ZSA9IGtleVZhbHVlLnN1YnN0cmluZygwLCB2YXJpYWJsZS5tYXhMZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleVZhbHVlID0gb3B0aW9ucy5lbmNvZGUoa2V5VmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXlWYWx1ZSkga2V5VmFsdWUgPSBrZXkgKyAnPScgKyBrZXlWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlWYWx1ZSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFzc2lnbkVtcHR5KSBrZXlWYWx1ZSArPSAnPSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5VmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbihvcHRpb25zLnNlcGVyYXRvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLm1heExlbmd0aCkgdmFsdWUgPSB2YWx1ZS5zdWJzdHJpbmcoMCwgdmFyaWFibGUubWF4TGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb3B0aW9ucy5lbmNvZGUodmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYXNzaWdubWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHZhbHVlID0gdmFyaWFibGUubmFtZSArICc9JyArIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFyaWFibGUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFzc2lnbkVtcHR5KSB2YWx1ZSArPSAnPSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5qb2luKG9wdGlvbnMuc2VwZXJhdG9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5VmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFibGUubWF4TGVuZ3RoKSBrZXlWYWx1ZSA9IGtleVZhbHVlLnN1YnN0cmluZygwLCB2YXJpYWJsZS5tYXhMZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5ICsgJywnICsgb3B0aW9ucy5lbmNvZGUoa2V5VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlLm1heExlbmd0aCkgdmFsdWUgPSB2YWx1ZS5zdWJzdHJpbmcoMCwgdmFyaWFibGUubWF4TGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmVuY29kZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuam9pbignLCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFzc2lnbm1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkgdmFsdWUgPSB2YXJpYWJsZS5uYW1lICsgJz0nICsgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhcmlhYmxlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYXNzaWduRW1wdHkpIHZhbHVlICs9ICc9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHBhcnRzID0gcGFydHMuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgICAgICAgICBpZiAoaXNEZWZpbmVkKHBhcnRzKSkge1xuICAgICAgICAgICAgICAgIHN0ciArPSBvcHRpb25zLnByZWZpeDtcbiAgICAgICAgICAgICAgICBzdHIgKz0gcGFydHMuam9pbihvcHRpb25zLnNlcGVyYXRvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0ciArPSBnbHVlc1twaWVjZUluZGV4ICsgMV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSkpIHJldHVybiBmYWxzZTtcblxuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH07IC8vc3RyaW5naWZ5XG5cbn0gLy9VcmlUZW1wbGF0ZSIsIi8qIGpzaGludCBub2RlOnRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUm91dGVyOiByZXF1aXJlKCcuL1JvdXRlcicpLFxuICAgIFVyaVRlbXBsYXRlOiByZXF1aXJlKCcuL1VyaVRlbXBsYXRlJylcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIFRoZSBoYWxDbGllbnQgc2VydmljZSBpcyBkZXByZWNhdGVkLiBQbGVhc2UgdXNlICRodHRwIGRpcmVjdGx5IGluc3RlYWQuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhhbENsaWVudCB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge0xvZ30gICAgICAkbG9nXG4gICAqIEBwYXJhbSB7SHR0cH0gICAgICRodHRwXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IExpbmtIZWFkZXJcbiAgICogQHBhcmFtIHtPYmplY3R9ICAgJGhhbENvbmZpZ3VyYXRpb25cbiAgICovXG4gIGNvbnN0cnVjdG9yKCRsb2csICRodHRwLCBMaW5rSGVhZGVyLCAkaGFsQ29uZmlndXJhdGlvbikge1xuICAgIHRoaXMuXyRsb2cgPSAkbG9nO1xuICAgIHRoaXMuXyRodHRwID0gJGh0dHA7XG4gICAgdGhpcy5fJGhhbENvbmZpZ3VyYXRpb24gPSAkaGFsQ29uZmlndXJhdGlvbjtcbiAgICB0aGlzLkxpbmtIZWFkZXIgPSBMaW5rSGVhZGVyO1xuICB9XG4gICRnZXQoaHJlZiwgb3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLiRyZXF1ZXN0KCdHRVQnLCBocmVmLCBvcHRpb25zKTtcbiAgfVxuICAkcG9zdChocmVmLCBvcHRpb25zLCBkYXRhKSB7XG4gICAgcmV0dXJuIHRoaXMuJHJlcXVlc3QoJ1BPU1QnLCBocmVmLCBvcHRpb25zLCBkYXRhKTtcbiAgfVxuICAkcHV0KGhyZWYsIG9wdGlvbnMsIGRhdGEpIHtcbiAgICByZXR1cm4gdGhpcy4kcmVxdWVzdCgnUFVUJywgaHJlZiwgb3B0aW9ucywgZGF0YSk7XG4gIH1cbiAgJHBhdGNoKGhyZWYsIG9wdGlvbnMsIGRhdGEpIHtcbiAgICByZXR1cm4gdGhpcy4kcmVxdWVzdCgnUEFUQ0gnLCBocmVmLCBvcHRpb25zLCBkYXRhKTtcbiAgfVxuICAkZGVsZXRlKGhyZWYsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy4kcmVxdWVzdCgnREVMRVRFJywgaHJlZiwgb3B0aW9ucyk7XG4gIH1cbiAgJGxpbmsoaHJlZiwgb3B0aW9ucywgbGlua0hlYWRlcnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgb3B0aW9ucy5oZWFkZXJzLkxpbmsgPSBsaW5rSGVhZGVycy5tYXAoZnVuY3Rpb24obGluaykgeyByZXR1cm4gbGluay50b1N0cmluZygpOyB9KTtcbiAgICByZXR1cm4gdGhpcy4kcmVxdWVzdCgnTElOSycsIGhyZWYsIG9wdGlvbnMpO1xuICB9XG4gICR1bmxpbmsoaHJlZiwgb3B0aW9ucywgbGlua0hlYWRlcnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgb3B0aW9ucy5oZWFkZXJzLkxpbmsgPSBsaW5rSGVhZGVycy5tYXAoZnVuY3Rpb24obGluaykgeyByZXR1cm4gbGluay50b1N0cmluZygpOyB9KTtcbiAgICByZXR1cm4gdGhpcy4kcmVxdWVzdCgnVU5MSU5LJywgaHJlZiwgb3B0aW9ucyk7XG4gIH1cbiAgJHJlcXVlc3QobWV0aG9kLCBocmVmLCBvcHRpb25zLCBkYXRhKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5fJGxvZy5sb2coJ1RoZSBoYWxDbGllbnQgc2VydmljZSBpcyBkZXByZWNhdGVkLiBQbGVhc2UgdXNlICRodHRwIGRpcmVjdGx5IGluc3RlYWQuJyk7XG4gICAgcmV0dXJuIHRoaXMuXyRodHRwKGFuZ3VsYXIuZXh0ZW5kKHt9LCBvcHRpb25zLCB7XG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIHVybDogdGhpcy5fJGhhbENvbmZpZ3VyYXRpb24udXJsVHJhbnNmb3JtZXIoaHJlZiksXG4gICAgICBkYXRhOiBkYXRhLFxuICAgIH0pKTtcbiAgfVxufVxuXG4vLyBJbmplY3QgRGVwZW5kZW5jaWVzXG5IYWxDbGllbnQuJGluamVjdCA9IFtcbiAgJyRsb2cnLFxuICAnJGh0dHAnLFxuICAnTGlua0hlYWRlcicsXG4gICckaGFsQ29uZmlndXJhdGlvbicsXG5dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBNT0RVTEVfTkFNRSA9ICdhbmd1bGFyLWhhbC5jbGllbnQnO1xuXG5pbXBvcnQgSGFsQ2xpZW50IGZyb20gJy4vaGFsLWNsaWVudCc7XG5pbXBvcnQgTGlua0hlYWRlciBmcm9tICcuL2xpbmstaGVhZGVyJztcblxuLy8gQWRkIG1vZHVsZSBmb3IgY2xpZW50XG5hbmd1bGFyXG4gIC5tb2R1bGUoTU9EVUxFX05BTUUsIFtdKVxuXG4gIC5zZXJ2aWNlKCdoYWxDbGllbnQnLCBIYWxDbGllbnQpXG4gIC5zZXJ2aWNlKCckaGFsQ2xpZW50JywgSGFsQ2xpZW50KVxuXG4gIC52YWx1ZSgnTGlua0hlYWRlcicsIExpbmtIZWFkZXIpXG47XG5cbmV4cG9ydCBkZWZhdWx0IE1PRFVMRV9OQU1FO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIExpbmsgSGVhZGVyXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbmtIZWFkZXIge1xuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVyaVJlZmVyZW5jZSBUaGUgTGluayBWYWx1ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gbGlua1BhcmFtcyAgIFRoZSBMaW5rIFBhcmFtc1xuICAgKi9cbiAgY29uc3RydWN0b3IodXJpUmVmZXJlbmNlLCBsaW5rUGFyYW1zKSB7XG4gICAgdGhpcy51cmlSZWZlcmVuY2UgPSB1cmlSZWZlcmVuY2U7XG4gICAgdGhpcy5saW5rUGFyYW1zID0gYW5ndWxhci5leHRlbmQoXG4gICAgICB7XG4gICAgICAgIHJlbDogbnVsbCxcbiAgICAgICAgYW5jaG9yOiBudWxsLFxuICAgICAgICByZXY6IG51bGwsXG4gICAgICAgIGhyZWZsYW5nOiBudWxsLFxuICAgICAgICBtZWRpYTogbnVsbCxcbiAgICAgICAgdGl0bGU6IG51bGwsXG4gICAgICAgIHR5cGU6IG51bGwsXG4gICAgICB9LFxuICAgICAgbGlua1BhcmFtc1xuICAgICk7XG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIHRvU3RyaW5nKCkge1xuICAgIHZhciByZXN1bHQgPSAnPCcgKyB0aGlzLnVyaVJlZmVyZW5jZSArICc+J1xuICAgICAgLCBwYXJhbXMgPSBbXTtcblxuICAgIGZvcihsZXQgcGFyYW1OYW1lIGluIHRoaXMubGlua1BhcmFtcykge1xuICAgICAgbGV0IHBhcmFtVmFsdWUgPSB0aGlzLmxpbmtQYXJhbXNbcGFyYW1OYW1lXTtcbiAgICAgIGlmKHBhcmFtVmFsdWUpIHtcbiAgICAgICAgcGFyYW1zLnB1c2gocGFyYW1OYW1lICsgJz1cIicgKyBwYXJhbVZhbHVlICsgJ1wiJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYocGFyYW1zLmxlbmd0aCA8IDEpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gcmVzdWx0ICsgJzsnICsgcGFyYW1zLmpvaW4oJzsnKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ31cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3BVcmxUcmFuc2Zvcm1lcih1cmwpIHtcbiAgcmV0dXJuIHVybDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGFsQ29uZmlndXJhdGlvblByb3ZpZGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fbGlua3NBdHRyaWJ1dGUgPSAnX2xpbmtzJztcbiAgICB0aGlzLl9lbWJlZGRlZEF0dHJpYnV0ZSA9ICdfZW1iZWRkZWQnO1xuICAgIHRoaXMuX2lnbm9yZUF0dHJpYnV0ZVByZWZpeGVzID0gW1xuICAgICAgJ18nLFxuICAgICAgJyQnLFxuICAgIF07XG4gICAgdGhpcy5fc2VsZkxpbmsgPSAnc2VsZic7XG4gICAgdGhpcy5fZm9yY2VKU09OUmVzb3VyY2UgPSBmYWxzZTtcbiAgICB0aGlzLl91cmxUcmFuc2Zvcm1lciA9IG5vb3BVcmxUcmFuc2Zvcm1lcjtcblxuICAgIHRoaXMuJGdldC4kaW5qZWN0ID0gW1xuICAgICAgJyRsb2cnLFxuICAgIF07XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IGxpbmtzQXR0cmlidXRlXG4gICAqL1xuICBzZXRMaW5rc0F0dHJpYnV0ZShsaW5rc0F0dHJpYnV0ZSkge1xuICAgIHRoaXMuX2xpbmtzQXR0cmlidXRlID0gbGlua3NBdHRyaWJ1dGU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVtYmVkZGVkQXR0cmlidXRlXG4gICAqL1xuICBzZXRFbWJlZGRlZEF0dHJpYnV0ZShlbWJlZGRlZEF0dHJpYnV0ZSkge1xuICAgIHRoaXMuX2VtYmVkZGVkQXR0cmlidXRlID0gZW1iZWRkZWRBdHRyaWJ1dGU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gaWdub3JlQXR0cmlidXRlUHJlZml4ZXNcbiAgICovXG4gIHNldElnbm9yZUF0dHJpYnV0ZVByZWZpeGVzKGlnbm9yZUF0dHJpYnV0ZVByZWZpeGVzKSB7XG4gICAgdGhpcy5faWdub3JlQXR0cmlidXRlUHJlZml4ZXMgPSBpZ25vcmVBdHRyaWJ1dGVQcmVmaXhlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWdub3JlQXR0cmlidXRlUHJlZml4XG4gICAqL1xuICBhZGRJZ25vcmVBdHRyaWJ1dGVQcmVmaXgoaWdub3JlQXR0cmlidXRlUHJlZml4KSB7XG4gICAgdGhpcy5faWdub3JlQXR0cmlidXRlUHJlZml4ZXMucHVzaChpZ25vcmVBdHRyaWJ1dGVQcmVmaXgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZWxmTGlua1xuICAgKi9cbiAgc2V0U2VsZkxpbmsoc2VsZkxpbmspIHtcbiAgICB0aGlzLl9zZWxmTGluayA9IHNlbGZMaW5rO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2VKU09OUmVzb3VyY2VcbiAgICovXG4gIHNldEZvcmNlSlNPTlJlc291cmNlKGZvcmNlSlNPTlJlc291cmNlKSB7XG4gICAgdGhpcy5fZm9yY2VKU09OUmVzb3VyY2UgPSBmb3JjZUpTT05SZXNvdXJjZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSB1cmxUcmFuc2Zvcm1lclxuICAgKiBAZGVwcmVjYXRlZCAkaGFsQ29uZmlndXJhdGlvblByb3ZpZGVyLnNldFVybFRyYW5zZm9ybWVyIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB3cml0ZSBhIGh0dHAgaW50ZXJjZXB0b3IgaW5zdGVhZC5cbiAgICogQHNlZSBodHRwczovL2RvY3MuYW5ndWxhcmpzLm9yZy9hcGkvbmcvc2VydmljZS8kaHR0cCNpbnRlcmNlcHRvcnNcbiAgICovXG4gIHNldFVybFRyYW5zZm9ybWVyKHVybFRyYW5zZm9ybWVyKSB7XG4gICAgdGhpcy5fdXJsVHJhbnNmb3JtZXIgPSB1cmxUcmFuc2Zvcm1lcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29uZmlndXJhdGlvblxuICAgKiBAcGFyYW0gIHtMb2d9ICRsb2cgbG9nZ2VyXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gICRnZXQoJGxvZykge1xuICAgIGlmKHRoaXMuX3VybFRyYW5zZm9ybWVyICE9PSBub29wVXJsVHJhbnNmb3JtZXIpIHtcbiAgICAgICRsb2cubG9nKCckaGFsQ29uZmlndXJhdGlvblByb3ZpZGVyLnNldFVybFRyYW5zZm9ybWVyIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB3cml0ZSBhIGh0dHAgaW50ZXJjZXB0b3IgaW5zdGVhZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICBsaW5rc0F0dHJpYnV0ZTogdGhpcy5fbGlua3NBdHRyaWJ1dGUsXG4gICAgICBlbWJlZGRlZEF0dHJpYnV0ZTogdGhpcy5fZW1iZWRkZWRBdHRyaWJ1dGUsXG4gICAgICBpZ25vcmVBdHRyaWJ1dGVQcmVmaXhlczogdGhpcy5faWdub3JlQXR0cmlidXRlUHJlZml4ZXMsXG4gICAgICBzZWxmTGluazogdGhpcy5fc2VsZkxpbmssXG4gICAgICBmb3JjZUpTT05SZXNvdXJjZTogdGhpcy5fZm9yY2VKU09OUmVzb3VyY2UsXG4gICAgICB1cmxUcmFuc2Zvcm1lcjogdGhpcy5fdXJsVHJhbnNmb3JtZXIsXG4gICAgfSk7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTU9EVUxFX05BTUUgPSAnYW5ndWxhci1oYWwuY29uZmlndXJhdGlvbic7XG5cblxuXG5pbXBvcnQgSGFsQ29uZmlndXJhdGlvblByb3ZpZGVyIGZyb20gJy4vaGFsLWNvbmZpZ3VyYXRpb24ucHJvdmlkZXInO1xuXG4vLyBBZGQgbW9kdWxlIGZvciBjb25maWd1cmF0aW9uXG5hbmd1bGFyXG4gIC5tb2R1bGUoTU9EVUxFX05BTUUsIFtdKVxuXG4gIC5wcm92aWRlcignJGhhbENvbmZpZ3VyYXRpb24nLCBIYWxDb25maWd1cmF0aW9uUHJvdmlkZXIpXG47XG5cbmV4cG9ydCBkZWZhdWx0IE1PRFVMRV9OQU1FO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgUmVzb3VyY2VIdHRwSW50ZXJjZXB0b3JGYWN0b3J5IGZyb20gJy4vcmVzb3VyY2UtaHR0cC1pbnRlcmNlcHRvci5mYWN0b3J5JztcblxuLyoqXG4gKiBAcGFyYW0ge0h0dHBQcm92aWRlcn0gJGh0dHBQcm92aWRlclxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBIdHRwSW50ZXJjZXB0b3JDb25maWd1cmF0aW9uKCRodHRwUHJvdmlkZXIpIHtcbiAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChSZXNvdXJjZUh0dHBJbnRlcmNlcHRvckZhY3RvcnkpO1xufVxuXG5IdHRwSW50ZXJjZXB0b3JDb25maWd1cmF0aW9uLiRpbmplY3QgPSBbXG4gICckaHR0cFByb3ZpZGVyJyxcbl07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IE1PRFVMRV9OQU1FID0gJ2FuZ3VsYXItaGFsLmh0dHAtaW50ZXJjZXB0aW9uJztcblxuaW1wb3J0IHJlc291cmNlIGZyb20gJy4uL3Jlc291cmNlL2luZGV4JztcbmltcG9ydCBjb25maWd1cmF0aW9uIGZyb20gJy4uL2NvbmZpZ3VyYXRpb24vaW5kZXgnO1xuXG5pbXBvcnQgSHR0cEludGVyY2VwdG9yQ29uZmlndXJhdGlvbiBmcm9tICcuL2h0dHAtaW50ZXJjZXB0aW9uLmNvbmZpZyc7XG5cbi8vIEFkZCBtb2R1bGUgZm9yIGh0dHAgaW50ZXJjZXB0aW9uXG5hbmd1bGFyXG4gIC5tb2R1bGUoTU9EVUxFX05BTUUsIFtcbiAgICByZXNvdXJjZSxcbiAgICBjb25maWd1cmF0aW9uLFxuICBdKVxuXG4gIC5jb25maWcoSHR0cEludGVyY2VwdG9yQ29uZmlndXJhdGlvbilcbjtcblxuZXhwb3J0IGRlZmF1bHQgTU9EVUxFX05BTUU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IENPTlRFTlRfVFlQRSA9ICdhcHBsaWNhdGlvbi9oYWwranNvbic7XG5cbmltcG9ydCB7IHBhcnNlIH0gZnJvbSAnY29udGVudC10eXBlJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUmVzb3VyY2VIdHRwSW50ZXJjZXB0b3JGYWN0b3J5KCRoYWxDb25maWd1cmF0aW9uLCBSZXNvdXJjZSkge1xuICByZXR1cm4ge1xuICAgIHJlcXVlc3Q6IHRyYW5zZm9ybVJlcXVlc3QsXG4gICAgcmVzcG9uc2U6IHRyYW5zZm9ybVJlc3BvbnNlLFxuICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgSGFsIEpzb24gQXMgYW4gYWNjZXB0ZWQgZm9ybWF0XG4gICAqIEBwYXJhbSB7UmVxdWVzdH0gcmVxdWVzdFxuICAgKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNmb3JtUmVxdWVzdChyZXF1ZXN0KSB7XG4gICAgaWYodHlwZW9mIHJlcXVlc3QuaGVhZGVycy5BY2NlcHQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXF1ZXN0LmhlYWRlcnMuQWNjZXB0ID0gQ09OVEVOVF9UWVBFO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0LmhlYWRlcnMuQWNjZXB0ID0gW1xuICAgICAgICBDT05URU5UX1RZUEUsXG4gICAgICAgIHJlcXVlc3QuaGVhZGVycy5BY2NlcHQsXG4gICAgICBdLmpvaW4oJywgJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIFJlc3BvbnNlXG4gICAqXG4gICAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc3BvbnNlXG4gICAqIEByZXR1cm4ge1Jlc3BvbnNlfFJlc291cmNlfVxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNmb3JtUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICB0cnkge1xuICAgICAgaWYocGFyc2UocmVzcG9uc2UuaGVhZGVycygnQ29udGVudC1UeXBlJykpLnR5cGUgPT09IENPTlRFTlRfVFlQRSkge1xuICAgICAgICByZXR1cm4gdHJhbnNmb3JtUmVzcG9uc2VUb1Jlc291cmNlKHJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIC8vIFRoZSBwYXJzZSBmdW5jdGlvbiBjb3VsZCB0aHJvdyBhbiBlcnJvciwgd2UgZG8gbm90IHdhbnQgdGhhdC5cbiAgICB9XG4gICAgaWYocmVzcG9uc2UuY29uZmlnLmZvcmNlSGFsKSB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtUmVzcG9uc2VUb1Jlc291cmNlKHJlc3BvbnNlKTtcbiAgICB9XG4gICAgaWYoKFxuICAgICAgICByZXNwb25zZS5oZWFkZXJzKCdDb250ZW50LVR5cGUnKSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nIHx8XG4gICAgICAgIHJlc3BvbnNlLmhlYWRlcnMoJ0NvbnRlbnQtVHlwZScpID09PSBudWxsXG4gICAgICApICYmXG4gICAgICAkaGFsQ29uZmlndXJhdGlvbi5mb3JjZUpTT05SZXNvdXJjZSkge1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybVJlc3BvbnNlVG9SZXNvdXJjZShyZXNwb25zZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVJlc3BvbnNlVG9SZXNvdXJjZShyZXNwb25zZSkge1xuICAgIHJldHVybiBuZXcgUmVzb3VyY2UocmVzcG9uc2UuZGF0YSwgcmVzcG9uc2UpO1xuICB9XG59XG5cblJlc291cmNlSHR0cEludGVyY2VwdG9yRmFjdG9yeS4kaW5qZWN0ID0gW1xuICAnJGhhbENvbmZpZ3VyYXRpb24nLFxuICAnUmVzb3VyY2UnLFxuXTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgTU9EVUxFX05BTUUgPSAnYW5ndWxhci1oYWwnO1xuXG5pbXBvcnQgaHR0cEludGVyY2VwdGlvbiBmcm9tICcuL2h0dHAtaW50ZXJjZXB0aW9uL2luZGV4JztcbmltcG9ydCBjbGllbnQgZnJvbSAnLi9jbGllbnQvaW5kZXgnO1xuXG4vLyBDb21iaW5lIG5lZWRlZCBNb2R1bGVzXG5hbmd1bGFyXG4gIC5tb2R1bGUoTU9EVUxFX05BTUUsIFtcbiAgICBodHRwSW50ZXJjZXB0aW9uLFxuICAgIGNsaWVudCxcbiAgXSlcbjtcblxuZXhwb3J0IGRlZmF1bHQgTU9EVUxFX05BTUU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBleHRlbmRSZWFkT25seSBmcm9tICcuLi91dGlsaXR5L2V4dGVuZC1yZWFkLW9ubHknO1xuXG4vKipcbiAqIEZhY3RvcnkgZm9yIEhhbFJlc291cmNlQ2xpZW50XG4gKiBAcGFyYW0ge1F9ICAgICAgICAkcVxuICogQHBhcmFtIHtJbmplY3Rvcn0gJGluamVjdG9yIFByZXZlbnQgQ2lyY3VsYXIgRGVwZW5kZW5jeSBieSBpbmplY3RpbmcgJGluamVjdG9yIGluc3RlYWQgb2YgJGh0dHBcbiAqIEBwYXJhbSB7T2JqZWN0fSAgICRoYWxDb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEhhbFJlc291cmNlQ2xpZW50RmFjdG9yeSgkcSwgJGluamVjdG9yLCAkaGFsQ29uZmlndXJhdGlvbikge1xuICByZXR1cm4gSGFsUmVzb3VyY2VDbGllbnQ7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7UmVzb3VyY2V9IHJlc291cmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgIGxpbmtzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgIGVtYmVkZGVkXG4gICAqL1xuICBmdW5jdGlvbiBIYWxSZXNvdXJjZUNsaWVudChyZXNvdXJjZSwgZW1iZWRkZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgJGh0dHAgPSAkaW5qZWN0b3IuZ2V0KCckaHR0cCcpO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgY2xpZW50XG4gICAgICovXG4gICAgKGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBleHRlbmRSZWFkT25seShzZWxmLCB7XG4gICAgICAgICRyZXF1ZXN0OiAkcmVxdWVzdCxcbiAgICAgICAgJGdldDogJGdldCxcbiAgICAgICAgJHBvc3Q6ICRwb3N0LFxuICAgICAgICAkcHV0OiAkcHV0LFxuICAgICAgICAkcGF0Y2g6ICRwYXRjaCxcbiAgICAgICAgJGRlbGV0ZTogJGRlbGV0ZSxcbiAgICAgICAgJGRlbDogJGRlbGV0ZSxcbiAgICAgICAgJGxpbms6ICRsaW5rLFxuICAgICAgICAkdW5saW5rOiAkdW5saW5rLFxuICAgICAgfSk7XG4gICAgfSkoKTtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIHJlcXVlc3QgYWdhaW5zdCBhIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9IHVybFBhcmFtc1xuICAgICAqIEBwYXJhbSB7bWl4ZWR8bnVsbH0gIGJvZHlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkcmVxdWVzdChtZXRob2QsIHJlbCwgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKSB7XG4gICAgICB2YXIgcHJvbWlzZXM7XG5cbiAgICAgIG1ldGhvZCA9IG1ldGhvZCB8fCAnR0VUJztcbiAgICAgIHJlbCA9IHJlbCB8fCAkaGFsQ29uZmlndXJhdGlvbi5zZWxmTGluaztcbiAgICAgIHVybFBhcmFtcyA9IHVybFBhcmFtcyB8fCB7fTtcbiAgICAgIGJvZHkgPSBib2R5IHx8IG51bGw7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgaWYobWV0aG9kID09PSAnR0VUJyAmJlxuICAgICAgICAgIHJlbCA9PT0gJGhhbENvbmZpZ3VyYXRpb24uc2VsZkxpbmspIHtcbiAgICAgICAgcmV0dXJuICRxLnJlc29sdmUocmVzb3VyY2UpO1xuICAgICAgfVxuXG4gICAgICBpZihyZXNvdXJjZS4kaGFzRW1iZWRkZWQocmVsKSAmJlxuICAgICAgICBBcnJheS5pc0FycmF5KGVtYmVkZGVkW3JlbF0pKSB7XG4gICAgICAgIHByb21pc2VzID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBlbWJlZGRlZFtyZWxdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChlbWJlZGRlZFtyZWxdW2ldLiRyZXF1ZXN0KCkuJHJlcXVlc3QobWV0aG9kLCAnc2VsZicsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgICAgfVxuXG4gICAgICBpZihyZXNvdXJjZS4kaGFzRW1iZWRkZWQocmVsKSkge1xuICAgICAgICByZXR1cm4gZW1iZWRkZWRbcmVsXS4kcmVxdWVzdCgpLiRyZXF1ZXN0KG1ldGhvZCwgJ3NlbGYnLCB1cmxQYXJhbXMsIGJvZHksIG9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICBpZihyZXNvdXJjZS4kaGFzTGluayhyZWwpKSB7XG4gICAgICAgIHZhciB1cmwgPSByZXNvdXJjZS4kaHJlZihyZWwsIHVybFBhcmFtcyk7XG5cbiAgICAgICAgYW5ndWxhci5leHRlbmQob3B0aW9ucywge1xuICAgICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAgIGRhdGE6IGJvZHksXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKEFycmF5LmlzQXJyYXkodXJsKSkge1xuICAgICAgICAgIHByb21pc2VzID0gW107XG4gICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHVybC5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCgkaHR0cChhbmd1bGFyLmV4dGVuZCh7fSwgb3B0aW9ucywge3VybDogdXJsW2pdfSkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICRxLmFsbChwcm9taXNlcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJGh0dHAoYW5ndWxhci5leHRlbmQoe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICB1cmw6IHJlc291cmNlLiRocmVmKHJlbCwgdXJsUGFyYW1zKSxcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJHEucmVqZWN0KG5ldyBFcnJvcignbGluayBcIicgKyByZWwgKyAnXCIgaXMgdW5kZWZpbmVkJykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIEdFVCByZXF1ZXN0IGFnYWluc3QgYSBsaW5rIG9yXG4gICAgICogbG9hZCBhbiBlbWJlZGRlZCByZXNvdXJjZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgcmVsXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGdldChyZWwsIHVybFBhcmFtcywgb3B0aW9ucykge1xuICAgICAgcmV0dXJuICRyZXF1ZXN0KCdHRVQnLCByZWwsIHVybFBhcmFtcywgdW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCBQT1NUIHJlcXVlc3QgYWdhaW5zdCBhIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9IHVybFBhcmFtc1xuICAgICAqIEBwYXJhbSB7bWl4ZWR8bnVsbH0gIGJvZHlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkcG9zdChyZWwsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucykge1xuICAgICAgcmV0dXJuICRyZXF1ZXN0KCdQT1NUJywgcmVsLCB1cmxQYXJhbXMsIGJvZHksIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgYSBIVFRQIFBVVCByZXF1ZXN0IGFnYWluc3QgYSBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgICByZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge21peGVkfG51bGx9ICBib2R5XG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJHB1dChyZWwsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucykge1xuICAgICAgcmV0dXJuICRyZXF1ZXN0KCdQVVQnLCByZWwsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBhIEhUVFAgUEFUQ0ggcmVxdWVzdCBhZ2FpbnN0IGEgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgcmVsXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHttaXhlZHxudWxsfSAgYm9keVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICRwYXRjaChyZWwsIHVybFBhcmFtcywgYm9keSwgb3B0aW9ucykge1xuICAgICAgcmV0dXJuICRyZXF1ZXN0KCdQQVRDSCcsIHJlbCwgdXJsUGFyYW1zLCBib2R5LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCBERUxFRVQgcmVxdWVzdCBhZ2FpbnN0IGEgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgcmVsXG4gICAgICogQHBhcmFtIHtPYmplY3R8bnVsbH0gdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGRlbGV0ZShyZWwsIHVybFBhcmFtcywgb3B0aW9ucykge1xuICAgICAgcmV0dXJuICRyZXF1ZXN0KCdERUxFVEUnLCByZWwsIHVybFBhcmFtcywgdW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCBMSU5LIHJlcXVlc3QgYWdhaW5zdCBhIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgICAgICByZWxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxudWxsfSAgdXJsUGFyYW1zXG4gICAgICogQHBhcmFtIHtMaW5rSGVhZGVyW119IGJvZHlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gICAgICAgb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGxpbmsocmVsLCB1cmxQYXJhbXMsIGxpbmtzLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICAgIG9wdGlvbnMuaGVhZGVycy5MaW5rID0gbGlua3MubWFwKHRvU3RyaW5nSXRlbSk7XG4gICAgICByZXR1cm4gJHJlcXVlc3QoJ0xJTksnLCByZWwsIHVybFBhcmFtcywgdW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGEgSFRUUCBVTkxJTksgcmVxdWVzdCBhZ2FpbnN0IGEgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fG51bGx9ICB1cmxQYXJhbXNcbiAgICAgKiBAcGFyYW0ge0xpbmtIZWFkZXJbXX0gYm9keVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgICBvcHRpb25zXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkdW5saW5rKHJlbCwgdXJsUGFyYW1zLCBsaW5rcywgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICBvcHRpb25zLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge307XG4gICAgICBvcHRpb25zLmhlYWRlcnMuTGluayA9IGxpbmtzLm1hcCh0b1N0cmluZ0l0ZW0pO1xuICAgICAgcmV0dXJuICRyZXF1ZXN0KCdVTkxJTksnLCByZWwsIHVybFBhcmFtcywgdW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge21peGVkfSBpdGVtXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRvU3RyaW5nSXRlbShpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS50b1N0cmluZygpO1xuICAgIH1cbiAgfVxufVxuXG5IYWxSZXNvdXJjZUNsaWVudEZhY3RvcnkuJGluamVjdCA9IFtcbiAgJyRxJyxcbiAgJyRpbmplY3RvcicsXG4gICckaGFsQ29uZmlndXJhdGlvbicsXG5dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBNT0RVTEVfTkFNRSA9ICdhbmd1bGFyLWhhbC5yZXNvdXJjZSc7XG5cblxuaW1wb3J0IGNvbmZpZ3VyYXRpb24gZnJvbSAnLi4vY29uZmlndXJhdGlvbi9pbmRleCc7XG5cbmltcG9ydCBSZXNvdXJjZUZhY3RvcnkgZnJvbSAnLi9yZXNvdXJjZS5mYWN0b3J5JztcbmltcG9ydCBIYWxSZXNvdXJjZUNsaWVudEZhY3RvcnkgZnJvbSAnLi9oYWwtcmVzb3VyY2UtY2xpZW50LmZhY3RvcnknO1xuXG4vLyBBZGQgbW9kdWxlIGZvciByZXNvdXJjZVxuYW5ndWxhclxuICAubW9kdWxlKE1PRFVMRV9OQU1FLCBbXG4gICAgY29uZmlndXJhdGlvbixcbiAgXSlcblxuICAuZmFjdG9yeSgnUmVzb3VyY2UnLCBSZXNvdXJjZUZhY3RvcnkpXG5cbiAgLmZhY3RvcnkoJ0hhbFJlc291cmNlQ2xpZW50JywgSGFsUmVzb3VyY2VDbGllbnRGYWN0b3J5KVxuO1xuXG5leHBvcnQgZGVmYXVsdCBNT0RVTEVfTkFNRTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGV4dGVuZFJlYWRPbmx5IGZyb20gJy4uL3V0aWxpdHkvZXh0ZW5kLXJlYWQtb25seSc7XG5pbXBvcnQgZGVmaW5lUmVhZE9ubHkgZnJvbSAnLi4vdXRpbGl0eS9kZWZpbmUtcmVhZC1vbmx5JztcbmltcG9ydCBnZW5lcmF0ZVVybCBmcm9tICcuLi91dGlsaXR5L2dlbmVyYXRlLXVybCc7XG5pbXBvcnQgbm9ybWFsaXplTGluayBmcm9tICcuLi91dGlsaXR5L25vcm1hbGl6ZS1saW5rJztcblxuLyoqXG4gKiBGYWN0b3J5IGZvciBSZXNvdXJjZVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IEhhbFJlc291cmNlQ2xpZW50XG4gKiBAcGFyYW0ge09iamVjdH0gICAkaGFsQ29uZmlndXJhdGlvblxuICogQHBhcmFtIHtMb2d9ICAgICAgJGxvZ1xuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBSZXNvdXJjZUZhY3RvcnkoSGFsUmVzb3VyY2VDbGllbnQsICRoYWxDb25maWd1cmF0aW9uLCAkbG9nKSB7XG4gIHJldHVybiBSZXNvdXJjZTtcblxuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGFcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlXG4gICAqL1xuICBmdW5jdGlvbiBSZXNvdXJjZShkYXRhLCByZXNwb25zZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCBsaW5rcyA9IHt9XG4gICAgICAsIGVtYmVkZGVkID0ge31cbiAgICAgICwgY2xpZW50O1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgUmVzb3VyY2VcbiAgICAgKi9cbiAgICAoZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JyB8fFxuICAgICAgICBkYXRhID09PSBudWxsKSB7XG4gICAgICAgIGRhdGEgPSB7fTtcbiAgICAgIH1cbiAgICAgIGluaXRpYWxpemVEYXRhKCk7XG4gICAgICBpbml0aWFsaXplRW1iZWRkZWQoKTtcbiAgICAgIGluaXRpYWxpemVMaW5rcygpO1xuICAgICAgaW5pdGl0YWxpemVDbGllbnQoKTtcblxuICAgICAgZXh0ZW5kUmVhZE9ubHkoc2VsZiwge1xuICAgICAgICAkaGFzTGluazogJGhhc0xpbmssXG4gICAgICAgICRoYXNFbWJlZGRlZDogJGhhc0VtYmVkZGVkLFxuICAgICAgICAkaGFzOiAkaGFzLFxuICAgICAgICAkaHJlZjogJGhyZWYsXG4gICAgICAgICRtZXRhOiAkbWV0YSxcbiAgICAgICAgJGxpbms6ICRsaW5rLFxuICAgICAgICAkcmVxdWVzdDogJHJlcXVlc3QsXG4gICAgICAgICRyZXNwb25zZTogJHJlc3BvbnNlLFxuICAgICAgfSk7XG4gICAgfSkoKTtcblxuICAgIC8qKlxuICAgICAqIEFkZCBhbGwgZGF0YSBmcm9tIGRhdGEgdG8gaXRzZWxmXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZURhdGEoKSB7XG4gICAgICBmb3IodmFyIHByb3BlcnR5TmFtZSBpbiBkYXRhKSB7XG4gICAgICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZihpc01ldGFQcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZGVmaW5lUmVhZE9ubHkoc2VsZiwgcHJvcGVydHlOYW1lLCBkYXRhW3Byb3BlcnR5TmFtZV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZSBhbGwgTGlua3NcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplTGlua3MoKSB7XG4gICAgICBpZih0eXBlb2YgZGF0YVskaGFsQ29uZmlndXJhdGlvbi5saW5rc0F0dHJpYnV0ZV0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgT2JqZWN0XG4gICAgICAgIC5rZXlzKGRhdGFbJGhhbENvbmZpZ3VyYXRpb24ubGlua3NBdHRyaWJ1dGVdKVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICB2YXIgbGluayA9IGRhdGFbJGhhbENvbmZpZ3VyYXRpb24ubGlua3NBdHRyaWJ1dGVdW3JlbF07XG4gICAgICAgICAgbGlua3NbcmVsXSA9IG5vcm1hbGl6ZUxpbmsocmVzcG9uc2UuY29uZmlnLnVybCwgbGluayk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZSBFbWJlZGRlZCBDb250ZW50c1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVFbWJlZGRlZCgpIHtcbiAgICAgIGlmKHR5cGVvZiBkYXRhWyRoYWxDb25maWd1cmF0aW9uLmVtYmVkZGVkQXR0cmlidXRlXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBPYmplY3RcbiAgICAgICAgLmtleXMoZGF0YVskaGFsQ29uZmlndXJhdGlvbi5lbWJlZGRlZEF0dHJpYnV0ZV0pXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIGVtYmVkUmVzb3VyY2UocmVsLCBkYXRhWyRoYWxDb25maWd1cmF0aW9uLmVtYmVkZGVkQXR0cmlidXRlXVtyZWxdKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgSFRUUCBDTElFTlRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbml0aXRhbGl6ZUNsaWVudCgpIHtcbiAgICAgIGNsaWVudCA9IG5ldyBIYWxSZXNvdXJjZUNsaWVudChzZWxmLCBlbWJlZGRlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW1iZWQgYSByZXNvdXJjZShzKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgICAgICAgIHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fE9iamVjdFtdfSByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlbWJlZFJlc291cmNlKHJlbCwgcmVzb3VyY2VzKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNvdXJjZXMpKSB7XG4gICAgICAgIGVtYmVkZGVkW3JlbF0gPSBbXTtcbiAgICAgICAgcmVzb3VyY2VzLmZvckVhY2goZnVuY3Rpb24gKHJlc291cmNlKSB7XG4gICAgICAgICAgZW1iZWRkZWRbcmVsXS5wdXNoKG5ldyBSZXNvdXJjZShyZXNvdXJjZSwgcmVzcG9uc2UpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVtYmVkZGVkW3JlbF0gPSBuZXcgUmVzb3VyY2UocmVzb3VyY2VzLCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lIGlmIGEgcHJvcGVydHkgbmFtZSBpcyBhIG1ldGEgcHJvcGVydHlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlOYW1lXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01ldGFQcm9wZXJ0eShwcm9wZXJ0eU5hbWUpIHtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCAkaGFsQ29uZmlndXJhdGlvbi5pZ25vcmVBdHRyaWJ1dGVQcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihwcm9wZXJ0eU5hbWUuc3Vic3RyKDAsIDEpID09PSAkaGFsQ29uZmlndXJhdGlvbi5pZ25vcmVBdHRyaWJ1dGVQcmVmaXhlc1tpXSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmKHByb3BlcnR5TmFtZSA9PT0gJGhhbENvbmZpZ3VyYXRpb24ubGlua3NBdHRyaWJ1dGUgfHxcbiAgICAgICAgICBwcm9wZXJ0eU5hbWUgPT09ICRoYWxDb25maWd1cmF0aW9uLmVtYmVkZGVkQXR0cmlidXRlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVsXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkaGFzTGluayhyZWwpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgbGlua3NbcmVsXSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlbFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGhhc0VtYmVkZGVkKHJlbCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBlbWJlZGRlZFtyZWxdICE9PSAndW5kZWZpbmVkJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVsXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkaGFzKHJlbCkge1xuICAgICAgcmV0dXJuICRoYXNMaW5rKHJlbCkgfHwgJGhhc0VtYmVkZGVkKHJlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBocmVmIG9mIGEgTGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICRocmVmKHJlbCwgcGFyYW1ldGVycykge1xuICAgICAgdmFyIGxpbmsgPSAkbGluayhyZWwpXG4gICAgICAgICwgaHJlZiA9IGxpbmsuaHJlZjtcblxuICAgICAgaWYoQXJyYXkuaXNBcnJheShsaW5rKSkge1xuICAgICAgICBocmVmID0gW107XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsaW5rLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHN1YkxpbmsgPSBsaW5rW2ldXG4gICAgICAgICAgICAsIHN1YkhyZWYgPSBzdWJMaW5rLmhyZWY7XG4gICAgICAgICAgaWYodHlwZW9mIHN1YkxpbmsudGVtcGxhdGVkICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgc3ViTGluay50ZW1wbGF0ZWQpIHtcbiAgICAgICAgICAgIHN1YkhyZWYgPSBnZW5lcmF0ZVVybChzdWJMaW5rLmhyZWYsIHBhcmFtZXRlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdWJIcmVmID0gJGhhbENvbmZpZ3VyYXRpb24udXJsVHJhbnNmb3JtZXIoc3ViSHJlZik7XG4gICAgICAgICAgaHJlZi5wdXNoKHN1YkhyZWYpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZih0eXBlb2YgbGluay50ZW1wbGF0ZWQgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgbGluay50ZW1wbGF0ZWQpIHtcbiAgICAgICAgICBocmVmID0gZ2VuZXJhdGVVcmwobGluay5ocmVmLCBwYXJhbWV0ZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhyZWYgPSAkaGFsQ29uZmlndXJhdGlvbi51cmxUcmFuc2Zvcm1lcihocmVmKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhyZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGEgbGlua1xuICAgICAqXG4gICAgICogISEgVG8gZ2V0IGEgaHJlZiwgdXNlICRocmVmIGluc3RlYWQgISFcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZWxcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gJGxpbmsocmVsKSB7XG4gICAgICBpZighJGhhc0xpbmsocmVsKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2xpbmsgXCInICsgcmVsICsgJ1wiIGlzIHVuZGVmaW5lZCcpO1xuICAgICAgfVxuICAgICAgdmFyIGxpbmsgPSBsaW5rc1tyZWxdO1xuXG4gICAgICBpZih0eXBlb2YgbGluay5kZXByZWNhdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgJGxvZy53YXJuKGBUaGUgbGluayBcIiR7cmVsfVwiIGlzIG1hcmtlZCBhcyBkZXByZWNhdGVkIHdpdGggdGhlIHZhbHVlIFwiJHtsaW5rLmRlcHJlY2F0aW9ufVwiLmApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbGluaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWV0YSBwcm9wZXJ0aWVzXG4gICAgICpcbiAgICAgKiAhISBUbyBnZXQgYSBocmVmLCB1c2UgJGhyZWYgaW5zdGVhZCAhIVxuICAgICAqICEhIFRvIGdldCBhIGxpbmssIHVzZSAkbGluayBpbnN0ZWFkICEhXG4gICAgICogISEgVG8gZ2V0IGFuIGVtYmVkZGVkIHJlc291cmNlLCB1c2UgJHJlcXVlc3QoKS4kZ2V0KHJlbCkgaW5zdGVhZCAhIVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlbFxuICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkbWV0YShuYW1lKSB7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgJGhhbENvbmZpZ3VyYXRpb24uaWdub3JlQXR0cmlidXRlUHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGZ1bGxOYW1lID0gJGhhbENvbmZpZ3VyYXRpb24uaWdub3JlQXR0cmlidXRlUHJlZml4ZXNbaV0gKyBuYW1lO1xuICAgICAgICByZXR1cm4gZGF0YVtmdWxsTmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBPcmlnaW5hbCBSZXNwb25zZVxuICAgICAqXG4gICAgICogQHJldHVybiB7T2JqZWN0KX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkcmVzcG9uc2UoKSB7XG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjbGllbnQgdG8gcGVyZm9ybSByZXF1ZXN0c1xuICAgICAqXG4gICAgICogQHJldHVybiB7SGFsUmVzb3VyY2VDbGllbnQpfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uICRyZXF1ZXN0KCkge1xuICAgICAgcmV0dXJuIGNsaWVudDtcbiAgICB9XG4gIH1cbn1cblJlc291cmNlRmFjdG9yeS4kaW5qZWN0ID0gW1xuICAnSGFsUmVzb3VyY2VDbGllbnQnLFxuICAnJGhhbENvbmZpZ3VyYXRpb24nLFxuICAnJGxvZycsXG5dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERlZmluZSByZWFkLW9ubHkgcHJvcGVydHkgaW4gdGFyZ2V0XG4gKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge21peGVkfSAgdmFsdWVcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVmaW5lUmVhZE9ubHkodGFyZ2V0LCBrZXksIHZhbHVlKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwge1xuICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogdmFsdWUsXG4gICAgd3JpdGFibGU6IGZhbHNlLFxuICB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBFeHRlbmQgcHJvcGVydGllcyBmcm9tIGNvcHkgcmVhZC1vbmx5IHRvIHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IGNvcHlcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZXh0ZW5kUmVhZE9ubHkodGFyZ2V0LCBjb3B5KSB7XG4gIGZvcih2YXIga2V5IGluIGNvcHkpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiBjb3B5W2tleV0sXG4gICAgfSk7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHJmYzY1NzAgZnJvbSAncmZjNjU3MC9zcmMvbWFpbic7XG5cbi8qKlxuICogR2VuZXJhdGUgdXJsIGZyb20gdGVtcGxhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRlbXBsYXRlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtZXRlcnNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2VuZXJhdGVVcmwodGVtcGxhdGUsIHBhcmFtZXRlcnMpIHtcbiAgcmV0dXJuIG5ldyByZmM2NTcwLlVyaVRlbXBsYXRlKHRlbXBsYXRlKS5zdHJpbmdpZnkocGFyYW1ldGVycyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCByZXNvbHZlVXJsIGZyb20gJy4uL3V0aWxpdHkvcmVzb2x2ZS11cmwnO1xuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlVXJsXG4gKiBAcGFyYW0ge21peGVkfSAgbGlua1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBub3JtYWxpemVMaW5rKGJhc2VVcmwsIGxpbmspIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkobGluaykpIHtcbiAgICByZXR1cm4gbGluay5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBub3JtYWxpemVMaW5rKGJhc2VVcmwsIGl0ZW0pO1xuICAgIH0pO1xuICB9XG4gIGlmKHR5cGVvZiBsaW5rID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB7XG4gICAgICBocmVmOiByZXNvbHZlVXJsKGJhc2VVcmwsIGxpbmspLFxuICAgIH07XG4gIH1cbiAgaWYodHlwZW9mIGxpbmsuaHJlZiA9PT0gJ3N0cmluZycpIHtcbiAgICBsaW5rLmhyZWYgPSByZXNvbHZlVXJsKGJhc2VVcmwsIGxpbmsuaHJlZik7XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cbiAgaWYoQXJyYXkuaXNBcnJheShsaW5rLmhyZWYpKSB7XG4gICAgcmV0dXJuIGxpbmsuaHJlZi5tYXAoZnVuY3Rpb24gKGhyZWYpIHtcbiAgICAgIHZhciBuZXdMaW5rID0gYW5ndWxhci5leHRlbmQoe30sIGxpbmssIHtcbiAgICAgICAgaHJlZjogaHJlZixcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZUxpbmsoYmFzZVVybCwgbmV3TGluayk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBocmVmOiBiYXNlVXJsLFxuICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFJlc29sdmUgd2hvbGUgVVJMXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGJhc2VVcmxcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlc29sdmVVcmwoYmFzZVVybCwgcGF0aCkge1xuICB2YXIgcmVzdWx0SHJlZiA9ICcnXG4gICAgLCByZUZ1bGxVcmwgPSAvXigoPzpcXHcrXFw6KT8pKCg/OlxcL1xcLyk/KShbXlxcL10qKSgoPzpcXC8uKik/KSQvXG4gICAgLCBiYXNlSHJlZk1hdGNoID0gcmVGdWxsVXJsLmV4ZWMoYmFzZVVybClcbiAgICAsIGhyZWZNYXRjaCA9IHJlRnVsbFVybC5leGVjKHBhdGgpO1xuXG4gIGZvciAodmFyIHBhcnRJbmRleCA9IDE7IHBhcnRJbmRleCA8IDU7IHBhcnRJbmRleCsrKSB7XG4gICAgaWYgKGhyZWZNYXRjaFtwYXJ0SW5kZXhdKSB7XG4gICAgICByZXN1bHRIcmVmICs9IGhyZWZNYXRjaFtwYXJ0SW5kZXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRIcmVmICs9IGJhc2VIcmVmTWF0Y2hbcGFydEluZGV4XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0SHJlZjtcbn1cbiJdfQ==
>>>>>>> upstream/master
