//一个js开发框架
//template.event.canvas
//v0.7.20180516
;
(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define('tpler', [], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        if (root) {
            root.tpler = factory();
        } else {
            const _ = factory();
        }
    }
}(this,
    function() {
        //模板标签  ([^|]+?[\|(string|file|image|time)]?     /{=([\s\S]+?)}/g; 
        var reg_tpl_tag = /{=(.*?)(?:\|(.*?))?}/g,
            reg_operation_symbol = /[\+|\-|\*|\/|\(|\)]+/g, //支持 加减乘除括号  operation symbol
            rootEl, $index = 1,
            $length = 1,
            toucher,
            customFilters = {}, //扩展类型
            customSyntax = "", //书写语法   pre markdown  html text 文本格式类型
            customMethods = {},
            customDirectives = {},
            templateConfig = {},
            SYNTAX = "syntax",
            GROUP = "group",
            LAZY = "lazy",
            MORE = "more",
            DEFAULT = "default",
            DATA = "data",
            PAGESIZE = "pagesize",
            KEYWORD = "keyword",
            TEMPLATE = "template",
            NOLOOP = "noloop",
            LOOP = "loop",
            MODEL = "model", //双向绑定模型
            TAP = "tap",
            LONGTAP = "longtap",
            DRAG = "drag",
            ON = "on", //绑定事件
            BIND = "bind"; //单向绑定

        var inBrowser = typeof window !== 'undefined';
        console.log("before inBrowser:" + inBrowser);

        var isSupportTouch = inBrowser ? (function() {
            try {
                document.createEvent("TouchEvent");
                return true;
            } catch (e) {
                return false;
            }
        })() : false;

        //继承属性 和原型方法
        var extend = function(obj) {
            // var args = Array.prototype.slice.call(arguments),
            var len = arguments.length;
            if (len > 1) obj = obj || {};
            for (var i = 1; i < len; i++) {
                var source = arguments[i]; //args[i];
                if (source)
                    for (var prop in source)
                        obj[prop] = source[prop]; //include functions in prototype
            }
            return obj;
        };

        //只继承属性，不包括原型方法
        var extendOwn = function(obj) {
            var len = arguments.length;
            if (len > 1) obj = obj || {};
            for (var i = 1; i < len; i++) {
                var source = arguments[i];
                if (source)
                    for (var prop in source)
                        if (Object.prototype.hasOwnProperty.call(source, prop)) obj[prop] = source[prop]; //only properties in this object
            }
            return obj;
        };

        var screen = { x: 100, y: 100 },
            envt;
        if (inBrowser) {
            var ua = window.navigator.userAgent.toLowerCase(),
                isIE = /msie|trident/.test(ua),
                isIE9 = !!~ua.indexOf('msie 9.0'),
                isEdge = !!~ua.indexOf('edge/'),
                isChrome = /chrome\/\d+/.test(ua) && !isEdge,
                weixin = /MicroMessenger/i.test(ua),
                isWxMiniProgram = /miniprogram/i.test(window.__wxjs_environment);

            var env = (function() {
                var os = {};
                var android = ua.match(/(Android)[\s\/]+([\d\.]+)/),
                    ios = ua.match(/(iPad|iPhone|iPod)\s+OS\s([\d_\.]+)/),
                    wp = ua.match(/(Windows\s+Phone)\s([\d\.]+)/),
                    isWebkit = /WebKit\/[\d.]+/i.test(ua),
                    isSafari = ios ? (navigator.standalone ? isWebkit : (/Safari/i.test(ua) && !/CriOS/i.test(ua) && !/MQQBrowser/i.test(ua))) : false;
                if (android) {
                    os.isAndroid = true;
                    os.android = true;
                    os.version = android[2];
                }
                if (ios) {
                    os.isIOS = true;
                    os.ios = true;
                    os.version = ios[2].replace(/_/g, '.');
                    os.ios7 = /^7/.test(os.version);
                    os.ios11 = /^11/.test(os.version);
                    if (ios[1] === 'iPad') {
                        os.ipad = true;
                    } else if (ios[1] === 'iPhone') {
                        os.iphone = true;
                    } else if (ios[1] === 'iPod') {
                        os.ipod = true;
                    }
                }
                if (isWebkit) {
                    os.webkit = true;
                }
                if (isSafari) {
                    os.safari = true;
                }
                return os;
            })();
            envt = extend(env, {
                inBrowser: inBrowser,
                ua: ua,
                isIE: isIE,
                isIE9: isIE9,
                isEdge: isEdge,
                isChrome: isChrome,
                weixin: weixin,
                isWxMiniProgram: isWxMiniProgram
            });
            screen = {
                x: document.documentElement.clientWidth,
                y: document.documentElement.clientHeight
            };
        }

        var _ = {
            envt: envt,
            extend: extend,
            extendOwn: extendOwn,
            screen: screen,


            //类型
            type: function(o) {
                if (o === null) return 'null';
                var s = Object.prototype.toString.call(o);
                var t = s.match(/\[object (.*?)\]/)[1].toLowerCase();
                return t === 'number' ? isNaN(o) ? 'nan' : !isFinite(o) ? 'infinity' : t : t;
            },
            isElement: function(o) {
                return o && (o.nodeType === 1 || o.nodeType === 9);
            },
            isDocument: function(o) {
                return o && o.nodeName && o.nodeType === 9;
            },
            //对象类名
            objectName: function(obj) {
                return _.isUndefined(obj) ? _.isUndefined(obj) : _.isNull(obj) ? _.isNull(obj) : obj.prototype.constructor ? obj.prototype.constructor.name : obj.__proto__.constructor.name
            },
            //has(obj,"z.b.c")  key in obj
            has: function(obj, key) {
                if (_.isObject(obj)) {
                    var ks = key.split(".");
                    var o = obj;
                    while (key = ks.shift()) { //trim
                        if (o && o.hasOwnProperty(key)) { //Object.prototype.hasOwnProperty.call(this, k)
                            o = o[key];
                        } else {
                            return false;
                        }
                    }
                    return true;
                } else if (_.isArray(obj) || _.isString(obj)) {
                    return !!~obj.indexOf(key); // !== -1;  >= 0
                }
                return false;
            },
            isJQuery: function(o) {
                return o ? !!(o.jquery) : false;
            },
            keys: function(obj) {
                if (!_.isObject(obj)) return [];
                if (Object.keys) return Object.keys(obj);
                var keys = [];
                for (var key in obj)
                    if (_.has(obj, key)) keys.push(key);
                return keys;
            },
            //对象  数组 相等
            equal: function(a, b) {
                if (a === b) {
                    return true;
                } else if (_.isArray(a) && _.isArray(b)) {
                    return a.toString() === b.toString();
                } else if (_.isObject(a) && _.isObject(b)) {
                    if (_.keys(a).length !== _.keys(b).length) return false;
                    for (var k in a)
                        if (!_.equal(a[k], b[k])) return false;
                    return true;
                } else if (_.type(a) === _.type(b)) {
                    return a === b;
                }
                return false;
            },

            text: function(obj) {
                //HTMLScriptElement.text  是一个属性，故用此方法
                if (_.isElement(obj)) return obj.innerText;
            },
            html: function(obj) {
                if (_.isElement(obj)) return obj.innerHTML;
            },
            fast: function() {
                var len = arguments.length,
                    args = new Array(len), //fast then Array.prototype.slice.call(arguments)
                    times = 10000;
                while (len--) args[len] = arguments[len];
                var last = args[args.length - 1];
                if (_.isNumber(last)) {
                    times = last;
                    args.pop();
                }
                var _run = function(fn, times) {
                    var word = 'run ' + fn.name + '{} ' + times + ' time' + (times > 1 ? 's' : '');
                    console.time(word);
                    while (times--) fn.apply(this, args);
                    console.timeEnd(word);
                }
                args.forEach(function(t) {
                    t && _run.call(this, t, times);
                });
            },

            //位置信息  事件 Element
            pos: function(e, offset) {
                function Postion(x, y, el) {
                    if (_.isDocument(el)) el = document.doctype ? window.document.documentElement : document.body;
                    this.x = x;
                    this.y = y;
                    this.time = +new Date();
                    this.el = el;
                    this.width = el.clientWidth; //不包括边框   el.offsetWidth包括边框;
                    this.height = el.clientHeight; //el.offsetHeight;
                    this.scrollTop = el.scrollTop;
                    this.scrollHeight = el.scrollHeight;
                    this.offsetHeight = el.offsetHeight;
                    this.rang = {
                        top: y,
                        left: x,
                        right: x + this.width,
                        bottom: y + this.height
                    }
                }
                var offsetPos;
                if (_.isElement(offset) || _.isTouchEvent(e) || _.isMouseEvent(e)) {
                    offsetPos = _.pos(offset)
                } else if (_.isObject(offset) && "Postion" === _.objectName(offset)) { // offset.__proto__.constructor.name ==
                    offsetPos = offset;
                }
                if (_.isElement(e)) { //元素
                    var el = e;

                    function _pos(el) {
                        var pos = new Postion(el.offsetLeft, el.offsetTop, el);
                        var target = el.offsetParent;
                        while (target) {
                            pos.x += target.offsetLeft;
                            pos.y += target.offsetTop;
                            target = target.offsetParent
                        }
                        if (offsetPos) {
                            pos.x -= offsetPos.x;
                            pos.y -= offsetPos.y;
                        }
                        return pos;
                    }
                    return _pos(el);
                } else if (_.isTouchEvent(e) || _.isMouseEvent(e)) { //事件
                    var ev = e,
                        x, y,
                        el = ev.currentTarget; //(一般为parent /document)  ev.target; //
                    var _touches = ev.touches && ev.touches.length > 0 ? ev.touches : ev.changedTouches;
                    if (!_touches || _touches.length === 0) {
                        x = ev.clientX;
                        y = ev.clientY;
                    } else {
                        var pos = _touches[0]; //第一个手指
                        x = pos.pageX;
                        y = pos.pageY;
                        // el = pos.target;
                        // if (_touches.length > 1) {  //多个手指
                        //     var ps = []
                        //     _touches.forEach(function(t) {
                        //         ps.push(new Postion(t.x, t.y, el);)
                        //     })
                        //     return ps;
                        // }

                    }
                    if (offsetPos) {
                        x -= offsetPos.x;
                        y -= offsetPos.y;
                    }
                    return new Postion(x, y, el);
                } else if (_.isString(e)) {
                    return _.pos(_.query(e))
                }
            },
            //拖动事件
            drag: function(el) {
                toucher({
                    el: el,
                    type: "drag"
                })
            },
            //url信息
            parseUrl: function(url) {
                var params = {},
                    hash = location.hash,
                    route = hash;
                var url = url || window.location.href;

                var domain, host, port;
                url.replace(/http[s]?:\/\/([^:]*?)(?::(\d+))?\//, function(d, h, p) {
                    domain = d.substring(0, d.length - 1);
                    host = h;
                    port = p;
                })

                var getHash = function() {
                    var match = url.match(/#(.*)$/);
                    return match ? match[1] : '';
                };
                var decodeFragment = function(fragment) {
                    return decodeURI(fragment.replace(/%25/g, '%2525'));
                };
                var getSearch = function() {
                    var match = location.href.replace(/#.*/, '').match(/\?.+/);
                    return match ? match[0] : '';
                };
                var getPath = function() {
                    var path = decodeFragment(
                        location.pathname + getSearch()
                    ).slice(0);
                    return path.charAt(0) === '/' ? path.slice(1) : path;
                };
                var path = getPath();

                hash = getHash();
                // api.html?id=3&page=fff#events
                // api.html#events?id=3&page=fff
                // api.html#events/1122
                url.replace(/[?&](.+?)=([^&#]*)/g, function(_, k, v) {
                    params[k] = decodeURI(v)
                });
                //#去重
                if (hash) {
                    hash = hash.length > 1 ? hash.replace(/#+/g, "#") : "";
                    route = hash.replace(/#/g, "");
                }
                return {
                    params: params,
                    hash: hash,
                    route: route,
                    path: path,
                    domain: domain,
                    host: host,
                    port: port
                }
            },
            guid: 1,
            //  生成一个随机id
            uId: function() {
                return Math.random().toString(16).slice(2);
            },
            //随机id
            random: function(possible, len, prefix) {
                if (_.isArray(possible)) {
                    return possible[Math.floor(Math.random() * possible.length)];
                } else if (_.isNumber(possible)) {
                    return Math.floor(Math.random() * possible);
                } else {
                    var str = prefix || "_",
                        len = len || 6,
                        possible = possible || "abcdefghijklmnopqrstuvwxyz"; //ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
                    for (var i = 0; i < len; i++) {
                        str += possible.charAt(Math.floor(Math.random() * possible.length));
                    }
                    return str;
                }
            },
            //随机
            between: function(min, max) {
                return min + Math.round((max - min) * Math.random());
            },
            //自动为ele生成一个随机id
            autoid: function(ele, force) {
                var _autoid = function(ele) {
                    if (_.isDocument(ele)) return ele;
                    if (_.isElement(ele)) {
                        if (force) {
                            ele.setAttribute("id", _.random());
                        } else {
                            _.isEmpty(ele.id) && ele.setAttribute("id", _.random());
                        }
                    }
                    return ele;
                };
                return _.isArray(ele) ? ele.map(function(t) {
                    return _autoid(t);
                }) : _autoid(ele);
            },
            //转化jquery =>Element
            jqToEl: function(selector, callback) {
                if (_.isJQuery(selector)) {
                    var result = [];
                    selector.each(function(i, t) {
                        if (callback) {
                            result.push(callback(t));
                        } else {
                            result.push(t);
                        }
                    });
                    return result.length === 1 ? result[0] : result;
                }
            },
            //Array.prototype.find已经存在，所以使用query
            //返回结果
            //找不到 返回  []，与 closest addclass removeclass等统一[] ，方便链式写
            //找到数组 [el]，长度为1的时，返回 el  ，方便 siblings链式
            query: function(selector) {
                // var args = Array.prototype.slice.call(arguments),
                //     len = args.length;
                var len = arguments.length,
                    args = new Array(len);
                while (len--) args[len] = arguments[len];
                if (args.length > 1) selector = args.join(",")
                if (_.isWindow(selector) || _.isDocument(selector)) return selector;
                if (_.isFunction(selector)) {
                    selector();
                    return [];
                }
                var _selectorFn = function(selector) {
                    if (_.isElement(this)) {
                        _.autoid(this);
                        if (this.id) {
                            var arr = selector.split(",");
                            var base = "#" + this.id;
                            selector = base + arr.join("," + base) + "," + base + " " + arr.join("," + base + " ");
                        }
                    }
                    return selector;
                }
                if (_.isElement(selector)) {
                    _.autoid(selector);
                    if (_.isElement(this)) {
                        selector = "#" + selector.id;
                        selector = _selectorFn.call(this, selector);
                    } else {
                        return selector;
                    }
                } else if (_.isArray(selector)) {
                    return selector.map(function(t) {
                        return _.query(t);
                    });
                } else if (_.isJQuery(selector)) { //兼容JQuery
                    return _.jqToEl(selector);
                } else {
                    selector = _selectorFn.call(this, selector);
                }

                try {
                    var eles = document.querySelectorAll(selector),
                        args = Array.prototype.slice.call(eles),
                        len = args.length;
                    return len === 0 ? [] : len === 1 ? _.autoid(args[0]) : _.autoid(args);
                } catch (e) {
                    console.log(e);
                    //jQuery特有表达式 :filter
                    var arr = selector.split(":");
                    return arr.length > 1 ? _.query(arr[0]).filter(arr[1]) : [];
                }
            },

            // filters
            //JavaScript对象
            //JSON.parse() 和   $.parseJSON 必须遵从格式完好
            // 字符串必须符合严格的JSON格式，属性名称必须加双引号、字符串值也必须用双引号。
            //JSON标准不允许字符串中出现"控制字符"，例如：一个Tab或换行符。正确写法应该如下(使用两个反斜杠，以免被JS解析器直接转义\t或\n)：
            //格式不完好的json字符串处理 "{id:1}"
            //不必符合严格的JSON格式
            //非标准格式json
            json: function(str) {
                if (_.isEmpty(str)) return {};
                try {
                    return JSON.parse(str)
                } catch (e1) {
                    console.log(e1);
                    try {
                        return eval("(" + str + ")");
                    } catch (e2) {
                        console.log(e2);
                        return e2;
                    }
                }
                // for bad json string
                //`{name:hhoh}`
                // `{\"id:\'1\'}`
                //"{\"id\":'1'}"
                // `{name:a\"bcd}`
                // `{name:'a\"bcd'}`
                //`{id:1,name:'haha,hi:jjo',hh:{Id:33}}`
                // Bad JSON escape sequence 解决方案
                // var _parseObj = function() {
                //     var obj_re = /^{([\s\S]*?):([\s\S]*)}$/
                //     var result = {}
                //     str.replace(obj_re, function(macth, key, val) {
                //         result[key] = val
                //     })
                //     return result
                // }
                // //[{a:1,b:2},{c:3}]  [1,2,3]
                // var _parseArr=function(){
                //     var arr_re=/^\[[\s\S]*\]$/
                //     var result=[];

                // }

            },
            //首字母大写
            capitalize: function(word) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) return _.capitalize.call(this, args);
                if (_.isArray(word)) return word.map(function(t) {
                    return _.capitalize(t);
                });
                word = '' + word;
                return word.substring(0, 1).toUpperCase() + word.substring(1);
            },
            //驼峰命名
            camelCase: function(word) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) return args[0] + _.capitalize(args.slice(1)).join('');
                if (_.isArray(word)) return word[0] + _.capitalize(word.slice(1)).join('');
                return args[0];
            },
            //驼峰转下划线 underscodeCase
            camel2underscode: function(camelCase) {
                return camelCase.match(/^[a-z][a-z0-9]+|[A-Z][a-z0-9]*/g).join('_').toLowerCase();
            },
            //复制到剪贴板 只绑定click事件
            copy: function(ele, showUI) {
                const range = document.createRange();
                range.selectNode(ele);
                const selection = window.getSelection();
                selection.rangeCount > 0 && selection.removeAllRanges();
                selection.addRange(range);
                // document.execCommand('copy'); //ios系统无效
                try {
                    if (document.execCommand('copy', showUI || false, null)) {
                        console.log("copy ok");
                        //success info
                    } else {
                        //fail info
                        console.log("copy fail");
                    }
                } catch (e) {
                    //fail info
                    console.log(e);
                    console.log("unable to copy");
                }
            },
            // toArray: function(obj) {
            //     var arr = [];
            //     for (var key in obj) {
            //         arr.push({
            //             key: obj[key]
            //         })
            //     }
            //     return arr;
            // },
            //代替 JSON.stringify()
            stringify: function(obj, ownProperty) {
                var str = "",
                    k, v;
                if (_.isUndefined(obj)) {
                    str = "undefined";
                } else if (_.isBoolean(obj)) {
                    str = obj.valueOf() ? "true" : "false"
                } else if (_.isString(obj)) {
                    str = "\"" + obj + "\""
                } else if (_.isNumber(obj)) {
                    str = obj.valueOf();
                } else if (_.isDocument(obj)) {
                    str = "#document";
                } else if (_.isElement(obj)) {
                    str = obj.tagName.toLowerCase();
                    str += obj.id ? "#" + obj.id : "";
                    str += obj.className ? "." + obj.className.replace(/\s+/g, ".") : "";
                } else if (_.isFunction(obj)) {
                    if (obj.prototype) {
                        str = "function " + obj.prototype.constructor.name + "(){}";
                    } else {
                        str = "function(){}";
                    }
                } else if (_.isArray(obj)) {
                    str = "[" + obj.map(function(t) {
                        return _.stringify(t);
                    }).join(",") + "]";
                } else if (_.isMouseEvent(obj)) {
                    str = "MouseEvent";
                    str += "(" + _.stringify(obj.target) + ")"
                } else if (_.isTouchEvent(obj)) {
                    str = "TouchEvent";
                    str += "(" + _.stringify(obj.target) + ")"
                } else if (_.isNull(obj)) {
                    str += "null";
                } else if (_.isDate(obj)) {
                    str = _.time(obj).format();
                } else if (typeof obj === "object") {
                    var sb = [];
                    for (k in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, k)) {
                            sb.push("\"" + k + "\":");
                            v = obj[k];
                            if (_.isArray(v)) {
                                v.forEach(function(t) {
                                    sb.push(_.stringify(t));
                                })
                            } else {
                                sb.push(_.stringify(v));
                            }
                            sb.push(",");
                        }
                    }
                    sb.pop();
                    str = "{" + sb.join('') + "}";
                } else if (_.isInfinity(obj)) {
                    str = "Infinity";
                } else {
                    str = "unknowtype";
                }
                return str;
            },
            //符合格式的json字符串
            toJSONString: function(json) {
                return _.isObject(json) ? JSON.stringify(json) : json;
            },
            //随机颜色
            color: function() {
                // return this.hsl();
                return this.rgba();
            },
            rgb: function(type) {
                //位移0去掉小数 正数取整
                return '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).slice(-6);
            },
            hsl: function() { //微信小程序不支持hsl
                return "hsl(" + Math.ceil(Math.random() * 360) + ",50%,50%)";
            },
            hsla: function() {
                return "hsla(" + Math.ceil(Math.random() * 360) + ",50%,50%,0.5)";
            },
            //深色 rgb 有一位小于80
            deepColor: function() {
                var n = Math.random() * 3 << 0;
                var c = [255, 255, 255].map(function(t, i) {
                    return i === n ? Math.random() * 80 << 0 : t * Math.random() << 0;
                    // return i == 3 ? t * Math.random().toFixed(1) : Math.round(t * Math.random())
                });
                return "rgb(" + c.join(",") + ")";
            },
            //输出rgba颜色格式  
            //红 100
            //绿 010
            //青 001 
            //黄 110 
            //紫 101
            //全彩 111
            //黑白灰 000
            rgba: function(r, g, b, a) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len < 4) {
                    var min = 0.1,
                        max = 0.7;
                    var a = (min + (max - min) * Math.random()).toFixed(1);
                }
                if (len < 3) {
                    var b = 1;
                }
                if (len < 2) {
                    var g = 1;
                }
                if (len < 1) {
                    var g = 1;
                }
                var arr = [r, g, b];
                if (r * g * b === 1) {
                    arr = arr.map(function(t) {
                        return Math.floor(Math.random() * 255);
                    });
                } else if (r + g + b === 0) {
                    var t = Math.floor(Math.random() * 255);
                    arr = [t, t, t];
                } else {
                    var rgb = 155;
                    var c = Math.floor(Math.random() * (255 - rgb) + rgb);
                    arr = arr.map(function(t) {
                        return t === 1 ? (Math.floor(Math.random() * (255 - rgb) + rgb)) : (Math.floor(Math.random() * (c / 2)));
                    });
                }
                arr.push(a);
                return "rgba(" + arr.join(",") + ")";
            },
            // hex2rgb
            colorRgb: function(color, alpha) {
                var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
                var sColor = color.toLowerCase();
                if (sColor && reg.test(sColor)) {
                    if (sColor.length === 4) {
                        var sColorNew = "#";
                        for (var i = 1; i < 4; i += 1) {
                            sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
                        }
                        sColor = sColorNew;
                    }
                    //处理六位的颜色值  
                    var sColorChange = [];
                    for (var i = 1; i < 7; i += 2) {
                        sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
                    }
                    if (alpha) {
                        sColorChange.push(alpha);
                        return "rgba(" + sColorChange.join(",") + ")";
                    }
                    return "RGB(" + sColorChange.join(",") + ")";
                } else {
                    return sColor;
                }

                // if (hex.length == 4) {
                //     hex = hex.replace(/^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/, function(m, r, g, b) {
                //         return "#" + [r, g, b].map(function(t) {
                //             return "" + t + t;
                //         }).join('');
                //     })
                // }
                // if (color.length == 7) {
                //     return hex.replace(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/, function(m, r, g, b) {
                //         return "rgb(" + [r, g, b].map(function(t) {
                //             return parseInt("0x" + t); //parseInt(t, 16)
                //         }) + ")";
                //     });
                // }
                // return hex;
            },
            // rgb2hex
            colorHex: function(color) {
                var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
                if (/^(rgb|RGB)/.test(color)) {
                    var aColor = color.replace(/(?:|||rgb|RGB)*/g, "").split(",");
                    var strHex = "#";
                    for (var i = 0; i < aColor.length; i++) {
                        var hex = Number(aColor[i]).toString(16);
                        if (hex === "0") hex += hex;
                        strHex += hex;
                    }
                    if (strHex.length !== 7) strHex = color;
                    return strHex;
                } else if (reg.test(color)) {
                    var aNum = color.replace(/#/, "").split("");
                    if (aNum.length === 6) {
                        return color;
                    } else if (aNum.length === 3) {
                        var numHex = "#";
                        aNum.forEach(function(t) {
                            numHex += t + t;
                        });
                        return numHex;
                    }
                } else {
                    return color;
                }

            },

            //渐变色数组  每两位的颜色小于80是深色
            gradientColor: function(startColor, endColor, step) {
                var startRGB = this.colorRgb(startColor); //转换为rgb数组模式
                var startR, startG, startB;
                startRGB.replace(/(\d{1,3}),(\d{1,3}),(\d{1,3})/g, function(m, r, g, b) {
                    startR = Number(r);
                    startG = Number(g);
                    startB = Number(b);
                });
                var endRGB = this.colorRgb(endColor);
                var endR, endG, endB;
                endRGB.replace(/(\d{1,3}),(\d{1,3}),(\d{1,3})/g, function(m, r, g, b) {
                    endR = Number(r);
                    endG = Number(g);
                    endB = Number(b);
                });

                sR = (endR - startR) / step; //总差值
                sG = (endG - startG) / step;
                sB = (endB - startB) / step;

                var colorArr = [];
                for (var i = 0; i < step; i++) {
                    //计算每一步的hex值 
                    var rgba = 'rgba(' + parseInt((sR * i + startR)) + ',' + parseInt((sG * i + startG)) + ',' + parseInt((sB * i + startB)) + ',0.5)';
                    colorArr.push(rgba);
                    // var hex = this.colorHex();
                    // colorArr.push(hex);
                }
                return colorArr;
            },
            isHtml: function(tpl) {
                return /<(\S*?) [^>]*>.*?<\/\1>|<.*?\/?>/.test(tpl);
            },
            enHtml: function(tpl) {
                return tpl.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            },
            deHtml: function(tpl) {
                return tpl.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
            },
            preHtml: function(tpl) {
                // return tpl.replace(/\r\n?/g, "<br>");
                return tpl.replace(/\n/g, "<br>").replace(/\r/g, "<br>");
            },
            getBody: function(content) {
                var REG_BODY = /<body[^>]*>([\s\S]*)<\/body>/i;
                var matcher = content.match(REG_BODY);
                return matcher && matcher.length > 1 ? matcher[1] : content;
            },
            // todo
            markdown: function(tpl) {
                if (_.isEmpty(tpl)) {
                    tpl = '# 标题  ## 标题2  \n' +
                        '*粗体*  **粗体**  _斜体_ \n' +
                        '***分割___分割---  \n' +
                        '> 引用1 \n' +
                        '> 引用2 \n' +
                        '* 列表项目1 \n* 列表项目2 \n' +
                        '- 列表项目1 \n- 列表项目2 \n' +
                        '+ 列表1\n+ 列表2 \n ' +
                        '1. 列表1\n2. 列表2 \n ' +
                        "[1连接](www.xxx.com) [2连接](www.xxx.com) [3连接](www.xxx.com) [4连接](www.xxx.com) [5连接](www.xxx.com)\n" +
                        '[Ivan Dementev][]\n' +
                        '[Ivan Dementev]: https://github.com/DiVAN1x \n' +
                        "|表格|字段1|字段2|\n|---|---|---|\n|你好|呵呵|吼吼|\n" +
                        '`for(var i=0;i<10,i++) if(i>=5) alert("")`'
                    console.log(tpl.replace(/\r?\n/g, "\\r\\n\r\n"));
                }

                //注意先后顺序
                var regs = [
                    // 区块引用 >
                    { tag: "blockquote", reg: /(>\s.+\r?\n)+/g },
                    //表格 
                    { tag: "table", reg: /(\|.+\|\r?\n)+/g },
                    //标题 #
                    { tag: "h6", reg: /#{6}\s(.+)/g },
                    { tag: "h5", reg: /#{5}\s(.+)/g },
                    { tag: "h4", reg: /#{4}\s(.+)/g },
                    { tag: "h3", reg: /#{3}\s(.+)/g },
                    { tag: "h2", reg: /#{2}\s(.+)/g },
                    { tag: "h1", reg: /#{1}\s(.+)/g },
                    //连接
                    // { tag: "img", reg: /\[img\]\((.*?)\)/g },
                    { tag: "img", reg: /!\[(.*?)\]\((.*?)\)/g },
                    { tag: "marklink", reg: /\[(.*?)\]\[(.*?)\]/ },

                    //[Philipp A]: https://github.com/flying-sheep
                    { tag: "ref", tag: /\[.*?\]:\s+(https?:\/\/.+)/ },
                    { tag: "a", reg: /\[(.*?)\]\((.*?)\)|(https?:\/\/.+)/g },

                    // { tag: "a", reg: /\[(.*?)\]\((.*?)\)/g },
                    // { tag: "a", reg: /(https?:\/\/.+)/g },

                    //分隔
                    { tag: "hr", reg: /[\*|\-|_]{3,}/g },
                    //强调
                    { tag: "strong", reg: /\*\*(.*?)\*\*/g },
                    { tag: "em", reg: /\*(.*?)\*/g },
                    //斜体
                    { tag: "i", reg: /[\s\n]_(.*?)_[\s|\n]/g },
                    //列表
                    // { tag: "ul", reg: /(\s+[\*-]\s.+\r?\n)+/g },
                    // { tag: "ul", reg: /([\*-]\s.+(\r?\n|$))+/g }, //[\n]
                    // { tag: "ul", reg: /([\*-]\s[\s\S]+)+/g },

                    // { tag: "test", reg: /(\s*?-\s[^(-\s)]*)+/g },
                    //\d+[.)][\n ]



                    { tag: "ul", reg: /(?:-\s[\s\S]*)?-\s.*(\r?\n|$)/g },
                    { tag: "ul", reg: /(?:\*\s[\s\S]*)?\*\s.*(\r?\n|$)/g },
                    // { tag: "ul", reg: /(\s*?-\s[\s\S]+(?:\r?\n|$))+/g },
                    // { tag: "ul", reg: /(\s*?-\s.+[\r?\n|$])+|(\s*?\*\s.+[\r?\n|$])+/g },
                    // { tag: "ul", reg: /(\s*?-\s.+[\r?\n|$])+/g },
                    // { tag: "ul", reg: /(\s*?\*\s.+[\r?\n|$])+/g },


                    // { tag: "ul", reg: /(-\s[^-]+)+(\r?\n|$)?/g },
                    // { tag: "ul", reg: /(\*\s[^-]+)+?(\r?\n|$)?/g },
                    // { tag: "ul", reg: /(\s{2,4}-\s[^-]+)+$?/g },
                    // { tag: "ul", reg: /(-\s.+?(\r?\n|$))+/g },
                    // { tag: "ul", reg: /(\*\s.+?(\r?\n|$))+/g },
                    // { tag: "ul", reg: /(\-\s.+[\n]){1,}/g },
                    // { tag: "ul", reg: /(-\s.+\r?\n){1,}/g },

                    { tag: "ol", reg: /(\+\s.+\r?\n)+|(\d\.\s.+\r?\n)+/g },
                    // { tag: "ol", reg: /(\+\s.+\r?\n)+/g },
                    // { tag: "ol2", reg: /(\d\.\s.+\r?\n)+/g },

                    // { tag: "ol", reg: /([\+|\d\.]\s.+\r?\n){1,}/g },

                    { tag: "code", reg: /`([\s\S]+)`/g },

                    //换行
                    { tag: "br", reg: /\r?\n/g },
                ]
                //var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');

                var _start = function(tag, options) {
                    var sb = [];
                    sb.push('<');
                    sb.push(tag);
                    for (var key in options) {
                        sb.push(' ' + key + '="' + options[key] + '"');
                    }
                    sb.push('>');
                    return sb.join('');
                }
                var _end = function(tag) {
                    return '</' + tag + '>';
                }

                var _wrap = function(tag, text, options) {
                    return text ? _start(tag, options) + text + _end(tag) : _start(tag, options);
                }

                var escape = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;'
                }
                var _escape = function() {
                    var keys = _.keys(escape)
                    var reg = new RegExp('[' + keys.join('') + ']', 'g');
                    return this.replace(reg, function(macth) {
                        return escape[macth]
                    })
                }

                var _replace = function(tag, reg) {
                    var self = this;
                    return this.replace(reg, function(match, text, link, link2) {
                        switch (tag) {
                            case "ref":
                                return "";
                                break;
                            case "marklink":
                                link = link || text
                                var reg = new RegExp('\\[' + link + '\\]\:(.*?)\\r?\\n', 'i');
                                var link2 = self.match(reg)[1];
                                self = self.replace(reg, "");
                                return _wrap("a", text, link2);
                                break
                            case 'img':
                                return _wrap(tag, null, { alt: text, src: link })
                                break;
                            case 'a':
                                return _wrap(tag, text || match, { href: link || link2 })
                                break;
                                // case 'link':
                                //     return _wrap("a", text, { href: text })
                                //     break;
                            case 'br':
                            case 'hr':
                                return _wrap(tag);
                                break;
                            case "blockquote":
                                match = _escape.call(match);
                                return _wrap(tag, match);
                                break;
                            case 'ul':
                                //\d+[.)][\n ]
                                // match = _replace.call(match, "childul", /(\s+[\*-]\s(.+)[\r?\n|$])+/g);

                                // match = match.replace(/(\s{2}-\s(.+)(?:\n|$))+/g, function(match) {
                                //     return _wrap(tag, match)
                                // })

                                match = _replace.call(match, "li", /[\*-]\s([\s\S]+?)(?:\n|$)/g);
                                // match = _replace.call(match, "li", /[\*-]\s([\s\S]+?)[\r?\n|$]/g); //递归
                                return _wrap(tag, match)
                                break;
                            case 'ol':
                                match = _replace.call(match, "li", /[(?:\d+\.)|\+]\s(.+)\r?\n/g); //递归
                                return _wrap(tag, match)
                                break;
                                // case 'ol':
                                //     match = _replace.call(match, "li", /\+\s(.+)\r?\n/g); //递归
                                //     return _wrap(tag, match)
                                //     break;
                                // case 'ol2':
                                //     match = _replace.call(match, "li", /\d\.\s(.+)\r?\n/g); //递归
                                //     return _wrap("ol", match)
                                //     break;
                            case "tr":
                                var tds = text.split("|").join("</td><td>");
                                tds = _wrap("td", tds);
                                return _wrap("tr", tds);
                                break;
                            case "table":
                                match = match.replace(/\|.*[\-]{3,}.*\|[\r?\n]/g, "");
                                var trs = _replace.call(match, "tr", /\|(.+)\|[\r?\n]/g); //递归
                                return _wrap(tag, trs);
                                break;
                            case "h1":
                                return _wrap(tag, text);
                                break;
                            case "i":
                                return _wrap(tag, text);
                                break;
                            case "li":
                                return _wrap(tag, text);
                                break;
                            case "code":
                                text = _escape.call(text);
                                return _wrap(tag, text);
                                break;

                            default:
                                return _wrap(tag, text);
                                break;
                        }

                    })

                }

                var reg, tag;
                for (var i = 0, len = regs.length; i < len; i++) {
                    reg = regs[i].reg;
                    tag = regs[i].tag;
                    tpl = _replace.call(tpl, tag, reg);
                }
                return _wrap("article", tpl, { class: "markdown-body entry-content" });
            },
            // html: function(str) { //htmlspecialchars
            //     // var reg_http=/(((https?):\/\/)?)(((www\.)?([a-zA-Z0-9\-\.\_]+(\.[a-zA-Z]{2,4})))/;
            //     // var reg_http=/^(((https?):\/\/)?)(((www\.)?([a-zA-Z0-9\-\.\_]+(\.[a-zA-Z]{2,4})))/
            //     // var ip=/((25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3})/
            //     // var options=/(\/[a-zA-Z0-9\_\-\s\.\/\?\%\#\&\=]*)?/
            //     // var r=/((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}))(:(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3}))?/

            //     if (/^(((https?):\/\/)?)(((www\.)?([a-zA-Z0-9\-\.\_]+(\.[a-zA-Z]{2,4})))|((25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3})|((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}))(:(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3}))?(\/[a-zA-Z0-9\_\-\s\.\/\?\%\#\&\=]*)?$/g.test(str)) {
            //         return '<div class="link" style="color:#6D6DB7;">' + str + '</div>'
            //     } else {
            //         return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br/>');
            //     }
            // },
            isShow: function(elem) {
                //display:none  elem.offsetWidth ==0  不占空间
                //opacity:0 elem.offsetWidth>0  占空间
                elem = _.isElement(elem) ? elem : _.query(elem);
                return elem.offsetWidth > 0 || elem.offsetHeight > 0;
            },
            isHide: function(elem) {
                elem = _.isElement(elem) ? elem : _.query(elem);
                return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
            },
            hasClass: function(cls) {
                var elem = this;
                if (_.isJQuery(elem)) elem = elem.get(0);
                return _.isElement(elem) ? !!~elem.className.split(" ").indexOf(cls) : false;
            },
            addClass: function(cls) {
                var elem = this,
                    clsArr = Array.prototype.slice.call(arguments);
                if (clsArr.length === 1 && cls) clsArr = cls.split(" ");

                return (function _addClass(elem) {
                    if (_.isString(elem)) elem = _.query(elem);
                    if (_.isElement(elem)) {
                        elem.className = _.uniq(elem.className.split(" ").concat(clsArr)).join(" "); //允许一次加多个样式
                    } else if (_.isJQuery(elem)) {
                        elem.addClass(cls); //兼容jquery
                    } else if (_.isArray(elem)) {
                        return elem.map(function(t) {
                            return _addClass(t);
                        });
                    }
                    return elem;
                })(elem);
            },
            removeClass: function(cls) {
                var elem = this;
                var clsArr = Array.prototype.slice.call(arguments);
                if (clsArr.length === 1 && cls) clsArr = cls.split(" ");


                clsArr.length > 1 && clsArr.forEach(function(t) {
                    _.removeClass.call(elem, t)
                });

                return (function _removeClass(elem) {
                    if (_.isString(elem)) elem = _.query(elem);
                    if (_.isElement(elem)) {
                        if (elem.hasClass(cls)) {
                            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                            elem.className = elem.className.replace(reg, ' ').trim();
                        }
                    } else if (_.isJQuery(elem)) {
                        elem.removeClass(cls); //兼容jquery
                    } else if (_.isArray(elem)) {
                        return elem.map(function(t) {
                            return _removeClass(t);
                        });
                    }
                    return elem
                })(elem);
            },
            //悬停效果
            hover: function(cls, callback) {
                var elem = this;
                toucher([{
                    el: elem,
                    type: "touchstart",
                    callback: function(item, ev) {
                        item.addClass(cls)
                        // _.addClass.call(item, cls);
                    }
                }, {
                    el: elem,
                    type: "touchend",
                    callback: function(item, ev) {
                        item.removeClass(cls)
                        // _.removeClass.call(item, cls);
                        callback && callback.call(item, ev);
                    }
                }])
                return elem;
            },
            //tab栏切换
            tab: function(cls, callback) {
                var elem = this;
                toucher([{
                    el: elem,
                    type: "touchstart",
                    callback: function(item, ev) {
                        item.addClass(cls).siblings().removeClass(cls);
                        _.$('#' + this.attr("target")).show().siblings().hide();
                    }
                }, {
                    el: elem,
                    type: "touchend",
                    callback: function(item, ev) {
                        callback && callback.call(item, ev);
                    }
                }])
                return elem;
            },
            //数组切割
            slice: function(arr, size) {
                var args = Array.prototype.slice.call(arguments), //转换成数组
                    len = args.length;
                if (len === 2 && _.isArray(arr) && _.isNumber(size)) {
                    var result = [];
                    for (var x = 0; x < Math.ceil(arr.length / size); x++) {
                        var start = x * size;
                        var end = start + size;
                        result.push(arr.slice(start, end));
                    }
                    return result;
                }
                return len === 0 ? null : len === 1 ? args[0] : args;
            },
            //判断是否有属性
            hasAttr: function(attr) {
                var elem = this;
                if (_.isElement(elem)) {
                    return !_.isNull(elem.getAttribute(attr));
                } else if (_.isJQuery(elem)) {
                    return !_.isUndefined(elem.attr(attr));
                } else if (_.isString(elem)) {
                    return _.hasAttr.call(_.query(elem), attr)
                } else {
                    return false;
                }
            },

            //contenteditable是非标准的编辑，光标不能自动跳入，需要用脚本控制
            focus: function(editor) {
                editor.onfocus = function() {
                    window.setTimeout(function() {
                        var sel, range;
                        try {
                            if (window.getSelection && document.createRange) {
                                range = document.createRange();
                                range.selectNodeContents(editor);
                                range.collapse(true);
                                range.setEnd(editor, editor.childNodes.length);
                                range.setStart(editor, editor.childNodes.length);
                                sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(range);
                            } else if (document.body.createTextRange) {
                                range = document.body.createTextRange();
                                range.moveToElementText(editor);
                                range.collapse(true);
                                range.select();
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    }, 1);
                }
                editor.focus();
            },



            //图片状态
            isImgLoad: function(img) {
                return isIE ? img.readyState === 'complete' : img.complete;
            },
            loadImg: function(imgSrc, callback) {
                var originImg; //原图
                if (_.isImage(imgSrc)) {
                    originImg = imgSrc
                } else if (_.isCanvas(imgSrc)) {
                    var canvas = imgSrc;
                    originImg = new Image();
                    originImg.src = canvas.toDataURL('image/jpeg'); //quality
                } else {
                    originImg = new Image();
                    // originImg.crossOrigin = ''; //支持CORS(Cross-Origin Resource Sharing)（跨域资源共享）
                    originImg.src = imgSrc;
                }
                if (_.isImgLoad(originImg)) {
                    callback && callback.call(originImg, originImg);
                } else {
                    addEvent("load", originImg, function() { // 支持对同一图片处理
                        callback && callback.call(originImg, originImg);
                    })
                    originImg.onerror = function(e) {
                        console.log("加载图片失败：" + e.path[0].src);
                    }
                }
            },
            toDataURL: function(imgSrc, callback) {
                var _toDataURL = function(originImg) {
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");
                    var width = originImg.width;
                    var height = originImg.height;
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(originImg, 0, 0, width, height);
                    var img = new Image();
                    img.onload = function() {
                        callback && callback(img);
                    }
                    img.src = canvas.toDataURL('image/jpeg'); //quality

                }
                _.loadImg(imgSrc, _toDataURL);
            },
            toCanvas: function(imgSrc, callback) {
                var _toCanvas = function(originImg) {
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");
                    var width = originImg.width;
                    var height = originImg.height;
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(originImg, 0, 0, width, height);
                    callback && callback(canvas);
                }
                _.loadImg(imgSrc, _toCanvas);
            },
            //切图
            //x轴n等分
            //y轴n等分
            cutImg: function(imgSrc, splitX, splitY, callback) {

                var splitX = _.isUndefined(splitX) ? 3 : splitX;
                var splitY = _.isUndefined(splitY) ? 3 : splitY;
                var _cutImg = function(originImg) {
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");
                    var width = originImg.width;
                    var height = originImg.height;
                    canvas.width = width;
                    canvas.height = height;
                    //切图
                    var imgArr = [];
                    var swidth = width / splitX;
                    var sheight = height / splitY;
                    var index = 0;
                    for (var j = 0; j < splitY; j++) {
                        for (var i = 0; i < splitX; i++) {
                            ctx.drawImage(originImg, i * swidth, j * sheight, swidth, sheight, 0, 0, width, height);
                            var img = new Image();
                            img.src = canvas.toDataURL('image/jpeg');
                            img.width = swidth;
                            img.height = sheight;
                            img.className = "thumbnail";
                            img.id = "_thumbnail_" + index++;
                            imgArr.push(img);
                        }
                    }
                    callback && callback(imgArr);
                }
                _.loadImg(imgSrc, _cutImg);
            },

            //缩放得到新图片 
            //img, width, height, quality callback
            //zoom 定义了width 或height ，zoom就失效了
            zipImg: function(options) {
                var canvas = document.createElement("canvas"),
                    img = options.img,
                    width = options.width,
                    height = options.height,
                    quality = options.quality,
                    zoom = options.zoom,
                    callback = options.callback;
                _.loadImg(img, function() {
                    if (_.isUndefined(width) && _.isUndefined(height) && !_.isUndefined(zoom)) {
                        width = this.width * zoom;
                        height = this.height * zoom;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(this, 0, 0, width, height);
                    var newImg = new Image();
                    newImg.src = canvas.toDataURL('image/jpeg', quality);
                    _.loadImg(newImg, callback);
                });
            },
            //反色
            reverse: function(imgSrc, callback) {
                var _reverse = function(originImg) {
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");

                    var width = originImg.width;
                    var height = originImg.height;
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(originImg, 0, 0);
                    var imgData = ctx.getImageData(0, 0, width, height);
                    // 反转颜色
                    for (var i = 0; i < imgData.data.length; i += 4) {
                        imgData.data[i] = 255 - imgData.data[i];
                        imgData.data[i + 1] = 255 - imgData.data[i + 1];
                        imgData.data[i + 2] = 255 - imgData.data[i + 2];
                        imgData.data[i + 3] = 255;
                    }
                    ctx.putImageData(imgData, 0, 0);
                    var img = new Image();
                    img.src = canvas.toDataURL('image/jpeg'); //quality
                    callback && callback(img);
                }
                _.loadImg(imgSrc, _reverse);
            },
            masic: function(imgSrc, callback) {
                var _masic = function(originImg) {

                }

            },
            //时序sequence ,间隔时间
            timeSeq: function(arr, interval, callback) {
                arr.forEach(function(t, i) {
                    (function(index) {
                        setTimeout(function() {
                            callback && callback(t);
                        }, (interval || 500) * index)
                    })(i)
                })
            },
            background: function(el, imgSrc) {
                var el = _.query(el);
                _.loadImg(imgSrc, function(img) {
                    el.style.backgroundImage = 'url("' + img.src + '")';
                })
            },


            each: function(obj, iterator, context) {
                if (obj == null) return obj;
                if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
                    obj.forEach(iterator, context);
                } else if (obj.length === +obj.length) {
                    for (var i = 0, length = obj.length; i < length; i++)
                        if (iterator.call(context, obj[i], i, obj) === {}) return;
                } else {
                    var keys = _.keys(obj);
                    for (var i = 0, length = keys.length; i < length; i++)
                        if (iterator.call(context, obj[keys[i]], keys[i], obj) === {}) return;
                }
                return obj;
            },

            any: function(obj, predicate, context) {
                predicate || (predicate = function(value) {
                    return value;
                });
                var result = false;
                if (obj == null) return result;
                if (Array.prototype.some && obj.some === Array.prototype.some) return obj.some(predicate, context);
                _.each(obj, function(value, index, list) {
                    if (result || (result = predicate.call(context, value, index, list))) return {};
                });
                return !!result;
            },
            contains: function(obj, target) {
                if (obj == null) return false;
                if (obj == target) return true; //
                if (Array.prototype.indexOf && obj.indexOf === Array.prototype.indexOf) return !!~obj.indexOf(target);
                return _.any(obj, function(value) {
                    return value === target;
                });
            },
            size: function(obj) {
                if (obj == null) return 0;
                return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
            },
            filter: function(obj, predicate, context) {
                var results = [];
                if (obj == null) return results;
                if (Array.prototype.filter && obj.filter === Array.prototype.filter) return obj.filter(predicate, context);
                _.each(obj, function(value, index, list) {
                    if (predicate.call(context, value, index, list)) results.push(value);
                });
                return results;
            },
            max: function(array) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) array = args;

                //多维数组转一维
                var ta = _.isArray(array) ? array.join(",").split(",") : array.split(",");
                //去非数字
                for (var i = 0; i < ta.length; i++) {
                    if (ta[i] === "") {
                        ta.splice(i, 1);
                        i--;
                    }
                }
                return ta === [] ? 0 : Math.max.apply(Math, ta);
            },
            min: function(array) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) array = args;

                //多维数组转一维
                var ta = _.isArray(array) ? array.join(",").split(",") : array.split(",");
                //去非数字
                for (var i = 0; i < ta.length; i++) {
                    if (ta[i] == "") {
                        ta.splice(i, 1);
                        i--;
                    }
                }
                return ta === [] ? 0 : Math.min.apply(Math, ta);
            },


            // define: function(obj, key) {
            //     Object.defineProperty(obj, key, {
            //         set: function(value) {
            //             //  针对 o.key = value 的set方法
            //             if (!datas[key]) {
            //                 obj.size++
            //             }
            //             datas[key] = value
            //         },
            //         get: function() {
            //             //  获取当前数据，如果当前数据有值，返回值并将当前属性值设置为undefined
            //             var res = undefined
            //             if (typeof datas[key] !== undefined) {
            //                 res = datas[key]
            //                 obj.size--
            //                     datas[key] = undefined
            //             }
            //             return res
            //         }
            //     })
            // },

            //克隆并 继承.可继承{}， 不能继承 undefined []
            clone: function(obj) {
                if (!_.isObject(obj)) return obj;
                if (_.isArray(obj)) return obj.slice();
                var args = Array.prototype.slice.call(arguments);
                args.unshift({});
                return _.extend.apply(null, args);
            },
            // {key:value} => {value:key}  ，Invert the keys and values of an object. The values must be serializable.
            invert: function(obj) {
                var result = {};
                var keys = _.keys(obj);
                keys.forEach(function(t) {
                    result[obj[t]] = t;
                });
                return result;
            }
        };

        // _.upperCaseFirstAlphabet=function(str){
        //     return str.replace(/[a-z]/,function(m){
        //         return m.toUpperCase();
        //     })
        // }


        //show hide

        [{ "key": "hide", "reverse": "show" },
            { "key": "active", "reverse": "passive" },
            { "key": "disabled", "reverse": "available" },
            { "key": "fadeout", "reverse": "fadein", "type": "animate" },
            { "key": "fadeoutup", "reverse": "fadeindown", "type": "animate" },
            { "key": "fadeinup", "reverse": "fadeoutdown", "type": "animate" },
            { "key": "fadeoutleft", "reverse": "fadeinright", "type": "animate" },
            { "key": "fadeinleft", "reverse": "fadeoutright", "type": "animate" }
        ].forEach(function(t) {
            _[t.key] = function() {
                var len = arguments.length,
                    args;
                if (len === 0) {
                    return;
                } else if (len === 1) {
                    args = arguments[0];
                } else {
                    args = new Array(len);
                    while (len--) args[len] = arguments[len];
                }


                // var elem =Array.prototype.slice.call(arguments);
                if (t.type === "animate") {
                    _.removeClass.call(args, t.reverse, "hide")
                }
                return _.addClass.call(args, t.key);
            };

            _[t.reverse] = function() {
                var len = arguments.length,
                    args;
                if (len === 0) {
                    return;
                } else if (len === 1) {
                    args = arguments[0];
                } else {
                    args = new Array(len);
                    while (len--) args[len] = arguments[len];
                }
                // var elem = Array.prototype.slice.call(arguments);
                if (t.type === "animate") {
                    _.addClass.call(args, t.reverse);
                    return _.removeClass.call(args, t.key, "hide");
                }
                return _.removeClass.call(args, t.key);
            };

            // _['is'+_.upperCaseFirstAlphabet(t.key)]=function(){
            //     var elem = slice.call(arguments);
            //     return _.hasAttr.call(elem,t.key);
            // }

        });

        // _.animate=function(type,elem){
        //      _.removeClass.call(elem, "hide")
        //      return _.addClass.call(elem, type);
        // }


        //去掉'Element' 'Object'，需单独处理
        //增加NodeList Arguments Window touchevent MouseEvent Screen  Infinity Date
        ['Null', 'Undefined', 'Array', 'String', 'Number',
            'Boolean', 'Function', 'RegExp', 'NaN', 'Infinity', // 'Infinite',
            'NodeList', 'Arguments', 'Window', 'TouchEvent', 'MouseEvent', 'Screen', 'Date'
        ].forEach(function(t) {
            _['is' + t] = function(o) {
                return _.type(o) === t.toLowerCase();
            };
        });
        // [object HTMLDivElement] is Object
        _.isObject = function(o) {
            return _.isElement(o) ? true : _.type(o) === "object";
        };
        //html Element
        ['Div', 'Image', 'Canvas'].forEach(function(t) {
            _['is' + t] = function(o) {
                return _.type(o) === 'html' + t.toLowerCase() + 'element';
            };
        });
        //空数组  空对象
        _.isEmpty = function(obj) {
            if (obj == null) return true;
            if (_.isNumber(obj)) return false; //数字不为空 ，0也不为空
            if (_.isDate(obj)) return false; //日期
            if (_.isArray(obj) || _.isString(obj)) return obj.length === 0; //空数组
            if (_.isElement(obj)) return _.size(obj) === 0; //dom
            for (var key in obj)
                if (_.has(obj, key)) return false; //对象有属性
            return true;
        };
        _.uniq = _.unique = function(array, isSorted, iterator, context) {
            if (_.isFunction(isSorted)) {
                context = iterator;
                iterator = isSorted;
                isSorted = false;
            }
            var initial = iterator ? _.map(array, iterator, context) : array;
            var results = [];
            var seen = [];
            _.each(initial, function(value, index) {
                if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
                    seen.push(value);
                    results.push(array[index]);
                }
            });
            return results;
        };
        _.identity = function(value) {
            return value;
        };
        _.every = _.all = function(obj, predicate, context) {
            predicate || (predicate = _.identity);
            var result = true;
            if (obj == null) return result;
            if (Array.prototype.every && obj.every === Array.prototype.every) return obj.every(predicate, context);
            _.each(obj, function(value, index, list) {
                if (!(result = result && predicate.call(context, value, index, list))) return breaker;
            });
            return !!result;
        };

        _.intersection = function(array) {
            var rest = Array.prototype.slice.call(arguments, 1);
            return _.filter(_.uniq(array), function(item) {
                return _.every(rest, function(other) {
                    return _.contains(other, item);
                });
            });
        };

        _.difference = function(array) {
            var rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
            return _.filter(array, function(value) {
                return !_.contains(rest, value);
            });
        };
        _.without = function(array) {
            return _.difference(array, Array.prototype.slice.call(arguments, 1));
        };
        _.map = _.collect = function(obj, iterator, context) {
            var results = [];
            if (obj == null) return results;
            if (Array.prototype.map && obj.map === Array.prototype.map) return obj.map(iterator, context);
            _.each(obj, function(value, index, list) {
                results.push(iterator.call(context, value, index, list));
            });
            return results;
        };
        _.property = function(key) {
            return function(obj) {
                return obj[key];
            };
        };
        _.pluck = function(obj, key) {
            return _.map(obj, _.property(key));
        };

        _.indexOf = function(str1, str2) {
            if (_.isUndefined(str1) || _.isUndefined(str2)) {
                return -1;
            } else {
                if (_.isAarray(str1)) {
                    return str1.indexOf(str2);
                } else if (_.isString(str1)) {
                    return str1.toLowerCase().indexOf(str2.toLowerCase())
                }
            }
        }

        // Internal implementation of a recursive `flatten` function.
        var flatten = function(input, shallow, output) {
            if (shallow && _.every(input, _.isArray)) return Array.prototype.concat.apply(output, input);
            _.each(input, function(value) {
                if (_.isArray(value) || _.isArguments(value)) {
                    shallow ? Array.prototype.push.apply(output, value) : flatten(value, shallow, output);
                } else {
                    output.push(value);
                }
            });
            return output;
        };

        // Flatten out an array, either recursively (by default), or just one level.
        _.flatten = function(array, shallow) {
            return flatten(array, shallow, []);
        };

        _.getVal = function(data, name) {
            var val = "",
                nameArr = name.split("."),
                len = nameArr.length;
            if (_.isObject(data)) {
                if (len === 1) {
                    val = data[name];
                } else {
                    val = data[nameArr.shift()];
                    len = len - 1;
                    if (_.isObject(val)) {
                        for (var i = 0; i < len; i++) {
                            val = val[nameArr[i]];
                            if (_.isUndefined(val)) return val = "";
                        }
                    }
                }
            } else if (_.isString(data) || _.isNumber(data)) {
                if (name === "text") val = data;
            }
            return val;
        }

        _.$ = _.query;


        // List of HTML entities for escaping.
        var entityMap = {
            escape: {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;'
            }
        };
        entityMap.unescape = _.invert(entityMap.escape);

        // Regexes containing the keys and values listed immediately above.
        var entityRegexes = {
            escape: new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
            unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
        };

        //定义函数 'escape', 'unescape'
        ['escape', 'unescape'].forEach(function(t) {
            _[t] = function(str) {
                return str == null ? '' : ('' + str).replace(entityRegexes[t], function(match) {
                    return entityMap[t][match];
                });
            };
        })

        /**
         * 。。。。
         * 
         * @memberOf string
         * @param {Object} obj 要转换成查询字符串的对象
         * @return {String} 返回转换后的查询字符串
         */
        _.toQueryPair = function(key, value) {
            return encodeURIComponent(String(key)) + "=" + encodeURIComponent(String(value));
        };

        /**
         * 。。。。
         * 
         * @memberOf string
         * @param {Object} obj 要转换成查询字符串的对象
         * @return {String} 返回转换后的查询字符串
         */
        _.toQueryString = function(obj) {
            var result = [];
            for (var key in obj) result.push(_.toQueryPair(key, obj[key]));
            return result.join("&");
        };

        _.ajax = function(uri) {
            var xmlHttp = false;
            var done = false;
            var invokeTimes = 0;
            var type = type || 'GET';
            var option = {
                method: "GET",
                data: null,
                arguments: null,
                success: function() {},
                error: function() {},
                complete: function() {},
                isAsync: true,
                timeout: 30000,
                contentType: null,
                // type: "xml"  //resultType
                dataType: "json"
            };


            var args = Array.prototype.slice.call(arguments),
                len = args.length;
            if (len >= 2) {
                if (_.isFunction(args[1])) {
                    _.extend(option, {
                        success: args[1]
                    })
                } else if (_.isObject(args[1])) {
                    _.extend(option, args[1]);
                    if (_.isObject(option.data)) option.data = _.toQueryString(option.data);
                }

            }


            len >= 3 && _.isFunction(args[2]) && _.extend(option, {
                error: args[2]
            })


            function createXmlHttpRequest() {
                try {
                    xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
                } catch (e) {
                    try {
                        xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
                    } catch (e2) {
                        xmlHttp = false;
                    }
                }
                if (!xmlHttp && typeof XMLHttpRequest !== "undefined") xmlHttp = new XMLHttpRequest();
            }

            function sendXmlHttpRequest() {
                createXmlHttpRequest();
                if (xmlHttp) {
                    try {

                        // xmlHttp.open(type, uri, true); ////false表示同步模式，true异步模式GET"GET"
                        // // xmlHttp.onreadyStateChange = handleStateChange; //chorme下未被调用，使用watchStateChange
                        // xmlHttp.onreadystatechange = handleStateChange;
                        // xmlHttp.send(null);
                        xmlHttp.onreadystatechange = handleStateChange;

                        if (option.method === "GET") {
                            if (option.data) {
                                uri += !!~(uri.indexOf("?") ? "&" : "?") + option.data;
                                option.data = null;
                            }
                            xmlHttp.open("GET", uri, option.isAsync);
                            xmlHttp.setRequestHeader("Content-Type", option.contentType || "text/plain;charset=UTF-8");
                            xmlHttp.send();
                        } else if (option.method === "POST") {
                            xmlHttp.open("POST", uri, option.isAsync);
                            xmlHttp.setRequestHeader("Content-Type", option.contentType || "application/x-www-form-urlencoded;charset=UTF-8");
                            xmlHttp.send(option.data);
                        } else {
                            xmlHttp.open(option.method, uri, option.isAsync);
                            xmlHttp.send();
                        }

                    } catch (e) {
                        console.log(e);
                    }

                }
            }

            //回调函数 
            function handleStateChange() {
                if (done) return true;
                var o = {};
                var content = o.responseText = xmlHttp.responseText;
                o.responseXML = xmlHttp.responseXML;
                o.data = option.data;
                o.status = xmlHttp.status;
                o.uri = uri;
                o.arguments = option.arguments;
                if (option.dataType === 'json') {
                    try {
                        content = o.responseJSON = JSON.parse(xmlHttp.responseText);
                    } catch (e) {}
                }
                if (xmlHttp.readyState == 4) {
                    switch (xmlHttp.status) {
                        case 200:
                            option.success.call(content, content);
                            break;
                        default:
                            var xmlHttpStatus = {
                                400: "错误的请求！\nError Code:400!",
                                403: "拒绝请求！\nError Code:403!",
                                404: "请求地址不存在！\nError Code:404!",
                                500: "内部错误！\nError Code:500!",
                                503: "服务不可用！\nError Code:503!"
                            }
                            var st = xmlHttpStatus[xmlHttp.status] ? xmlHttpStatus[xmlHttp.status] : "请求返回异常！\nError Code:" + xmlHttp.status;
                            console.log(st);
                            option.error(o);
                            break;
                    }
                    return done = true;
                } else {
                    option.error(o);
                    // There are five possible values
                    // for readyState:
                    var readyState = {
                        0: 'Uninitialized', //: The object has been created but the open() method hasn’ t been called.
                        1: 'Loading', //The open() method has been called but the request hasn’ t been sent.
                        2: 'Loaded', //The request has been sent.
                        3: 'Interactive', //A partial response has been received.
                        4: 'Complete', //All data has been received and the connection has been closed.
                    };
                    console.log(uri + " (" + readyState[xmlHttp.readyState] + ")");
                    return false;
                }
                xmlHttp = null;
            }

            var watchStateChange = function() {
                if (done) {
                    invokeTimes = 0;
                    return;
                }
                if (invokeTimes >= 5) { //最多调用5次，超时
                    console.log("请求超时");
                    invokeTimes = 0;
                    return;
                }
                invokeTimes++;
                done = handleStateChange();
                setTimeout(watchStateChange, 100 * (invokeTimes + 1));
            };

            sendXmlHttpRequest();

            //延迟监控
            setTimeout(watchStateChange, 15);
        }

        _.get = function(url, callback) {
            _.ajax(url, callback, "GET");
        }

        _.post = function(url, callback) {
            _.ajax(url, callback, "POST");
        }

        _.loading = function(loadEl, callback, animate) {
            if (_.isString(loadEl)) loadEl = _.query(loadEl);
            if (_.isElement(loadEl)) {
                var loadArr = ['~oo~', '^oo^', '^oo~', '~oo^'];
                var loadAnimationTimeout = false;
                var loadAnimation = function() {
                    if (loadAnimationTimeout) return;
                    setTimeout(function() {
                        loadEl.query(".tip").text(loadArr.random()); //"数据加载中 " + 
                        loadAnimation();
                    }, 100)
                };
                animate && loadAnimation();

                setTimeout(function() {
                    loadAnimationTimeout = true;
                    loadEl.hide();
                    callback && callback();
                }, 1000);
            }
        };


        _.loadFile = function(el, success, error) {
            var $file = el.query("data-file".brackets())

            var _success = function(elem, result) {
                if (_.isFunction(success)) {
                    success.call(elem, elem, result);
                } else {
                    elem.html(result);
                }
            };

            var _error = function(elem, result) {
                if (_.isFunction(error)) error.call(elem, elem, result);
            }

            if (_.isElement($file)) {
                _.ajax($file.attr("data-file"), function(result) {
                    _success($file, result);
                }, function(result) {
                    _error($file, result)
                });
            } else if (_.isArray($file)) {
                $file.forEach(function(t) {
                    _.ajax(t.attr("data-file"), function(result) {
                        _success(t, result);
                    }, function(result) {
                        _error(t, result)
                    });
                })
            }
        }

        _.updateAfterImgLoad = function(id, fn) {
            var self = this;
            var $dom = _.query("#" + id); //$("#" + id);
            var $img = $dom.query("img");

            var t_img; // 定时器
            var isLoad = true; // 控制变量
            // 判断图片加载的函数
            function isImgLoad(callback) {
                $img.each(function() {
                    // 找到为0就将isLoad设为false，并退出each
                    if (this.height === 0) return isLoad = false;
                });
                // 为true，没有发现为0的。加载完毕
                if (isLoad) {
                    clearTimeout(t_img); // 清除定时器
                    // 回调函数
                    callback();
                    // 为false，因为找到了没有加载完成的图，将调用定时器递归
                } else {
                    isLoad = true;
                    t_img = setTimeout(function() {
                        isImgLoad(callback); // 递归扫描
                    }, 500);
                }
            }


            if ($img && $img.length > 0) { //图片延迟加载时间
                isImgLoad(function() {
                    // 加载完成
                    // self.update(id);
                    fn && fn();
                });
            }
        };


        //兼容  替代函数
        _.polyfill = function(obj, arr, fn) {
            for (var i = 0, len = arr.length; i < len; i++) {
                var f = obj[arr[i]];
                if (_.isFunction(f)) return obj[arr[0]] = f;
            }
            return obj[arr[0]] = fn;
        }


        // _.polyfill(Element.prototype, ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'], function(s) {
        //     // return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
        //     var matches = document.querySelectorAll(s), //(this.document || this.ownerDocument)
        //         i = matches.length;
        //     while (--i >= 0 && matches.item(i) !== this) {}
        //     return i > -1;
        // });


        _.selectorMatches = function(el, selector) {
            var p = Element.prototype;
            var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector ||
                function(s) { return !!~Array.prototype.slice.call(document.querySelectorAll(s)).indexOf(this); };
            return f.call(el, selector);
        }

        _.closest = function(selector) {
            var el = this;
            while (el) {
                if (el && _.selectorMatches(el, selector)) return el;
                el = el.parentElement; //parentNode
            }
            return [];
        }

        // An internal function to generate lookup iterators.
        var lookupIterator = function(value) {
            if (value == null) return _.identity;
            if (_.isFunction(value)) return value;
            return _.property(value);
        };


        // Sort the object's values by a criterion produced by an iterator.
        _.sortBy = function(obj, iterator, context) {
            iterator = lookupIterator(iterator);
            return _.pluck(_.map(obj, function(value, index, list) {
                return {
                    value: value,
                    index: index,
                    criteria: iterator.call(context, value, index, list)
                };
            }).sort(function(left, right) {
                var a = left.criteria;
                var b = right.criteria;
                if (a !== b) {
                    if (a > b || a === void 0) return 1;
                    if (a < b || b === void 0) return -1;
                }
                return left.index - right.index;
            }), 'value');
        };


        //日期工具
        var _time = _.time = function(dateValue) {
            return new _time.prototype.init(dateValue);
        }

        //_.time.toDate("09:30:00")
        //_.time.toDate(timeRange[0].begin.format("yyyy-MM-dd") + " " + (new Date()).format(" HH:mm:ss"))
        // 指定时间  hh:mm:ss     默认当天日期  
        // 指定日期  yyyy-MM-dd   默认时间 00:00:00  (非当前时间)   
        _time.toDate = function(str) {
            if (_.isDate(str)) {
                return str;
            } else if (_.isEmpty(str)) {
                return new Date();
            } else if (/^\d*$/.test(str)) {
                return new Date(Number(str));
            } else if (_.isString(str)) {
                if (this.isTimeString(str)) str = this().format("yyyy-MM-dd") + " " + str;
                return new Date(Date.parse(str.replace(/-/g, "/")));
            }
            return str;
        };

        // 时间格式 hh:mm:ss 
        _time.isTimeString = function(str) {
            return /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.test(str);
        }

        _time.set = function(date, time) {
            return this.toDate(time ? date + ' ' + time : date);
            // var self = this;

            // if (this.isTimeString(time)) {
            //     //时间补0
            //     time = time.replace(/\d{1,2}/g, function(t) {
            //         return self.zerofill(t)
            //     });
            //     // str.replace(reg, function(t, h, m, s) {
            //     //     console.log(t + ":----")
            //     //     console.log("h:" + h)
            //     //     console.log("m:" + m)
            //     //     console.log("s:" + s)
            //     //     return self.zerofill(t)
            //     // })
            //     //(new Date()).format("yyyy-MM-dd")
            //     date += ' ' + time;
            // }

            // return new Date(Date.parse(date.replace(/-/g, "/")));
        }
        //补0
        _time.zerofill = function(n) {
            n = '' + n;
            return n[1] ? n : '0' + n;
        }
        //时长 格式化
        _time.durationFormat = function(duration) {
            var self = this;
            if (typeof duration !== 'number' || duration < 0) return "00:00";
            var hour = parseInt(duration / 3600);
            duration %= 3600;
            var minute = parseInt(duration / 60);
            duration %= 60;
            var second = parseInt(duration);
            var arr = [minute, second];
            if (hour > 0) arr.unshift(hour);
            return arr.map(function(n) {
                return self.zerofill(n)
            }).join(':');
        };

        //映射短名字
        _time.mapShortName = function(s) {
            s = ('' + s).toLowerCase();
            var m = {
                "y": "year",
                "m": "month",
                "d": "day",
                "w": "week",
                "h": "hour",
                "n": "minute",
                "min": "minute",
                "s": "second",
                "l": "msecond",
                "ms": "msecond",
            };
            return s in m ? m[s] : s;
        };
        //时间间隔
        _time.diff = function(interval, date1, date2) {
            var t1 = this(date1),
                t2 = this(date2),
                _diff = t1.time - t2.time,
                seconds = 1000,
                minutes = seconds * 60,
                hours = minutes * 60,
                days = hours * 24,
                years = days * 365;

            switch (this.mapShortName(interval)) {
                case "year":
                    result = t1.year - t2.year; //_diff/years
                    break;
                case "month":
                    result = (t1.year - t2.year) * 12 + (t1.month - t2.month);
                    break;
                case "day":
                    result = Math.round(_diff / days);
                    break;
                case "hour":
                    result = Math.round(_diff / hours);
                    break;
                case "minute":
                    result = Math.round(_diff / minutes);
                    break;
                case "second":
                    result = Math.round(_diff / seconds);
                    break;
                case "msecond":
                    result = _diff;
                    break;
                case "week":
                    result = Math.round(_diff / days) % 7;
                    break;
                default:
                    result = "invalid";
            }
            return result;
        };
        _time.add = function(interval, number, date) {
            var date = this.toDate(date);
            switch (this.mapShortName(interval)) {
                case "year":
                    return new Date(date.setFullYear(date.getFullYear() + number));
                case "month":
                    return new Date(date.setMonth(date.getMonth() + number));
                case "day":
                    return new Date(date.setDate(date.getDate() + number));
                case "week":
                    return new Date(date.setDate(date.getDate() + 7 * number));
                case "hour":
                    return new Date(date.setHours(date.getHours() + number));
                case "minute":
                    return new Date(date.setMinutes(date.getMinutes() + number));
                case "second":
                    return new Date(date.setSeconds(date.getSeconds() + number));
                case "msecond":
                    return new Date(date.setMilliseconds(date.getMilliseconds() + number));
            }
            return date;
        };

        _time.prototype = {
            constructor: _time,
            init: function(dateValue) {
                var t = this.date = this.constructor.toDate(dateValue);
                this.year = t.getFullYear();
                this.month = t.getMonth() + 1;
                this.day = t.getDate(); //日期 day_of_month
                this.hour = t.getHours();
                this.minute = t.getMinutes();
                this.second = t.getSeconds();
                this.msecond = t.getMilliseconds(); //毫秒 
                this.day_of_week = t.getDay() === 0 ? 7 : t.getDay(); //  星期几   What day is today
                // 中国的概念是周一是每周的开始, 周日12pm是每周结束.

                this.time = t.getTime();
                this.quarter = Math.floor((t.getMonth() + 3) / 3); //季度 

            },

            // 转化为指定格式的String 
            // 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
            // 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
            // 例子： 
            // (new Date()).format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
            // (new Date()).format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
            format: function(fmt) {
                var self = this;
                fmt = fmt || "yyyy-MM-dd hh:mm:ss.S";
                var date = this.date
                var o = {
                    "y+|Y+": this.year, //年份4位特殊处理
                    "M+": this.month,
                    "d+|D+": this.day,
                    "h+|H+": this.hour,
                    "m+": this.minute,
                    "s+": this.second,
                    "q+": this.quarter,
                    "S": this.msecond,
                };
                _.keys(o).forEach(function(k, i) {
                    var v = '' + o[k];
                    fmt = fmt.replace(new RegExp(k, 'g'), function(t) {
                        return i === 0 ? v.substr(4 - t.length) : t[1] ? self.constructor.zerofill(v) : v;
                    })
                });
                return fmt;
            },
            //设置当前时间  ，保持当前日期不变
            set: function(str) {
                if (this.constructor.isTimeString(str)) str = this.format("yyyy-MM-dd") + " " + str;
                return this.constructor.toDate(str);
            },
            //当前时间
            setCurTime: function() {
                return this.set(this.constructor().format("HH:mm:ss"));
            },
            add: function(interval, number, date) {
                return this.constructor.add(interval, number, date)
            },
            utc: function() {
                return Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.msecond)
            },
            //时区
            zone: function() {
                return (this.time - this.utc()) / 3600000;
            },
            diff: function(interval, date1) {
                return this.constructor.diff(interval, this.date, date1)
            },

            //
            // weekOfMonth: function() {

            // },

            //一年中的第几周 WEEK_OF_Year WEEKNUM
            // 以周一为周首，周日为周末  以完整的一周计算，可能第一周不足7天
            //此处按7天一周计算 
            week: function(dateStr) {
                var day_of_year = 0;
                var d = dateStr ? this.constructor.toDate(dateStr) : this.date;
                if (!d) return "";
                var years = this.year,
                    month = this.month - 1,
                    day = this.day,
                    days = [31, 28, 30, 31, 30, 31, 31, 30, 31, 30, 31];
                //4年1闰
                if (Math.round(years / 4) === years / 4) days[1] = 29;
                days.forEach(function(t, i) {
                    if (i <= month) day_of_year += day + (i === 0 ? 0 : days[i - 1]);
                });
                return Math.ceil(day_of_year / 7);
            }
        }
        _time.prototype.init.prototype = _time.prototype;


        var _prototype = {};

        //原型扩展
        _prototype.obj = {
            //四则运算
            cmd: function(str) { //在object 原型上扩展，会被in 枚举
                if (!_.isString(str)) {
                    console.log("object.cmd need a string argument")
                    return "";
                }
                var self = this,
                    symbol = str.match(reg_operation_symbol),
                    ps = [],
                    _cmd = function(str) {
                        if (symbol.length == 0) {
                            ps.push("self." + str);
                            return;
                        }
                        var first = symbol.shift();
                        var pos = str.indexOf(first);
                        var sub = str.substring(0, pos).trim();
                        if (_.has(self, sub)) {
                            ps.push("self." + sub + first);
                        } else {
                            ps.push(sub + first);
                        }
                        var surplus = str.substring(pos + first.length);
                        _cmd(surplus);
                    }
                _cmd(str);
                return eval(ps.join(''));
            }
        };

        //浮点运算
        _prototype.num = {
            isEqual: function(number, digits) {
                digits = digits == undefined ? 10 : digits; // 默认精度为10
                return this.toFixed(digits) === number.toFixed(digits);
            },
            add: function(arg) {
                var r1, r2, m;
                try {
                    r1 = arg.toString().split(".")[1].length
                } catch (e) {
                    console.log(e);
                    r1 = 0
                }
                try {
                    r2 = this.toString().split(".")[1].length
                } catch (e) {
                    console.log(e);
                    r2 = 0
                }
                m = Math.pow(10, Math.max(r1, r2));
                // var result = (arg * m + this * m) / m

                var result = Math.round(arg * m + this * m) / m;

                // var result = (arg.mul(m) + this.mul(m)).div(m);

                result.isInfinity(function() {
                    console.log(r1 + " " + r2 + " " + " " + this + " " + arg);
                });

                // if (result.toString().indexOf(".") > 0 && result.toString().split(".")[1].length > 5) {
                //     console.log("result:" + result);
                //     console.log(arg, this);
                //     // console.log(result.sub(Number(data[i - j][2])));
                // }
                return result;
            },

            //减法  
            sub: function(arg) {
                var r1, r2, m, n;
                try {
                    r1 = this.toString().split(".")[1].length
                } catch (e) {
                    console.log(e);
                    r1 = 0
                }
                try {
                    r2 = arg.toString().split(".")[1].length
                } catch (e) {
                    console.log(e);
                    r2 = 0
                }
                m = Math.pow(10, Math.max(r1, r2));
                //动态控制精度长度  
                n = (r1 >= r2) ? r1 : r2;
                return ((this * m - arg * m) / m).toFixed(n);
            },

            //乘法  
            mul: function(arg) {
                var m = 0,
                    s1 = arg.toString(),
                    s2 = this.toString();
                try {
                    m += s1.split(".")[1].length
                } catch (e) {
                    console.log(e);
                }
                try {
                    m += s2.split(".")[1].length
                } catch (e) { console.log(e); }
                return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
            },


            //除法  
            div: function(arg) {
                var t1 = 0,
                    t2 = 0,
                    r1, r2, result, m;
                try {
                    t1 = this.toString().split(".")[1].length
                } catch (e) { console.log(e); }
                try {
                    t2 = arg.toString().split(".")[1].length
                } catch (e) { console.log(e); }
                // with(Math) {
                //整数相除
                if (t2 === 0 && t1 === 0) {
                    result = (this / arg);

                } else {
                    r1 = Number(this.toString().replace(".", ""));
                    r2 = Number(arg.toString().replace(".", ""));

                    // result =Math.round(r1 / r2)* m;

                    if (t1 < t2) {
                        m = Math.pow(10, t2 - t1);
                        result = (r1 / r2) * m;
                    } else if (t1 > t2) {
                        m = Math.pow(10, t1 - t2);
                        result = Math.round(r1 / r2) / m;
                    } else {
                        result = (r1 / r2);

                    }

                }
                result.isInfinity(function() {
                    // console.log((r1 / r2),(t2 - t1))
                    console.log(r1 + " " + r2 + " " + (t2 - t1) + " " + this + " " + arg);
                });

                // if(_.isNaN(result)){
                //     console.log(r1 + " " + r2 + " " + (t2 - t1) + " " + this);
                // }

                return result;
            },
            isInfinity: function(callback) {
                var fn = function() {
                    if (this.toString().indexOf(".") > 0 && this.toString().split(".")[1].length > 5) {
                        callback && callback.call(this);
                        return true;
                    }
                    return false;
                }
                return fn.call(this);
            }
        };

        //原型
        _prototype.str = {
            // trim: function() {
            //     return this.replace(/(^\s+)|(\s+$)/g, "");
            // },
            pound: function() {
                return "#" + this;
            },
            brackets: function(ele) {
                if (!ele) {
                    return "[" + this.split(",").join("],[") + "]"; //"[" + this + "]";
                } else {
                    var id;
                    if (_.isElement(ele)) {
                        _.autoid(ele);
                        id = ele.id;
                    } else if (_.isString(ele)) {
                        id = ele;
                    }
                    // return "#" + id + "" + this.brackets() + "," + "#" + id + " " + this.brackets();
                    var es = this.split(",");
                    return "#" + id + "[" + es.join("],#" + id + "[") + "]" + "," + "#" + id + " [" + es.join("],#" + id + " [") + "]";
                }
            },
            // console.log('hihih {0}, ,{2}'.format('dfasda', '34324343','dffds34324'));
            format: function() {
                var args = Array.prototype.slice.call(arguments),
                    str = this;
                args.forEach(function(t) {
                    str = str.replace(/{.*?}/, t);
                });
                return str;
            },
        };

        _prototype.dat = {
            format: function(fmt) {
                return _time(this).format(fmt);
            }
        };
        _prototype.ele = {
            length: {
                value: 1,
                writable: false
            },
            //兼容jquery  常用方法
            attr: function(key, value) {
                if (!_.isUndefined(value)) {
                    this.setAttribute(key, value);
                    return this;
                }
                return this.getAttribute(key);
            },
            remove: function() {
                if (this.parentNode) this.parentNode.removeChild(this)
            },
            empty: function() {
                var elem,
                    i = 0;
                for (;
                    (elem = this[i]) != null; i++) {
                    if (elem.nodeType === 1) {
                        this.removeChild(elem)
                        // Prevent memory leaks
                        // jQuery.cleanData(getAll(elem, false));
                        // Remove any remaining nodes
                        elem.textContent = "";
                    }
                }
                return this;
            },
            removeAttr: function(key) {
                var self = this,
                    keys = key.split(","),
                    len = keys.length;
                if (len === 1) {
                    self.removeAttribute(key);
                } else {
                    keys.forEach(function(t) {
                        self.removeAttribute(t);
                    });
                }
                return self;
            },
            html: function(str) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len === 0) {
                    return this.innerHTML;
                } else {
                    this.innerHTML = args[0];
                    return this;
                }
            },
            //冲突：HTMLScriptElement.text  是一个属性  ，使用_.text代替
            text: function(str) {
                if (str) this.innerText = str;
                return this.innerText;
            },
            val: function(value) {
                if (value) {
                    this.setAttribute("value", value);
                    return this;
                }
                if (!!~["select", "input"].indexOf(this.tagName.toLowerCase())) return this.value;
                return this.getAttribute("value");
            },
            on: function(type, fn) {
                addEvent(type, this, fn);
                return this;
            },
            off: function(type, fn) {
                removeEvent(type, this, fn)
                return this;
            },
            trigger: function(name) {
                console.log("event trigger")
                var ev = document.createEvent("UIEvents"); //HTMLEvents
                ev.initEvent(name, true, true);
                dispatchEvent(ev, this);
                return this;
            },
            //与array一致性
            each: function(fn) {
                _.isFunction(fn) && fn.call(this, this, 0);
            },
            css: function(opt) { //todo
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                var needpre = function(str) {
                    var reg = RegExp(['transform', 'transition', 'animation', 'box-shadow', 'flex'].join('|')) ////,'@keyframes'
                    return reg.test(str);
                }
                var autoprefixer = function(key, val) {
                    var self = this;
                    if (needpre(key)) {
                        ['-webkit-', '-moz-', '-o-', ''].forEach(function(t) {
                            this.style[t + key] = val;
                        })
                    } else {
                        this.style[key] = val;
                    }
                }
                var keys = ['font-size', 'line-height', 'border-radius', 'border-width', 'padding', 'margin'];
                ['padding', 'margin', ''].forEach(function(pre) {
                    keys = keys.concat(['top', 'left', 'bottom', 'right'].map(function(t) {
                        return pre ? pre + '-' + t : t;
                    }))
                });
                ['max', 'min', ''].forEach(function(pre) {
                    keys = keys.concat(['width', 'height'].map(function(t) {
                        return pre ? pre + '-' + t : t;
                    }))
                });

                //单位
                var autounit = function(key, val) {
                    if (/^0$/.test(val)) return val;
                    return !!~keys.indexOf(key) ? ("" + val).replace(/^\d+(\.\d+)?$/, function(match) {
                        return match + "px";
                    }) : val;
                }

                if (len === 1) {
                    if (_.isObject(opt)) {
                        for (key in opt) {
                            // css()
                            var val = opt[key];
                            val = autounit(key, val)
                            this.style[key] = val;
                            // autoprefixer.call(this, key, val);
                        }
                    }
                } else if (len === 2) {
                    // prop, val
                    this.style[opt] = args[1];
                    // autoprefixer.call(this, opt, arguments[1]);
                }
                return this;
            },
            width: function() {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len === 1) {
                    this.css({ width: args[0] })
                }
                return this.offsetWidth;
            },
            height: function() {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len === 1) {
                    this.css({ height: args[0] })
                }
                return this.offsetHeight;
            },
            pos: function(p) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len === 1) {
                    return this.css({
                        position: "absolute",
                        top: p.y,
                        left: p.x
                    })
                }
                return _.pos.call(this, this)
            },
            outerWidth: function() {
                return _.max(this.scrollWidth, this.offsetWidth, this.clientWidth) + Number(this.style.marginLeft) + Number(this.style.marginRight);
            },

            dir: function(elem, dir, until) {
                var matched = [],
                    truncate = until !== undefined;

                while ((elem = elem[dir]) && elem.nodeType !== 9) {
                    if (elem.nodeType === 1) {
                        if (truncate && jQuery(elem).is(until)) break;
                        matched.push(elem);
                    }
                }
                return matched;
            },
            parent: function() {
                return this.parentNode;
            },
            sibling: function(n, elem) {
                var matched = [];
                for (; n; n = n.nextSibling) {
                    if (n.nodeType === 1 && n !== elem) {
                        matched.push(n);
                    }
                }
                return matched;
            },
            siblings: function() {
                return this.sibling((this.parentNode || {}).firstChild, this);
            },
            // neighbor: function() {
            //     return this.siblings();
            // },
            children: function(elem) {
                return this.sibling(elem.firstChild);
            },
            //与array一致性
            first: function() {
                return this;
            },
            last: function() {
                return this;
            },
            filter: function(key) {
                switch (key) {
                    case "visible":
                        if (_.isShow(this)) {
                            return this;
                        }
                        return null;
                        break;
                    case "hidden":
                        if (_.isHide(this)) {
                            return this;
                        }
                        return null;
                        break;
                    default:
                        return this;

                }
            },
            append: function(elem) {
                if (_.isElement(elem)) {
                    return this.appendChild(elem);
                } else if (_.isString(elem)) {
                    this.innerHTML = this.innerHTML + elem;
                }
            },
            //tap事件
            onTap: function(handler) {
                toucher({
                    el: this,
                    type: "tap",
                    listener: handler
                })

                // var self = this,
                //     startX, startY, startTime, lastMoveY, lastMoveTime;


                // this.off("touchstart").on("touchstart", function(ev) {
                //     ev = ev || event; //兼容firefox  jquery :ev.originalEvent
                //     console.log(ev);
                //     var touch = ev;
                //     // self.addClass("active");
                //     ev.target.addClass("active");

                //     // ev.stopPropagation();
                //     startX = ev.touches[0].pageX; //clientX
                //     startY = ev.touches[0].pageY;
                //     startTime = new Date().getTime();
                // });
                // // 惯性移动
                // this.off("touchend").on("touchend", function(ev) {
                //     var endX, endY, nowTime;
                //     endX = ev.changedTouches[0].pageX;
                //     endY = ev.changedTouches[0].pageY;
                //     nowTime = new Date().getTime();
                //     ev.target.removeClass("active");

                //     var y = endY - startY;
                //     var x = endX - startX;
                //     var duration = nowTime - startTime; //滑动时间
                //     if (Math.abs(x) <= 5 && Math.abs(y) <= 5 && duration < 200) {
                //         handler && handler(ev);
                //         // Events.trigger("tap", ev.target, ev)
                //     } else {
                //         console.log("x:" + x + " y:" + y + " duration:" + duration);
                //     }
                // });
            }
        };

        ['hide', 'show', 'isHide', 'active', 'passive'].forEach(function(t) { //, 'pos'
            _prototype.ele[t] = function() {
                return _[t] && _[t].call(this, this);
            }
        });

        ['$', 'query', 'hover', 'tab', 'hasAttr', 'hasClass', 'addClass', 'removeClass', 'closest'].forEach(function(t) {
            _prototype.ele[t] = function() {
                return _[t] && _[t].apply(this, arguments);
            }
        });

        _prototype.arr = {
            //支持链式
            query: function(selector) {
                var list = [];
                _.each(this, function(item) {
                    if (_.isElement(item)) {
                        var ele = _.autoid(item).query(selector);
                        if (_.size(ele) >= 1) list.push(ele);
                    }
                });
                return list.length === 1 ? list[0] : list;
            },
            // Array.prototype.each=Array.prototype.forEach.bind(this);
            each: function(fn) {
                if (_.isFunction(fn)) {
                    _.each(this, function(item, index) {
                        fn.call(item, item, index)
                    })
                }
            },
            first: function() {
                return this[0];
            },
            last: function() {
                return this[this.length - 1];
            },
            random: function() {
                return this[Math.floor(Math.random() * this.length)];
                // return _.random.call(this,this);
            },
            //乱序
            shuffle: function() {
                var len = this.length;
                for (var i = 0; i < len - 1; i++) {
                    var index = parseInt(Math.random() * (len - i));
                    var temp = this[index];
                    this[index] = this[len - i - 1];
                    this[len - i - 1] = temp;
                }
            }


            // contains: function(a) {
            //     return this.indexOf(a) != -1;
            // },
            // uniq: function() {
            //     var ra = new Array();
            //     for (var i = 0; i < this.length; i++) {
            //         if (!ra.contains(this[i])) {
            //             ra.push(this[i]);
            //         }
            //     }
            //     return ra;
            // },
            // each: function(fn) {
            //     fn = fn || Function.K;
            //     var a = [];
            //     var args = Array.prototype.slice.call(arguments, 1);
            //     for (var i = 0; i < this.length; i++) {
            //         var res = fn.apply(this, [this[i], i].concat(args));
            //         if (res != null) a.push(res);
            //     }
            //     return a;
            // },

        };
        _prototype.arr.$ = _prototype.arr.query;

        ['attr', 'remove', 'removeAttr', 'removeClass', 'addClass', 'html', 'filter', 'append',
            'on', 'off', 'trigger', 'css', 'addEvent', 'hide', 'show', 'active', 'passive',
            'clearEvent', 'hover', 'tab', 'siblings'
        ].forEach(function(t) {
            _prototype.arr[t] = function() {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length,
                    arr = this;
                if (arr.length === 0) {
                    return arr;
                } else if (len === 1 && _.isString(args[0])) { //getter
                    var results = [];
                    arr.forEach(function(el) {
                        _.isElement(el) && results.push(el[t].apply(el, args));
                    });
                    return results; //为了链式语法，空值返回[]
                } else { //setter
                    arr.forEach(function(el) {
                        _.isElement(el) && el[t].apply(el, args);
                    });
                    return arr;
                }
            }
        });
        //扩展原型  函数  extend prototype
        _.extproto = function(obj) {
            var args = Array.prototype.slice.call(arguments),
                len = args.length;
            for (var i = 1; i < len; i++) {
                var source = args[i];
                if (source) {
                    try {
                        for (var prop in source) {
                            if (_.isObject(source[prop])) {
                                Object.defineProperty(obj, prop, source[prop]);
                            } else if (_.isFunction(source[prop])) {
                                if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
                                    obj[prop] = source[prop];
                                    //禁止被for in 枚举
                                    var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
                                    descriptor.enumerable = false;
                                    Object.defineProperty(obj, prop, descriptor);
                                } else {
                                    console.log(obj, "obj hasOwnProperty " + prop)
                                }
                            } else {
                                // if (!obj.hasOwnProperty(prop)) {
                                if (!Object.prototype.hasOwnProperty.call(obj, prop)) obj[prop] = source[prop];

                            }
                        }

                    } catch (e) {
                        console.log(e)
                    }

                }
            }
            return obj;
        };

        //原型扩展 
        // _.extproto(Object.prototype, _prototype.obj);
        // _.extproto(Number.prototype, _prototype.num);
        // _.extproto(String.prototype, _prototype.str);
        // _.extproto(Date.prototype, _prototype.dat);
        // _.extproto(Array.prototype, _prototype.arr);
        // if (inBrowser) {
        //     _.extproto(Element.prototype, _prototype.ele);
        // };

        ////原型扩展 
        [Object, Number, String, Date, Array, Boolean, Element].forEach(function(t, i) {
            var name = t.prototype.constructor.name.toLowerCase().slice(0, 3);
            _prototype[name] = _prototype[name] || {};
            _prototype[name].log = function() {
                console.log(_.stringify(this)); //.valueOf()//原始值
            }
            if (6 === 0) { //小程序中不允许扩展dom
                inBrowser && _.extproto(t.prototype.constructor.prototype, _prototype[name]);
            } else {
                _.extproto(t.prototype.constructor.prototype, _prototype[name]);
            }
        });


        /**
         * Base64 解加密
         *
         * @param  { String } stringToEncode/encodedData
         * @return { String } encodedData/stringDecode
         * **/
        var Base64_encode = _.encode = function(stringToEncode) {
            var encodeUTF8string = function(str) {
                return encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                    function toSolidBytes(match, p1) {
                        return String.fromCharCode('0x' + p1)
                    })
            };

            if (typeof window !== 'undefined') {
                if (typeof window.btoa !== 'undefined') {
                    window.btoa(encodeUTF8string(stringToEncode))
                }
            } else {
                return new Buffer(stringToEncode).toString('base64')
            }
            var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            var o1;
            var o2;
            var o3;
            var h1;
            var h2;
            var h3;
            var h4;
            var bits;
            var i = 0;
            var ac = 0;
            var enc = '';
            var tmpArr = [];
            if (!stringToEncode) {
                return stringToEncode
            }
            stringToEncode = encodeUTF8string(stringToEncode);
            do {
                o1 = stringToEncode.charCodeAt(i++);
                o2 = stringToEncode.charCodeAt(i++);
                o3 = stringToEncode.charCodeAt(i++);
                bits = o1 << 16 | o2 << 8 | o3;
                h1 = bits >> 18 & 0x3f;
                h2 = bits >> 12 & 0x3f;
                h3 = bits >> 6 & 0x3f;
                h4 = bits & 0x3f;
                tmpArr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4)
            } while (i < stringToEncode.length);
            enc = tmpArr.join('');
            var r = stringToEncode.length % 3;
            return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3)
        };

        var Base64_decode = _.decode = function(encodedData) {
            var decodeUTF8string = function(str) {
                return decodeURIComponent(str.split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                }).join(''))
            };

            if (typeof window !== 'undefined') {
                if (typeof window.atob !== 'undefined') {
                    return decodeUTF8string(window.atob(encodedData))
                }
            } else {
                return new Buffer(encodedData, 'base64').toString('utf-8')
            }
            var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            var o1;
            var o2;
            var o3;
            var h1;
            var h2;
            var h3;
            var h4;
            var bits;
            var i = 0;
            var ac = 0;
            var dec = '';
            var tmpArr = [];
            if (!encodedData) {
                return encodedData
            }
            encodedData += '';
            do {
                // unpack four hexets into three octets using index points in b64
                h1 = b64.indexOf(encodedData.charAt(i++));
                h2 = b64.indexOf(encodedData.charAt(i++));
                h3 = b64.indexOf(encodedData.charAt(i++));
                h4 = b64.indexOf(encodedData.charAt(i++));
                bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
                o1 = bits >> 16 & 0xff;
                o2 = bits >> 8 & 0xff;
                o3 = bits & 0xff;
                if (h3 === 64) {
                    tmpArr[ac++] = String.fromCharCode(o1)
                } else if (h4 === 64) {
                    tmpArr[ac++] = String.fromCharCode(o1, o2)
                } else {
                    tmpArr[ac++] = String.fromCharCode(o1, o2, o3)
                }
            } while (i < encodedData.length);
            dec = tmpArr.join('')
            return decodeUTF8string(dec.replace(/\0+$/, ''))
        }


        //  事件模块
        var addEvent = function(type, el, listener) {
            if (_.isFunction(listener)) {
                if (window.addEventListener) {
                    el.addEventListener(type, listener, false);
                } else {
                    el.attachEvent('on' + type, listener);
                }
                //store events
                if (!el.events) el.events = [];

                el.events.push({
                    type: type,
                    el: el,
                    listener: listener
                }); //listener
            } else if (_.isArray(listener)) {
                listener.forEach(function(t) {
                    addEvent(type, el, t);
                });
            }
        };

        var removeEvent = function(type, el, listener) {
            if (!_.isElement(el)) return false;
            if (listener) {
                if (window.removeEventListener) {
                    el.removeEventListener(type, listener, false);
                } else {
                    el.detachEvent('on' + type, listener);
                }
                //delete event
                if (!el.events) {
                    el.events = [];
                }
                var i = el.events.length;
                while (i--) {
                    if (el.events[i].type === type && el.events[i].listener === listener) {
                        el.events.splice(i, 1);
                    }
                }
            } else {
                el.events && el.events.forEach(function(t) {
                    removeEvent(t.type, t.el, t.listener)
                });
            }

        };
        var startPos = {},
            endPos = {},
            offset = {},
            _touchstart = isSupportTouch ? "touchstart" : "mousedown",
            _touchend = isSupportTouch ? "touchend" : "mouseup",
            _touchmove = isSupportTouch ? "touchmove" : "mousemove";

        //事件
        var Events = (function() {
            var storeEvents = [];

            return {
                store: function(o) {
                    if (o) storeEvents.push(o);
                    return storeEvents;
                },
                filter: function(obj) {
                    return _.filter(storeEvents, function(item) {
                        var flag = true;
                        for (x in obj)
                            if (item[x] !== obj[x]) flag = false;
                        return flag;
                    });
                },
                reset: function() {
                    storeEvents = [];
                },
                on: function(type, el, listener, once) {
                    var self = this;
                    if (!isSupportTouch && type === TAP) type = "click";

                    switch (type) {
                        case TAP:
                            var startHandler = function(ev) {
                                startPos = _.pos(ev);
                            }
                            var endHandler = function(ev) {
                                endPos = _.pos(ev);
                                var x = endPos.x - startPos.x,
                                    y = endPos.y - startPos.y,
                                    duration = endPos.time - startPos.time;

                                if (Math.abs(x) <= 5 && Math.abs(y) <= 5 && duration < 200) { //快击
                                    if (_.isFunction(listener)) {
                                        listener.call(el, endPos.el, ev);
                                    } else if (_.isArray(listener)) {
                                        listener.forEach(function(t) {
                                            t.call(el, endPos.el, ev);
                                        });
                                    }
                                    if (once) {
                                        self.off(type, el);
                                    }
                                }
                            }
                            addEvent(_touchstart, el, startHandler);
                            addEvent(_touchend, el, endHandler);
                            break;
                        case LONGTAP: //长按
                            var _longtap;
                            var startHandler = function(ev) {
                                _longtap = setTimeout(function() {
                                    if (_.isFunction(listener)) {
                                        listener.call(el, el, ev);
                                    } else if (_.isArray(listener)) {
                                        listener.forEach(function(t) {
                                            t.call(el, el, ev);
                                        });
                                    }
                                    if (once) {
                                        self.off(type, el);
                                    }
                                }, 1000)
                            }
                            var endHandler = function(ev) {
                                _longtap && clearTimeout(_longtap);
                            }
                            addEvent(_touchstart, el, startHandler);
                            addEvent(_touchend, el, endHandler);
                            break;
                        case DRAG:
                        case "drag-y":
                        case "drag-x":
                            var isDragging;
                            var preventDefault = function(ev) {
                                ev.preventDefault();
                            }

                            var maxLeft = document.documentElement.clientWidth - el.clientWidth;
                            var maxTop = document.documentElement.clientHeight - el.clientHeight;

                            var range = {
                                top: 0,
                                left: 0,
                                right: maxLeft,
                                bottom: maxTop
                            }

                            var _posInRange = function(pos, range) {
                                var x = _.min(pos.x, range.right);
                                x = _.max(x, range.left);
                                var y = _.min(pos.y, range.bottom);
                                y = _.max(y, range.top);
                                return {
                                    left: x,
                                    top: y
                                }
                            }
                            var startHandler = function(ev) {
                                startPos = _.pos(ev);
                                offset = _.pos(el);
                                el.css({ position: "absolute", cursor: "move" });
                                isDragging = true;
                                //不准整屏移动
                                addEvent(_touchmove, document, preventDefault);
                            }
                            var moveHandler = function(ev) {
                                endPos = _.pos(ev);
                                isDragging &&
                                    (function() {
                                        var left = endPos.x - startPos.x + offset.x;
                                        var top = endPos.y - startPos.y + offset.y;
                                        left = _.min(left, maxLeft);
                                        left = _.max(0, left);
                                        top = _.min(top, maxTop);
                                        top = _.max(0, top);
                                        if (type !== "drag-y") el.css({ left: left + "px" });
                                        if (type !== "drag-x") el.css({ top: top + "px" });
                                    })()
                            }
                            var endHandler = function(ev) {
                                endPos = _.pos(ev);

                                isDragging = false;
                                //允许整屏移动
                                removeEvent(_touchmove, document, preventDefault);
                                if (_.isFunction(listener)) {
                                    listener.call(el, endPos.el, ev);
                                }
                            }


                            addEvent("mouseover", el, function(ev) {
                                el.css({ cursor: "move" })
                            });
                            addEvent("mouseout", el, function(ev) {
                                el.css({ cursor: "normal" })
                            });
                            addEvent(_touchstart, el, startHandler);
                            addEvent(_touchmove, document, moveHandler);
                            addEvent(_touchend, document, endHandler);
                            break;
                        default:
                            var _handler = function(ev) {
                                if (_.isFunction(listener)) {
                                    listener.call(el, el, ev);
                                } else if (_.isArray(listener)) {
                                    listener.forEach(function(t) {
                                        t.call(el, el, ev);
                                    });
                                }
                                if (once) {
                                    self.off(type, el);
                                }
                            }
                            addEvent(type, el, _handler);
                            break;
                    }
                },
                off: function(type, el, listener) {
                    if (TAP === type) {
                        removeEvent(_touchstart, el);
                        removeEvent(_touchend, el);
                    } else {
                        removeEvent(type, el, listener);
                    }
                }
            }
        })();

        var toucher = _.toucher = function(options) {
            return new toucher.prototype.init(options);
        }
        toucher.prototype = {
            constructor: toucher,
            init: function(options) {
                var self = this;
                if (!options) {
                    if (options === false) self.offEvent();
                    return;
                }
                var es = [];
                var _option = function(opt) {
                    var el = _.query(opt.el),
                        type = opt.type || "click",
                        clear = _.isUndefined(opt.clear) ? true : opt.clear, //clear 打扫:加载新事件事情，清除掉之前的事件,
                        listener = opt.listener || opt.callback,
                        once = opt.once || false; //事件只运行一次，运行一次就自行remove
                    if (_.isElement(el)) {
                        if (el.nodeName.toLowerCase() === "input" && type === TAP) type = "click";
                        clear && self.clear({
                            el: el,
                            type: type
                        });

                        es.push({
                            type: type,
                            el: el,
                            listener: listener,
                            once: once
                        })
                    } else if (_.isArray(el)) {
                        el.forEach(function(t) {
                            _option(_.clone(opt, { el: t }));
                        });
                    }
                }
                if (_.isArray(options)) {
                    options.forEach(function(t) {
                        _option(t);
                    })
                } else {
                    _option(options);
                }

                self.onEvent(es);
            },
            onEvent: function(es) {
                es.forEach(function(t) {
                    Events.store(t);
                    Events.on(t.type, t.el, t.listener, t.once);
                });
                return this;
            },
            offEvent: function(filter) {
                Events.filter(filter).forEach(function(t) {
                    Events.off(t.type, t.el);
                });
                return this;
            },
            clear: function(filter) {
                return this.offEvent(filter);
            }

        };
        toucher.prototype.init.prototype = toucher.prototype;
        // ['tap', 'longTap', 'doubleTap', 'pinch', 'spread', 'rotate', 'swipe', 'swipeUp', 'swipeDown', 'swpieLeft', 'swipeRight'].forEach(function(item) {
        //     toucher.prototype[item] = function(selector, fn) {
        //         var el = _.query(selector);
        //         if (_.isArray(el)) {
        //             el.forEach(function(t) {
        //                 toucher.prototype.on.call(this, item, t, fn.bind(t))
        //             });
        //         } else if (_.isElement(el)) {
        //             toucher.prototype.on.call(this, item, el, fn.bind(el))
        //         }
        //         // var args = Array.prototype.slice.call(arguments);
        //         // args.unshift(item);
        //         // toucher.prototype.on.apply(this, args)
        //     }
        // });


        //字符串遍历 解析 区别于正则获取解析 
        //用在解析 markdown  json xml等格式的字符串上
        //var w=walker({text:"bbb| fidld1|field2|field3|aaa \n |new| line|fff|"});
        //console.log(w.table)
        // var w = walker({ text: match });
        // var tbl = w.table
        // // console.log()
        // // var line = tbl[0];
        // // var str = ""
        // // for (var j = 0, cols = line.length; j < cols; j++) {
        // //     str += _wrap("td", line[j])
        // // }
        // // str = _wrap("tr", str);

        // // var tbody = ""
        // var line, str = "";
        // for (var x = 0, len = tbl.length; x < len; x++) {
        //     var str2 = "",
        //         line = tbl[x];
        //     for (var y = 0, cols = line.length; y < cols; y++) {
        //         str2 += _wrap("td", line[y])
        //     }
        //     str += _wrap("tr", str2);
        // }

        // str = _wrap("table", str);
        // return str;
        var walker = _.walker = function(options) {
            return new walker.prototype.init(options);
        }
        walker.prototype = {
            constructor: walker,
            ch: "",
            pos: 0,
            line: 0,
            col: 0,
            max: 0,
            text: "",
            escapee: {
                "\"": "\"",
                "\\": "\\",
                "/": "/",
                b: "\b",
                f: "\f",
                n: "\n",
                r: "\r",
                t: "\t"
            },
            init: function(options) {
                if (_.isString(options)) {
                    this.text = options
                } else if (_.isNumber(options)) {
                    this.text = "" + options
                } else if (_.isObject(options)) {
                    this.text = options.text || "";
                    this.debug = options.debug || false;
                } else {
                    throw {
                        name: "input error",
                        messasge: "string or {text:\"\"} is required"
                    }
                }
                this.max = this.text.length;
                this.line = 0;
                this.col = 0;
                this.pos = 0;
                this.ch = this.peek();

                return this;
            },
            parseTable: function() {
                this.table = [];
                var find, line = [];
                while (this.next()) {
                    find = this.until("|");
                    find && line.push(find)
                    if (this.ch === "\n" || this.pos >= this.max) {
                        this.table.push(line); //.slice(0)
                        line = [];
                    }
                }
                return this.table;
            },
            peek: function(step) {
                var token = this.text.charAt(this.pos);
                if (step) {
                    token = "";
                    for (var i = 0; i <= step; i++) token += this.text.charAt((this.pos + i) >= this.max ? this.max : (this.pos + i));
                }
                return token;
            },
            eof: function() {
                return this.peek() === '';
            },
            next: function(current) {
                if (current && current !== this.ch) {
                    error("Expected '" + current + "' instead of '" + this.ch + "'");
                }
                this.ch = this.text.charAt(this.pos++);
                if (this.ch === '\n') {
                    this.line++;
                    this.col = 0;
                } else {
                    this.col++;
                }
                if (this.debug) this.token = this.peek(10);
                return this.ch;
            },
            back: function() {
                return this.ch = this.text.charAt(this.pos--);
            },
            error: function(m) {
                var token = "",
                    len = 10;
                while (len--) {
                    this.next()
                    token += this.ch
                }

                var info = {
                    name: "SyntaxError",
                    message: m,
                    pos: this.pos,
                    ch: this.ch,
                    line: this.line,
                    col: this.col,
                    text: this.text,
                    token: token,
                };
                // throw info;
                console.log(info);
            },
            info: function() {
                return {
                    pos: this.pos,
                    ch: this.ch,
                    line: this.line,
                    col: this.col,
                    text: this.text,
                }
            },
            until: function(separator) {
                var value = "",
                    ch = this.ch;
                if (ch === separator) { //开头
                    while (ch = this.next()) {
                        if (ch === separator) { //结尾
                            this.back(); //回退
                            return value;
                        }
                        if (ch === "\n") {
                            value = "";
                            break;
                        }
                        value += ch;
                    }
                }
                return value;
            },
            json: function() {
                return this._parseJson()
            },
            _parseJson: function() {
                this._skipWhite();
                switch (this.ch) {
                    case "{":
                        return this._parseObj();
                        break;
                    case "[":
                        return this._parseArr();
                        break;
                    case ":":
                        return this._parseJson();
                        break;
                    case "\"":
                    case "\'":
                        return this._parseStr();
                        break;
                    default:
                        if (/[\d\.-]/.test(this.ch)) {
                            return this._parseNum();
                        } else {
                            return this._parseValue();

                        }
                        break;
                }
            },
            _parseObj: function() {
                this._skipWhite();
                var obj = {},
                    key;
                if ("{" === this.ch) {
                    while (this.next()) {
                        this._skipWhite();
                        if (this.ch === "}") {
                            this.next();
                            return obj;
                        }
                        if (this.ch) {
                            key = this._parseKey();
                            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                this.error("Duplicate key '" + key + "'");
                                console.log(obj)
                            }
                            obj[key] = this._parseJson();
                        }
                    }
                }
                return obj;
            },
            _parseArr: function() {
                this._skipWhite()
                var arr = [];
                if ("[" === this.ch) {
                    while (this.next()) {
                        this._skipWhite();
                        if (this.ch === "]") {
                            this.next();
                            return arr;
                        }
                        if (this.ch) {
                            var value = this._parseJson()
                            if (value) {
                                arr.push(value);
                                if (this.ch === "]") {
                                    this.next();
                                    return arr;
                                }
                            }
                        }
                    }
                }
                return arr;
            },
            _skipWhite: function() {
                while (this.ch && this.ch <= " ") {
                    this.next();
                }
            },
            _removeQuote: function(value) {
                return value.replace(/(?:^"(.*)"$)|(?:^'(.*)'$)/, "$1$2");
            },
            _parseKey: function() {
                var value = this.ch;
                while (this.next()) {
                    if (this.ch === ":") {
                        this.next();
                        return this._removeQuote(value);
                    }
                    value += this.ch;
                }
                // this.error("Bad string");
            },
            _parseStr: function() {
                this._skipWhite();
                var value = "",
                    starFlag = this.ch;
                if (!!~"\"\'".indexOf(starFlag)) {
                    while (this.next()) {
                        if (starFlag === this.ch) {
                            this.next();
                            return value;
                        }
                        if (this.ch === "\\") {
                            this.next();
                            if (this.escapee[this.ch]) {
                                value += this.escapee[this.ch];
                            }
                        }
                        value += this.ch;
                    }
                }

            },
            _parseNum: function() {
                if (/[\d\.-]/.test(this.ch)) {
                    var value = this.ch;
                    while (this.next()) {
                        if (!!~",}]".indexOf(this.ch)) return value = +value;
                        value += this.ch;
                    }
                    return value;
                }
            },
            _parseValue: function() {
                var value = this.ch;
                while (this.next()) {
                    if (!!~",}]".indexOf(this.ch)) {
                        return this._removeQuote(value);
                    }
                    value += this.ch;
                }
                return value;
            }
        }
        walker.prototype.init.prototype = walker.prototype;


        //调试
        // var log = window.log = _.log = console.log.bind(console);
        var debug = _.debug = function(options) {
            return new debug.prototype.init(options);
        }
        debug.prototype = {
            constructor: debug,
            init: function(options) {
                var self = this;
                var div = document.createElement("div");
                div.className = "_console";
                var div_handle = document.createElement("div");
                div_handle.className = "_console_handle";
                div_handle.innerHTML = "debug";
                var div2 = document.createElement("div");
                div2.className = "_console_log";
                div.appendChild(div_handle);
                div.appendChild(div2);
                _.$("body").appendChild(div);

                console.log = function() {
                    var arg = Array.prototype.slice.call(arguments);
                    template({
                        el: "._console_log",
                        act: "append",
                        template: '<div class="_item">{=result}</div>',
                        data: {
                            result: arg.length === 1 ? arg[0] : arg
                        },
                        callback: function() {
                            this.el.query("._item").removeAttr("style").last().css({ color: 'red' }).scrollIntoView();
                        }
                    })
                }

                toucher([{
                        el: "._console",
                        type: "touchstart",
                        callback: function(item, ev) {
                            ev.preventDefault(); //阻止默认行为
                            ev.stopPropagation(); //停止事件冒泡，向上派发事件到document
                        }
                    },
                    // {
                    //     el: "._console_handle",
                    //     type: "drag"
                    // }, 
                    {
                        el: "._console_handle",
                        type: "tap",
                        callback: function(item, ev) {
                            var log = _.$("._console_log");

                            _.isShow(log) ? _.hide(log) : _.show(log);

                        }
                    }
                ])
            }
        }

        debug.prototype.init.prototype = debug.prototype;


        //按次序循环
        var cycle = _.cycle = function() {
            var args = Array.prototype.slice.call(arguments);
            return new cycle.prototype.init(args);
        }
        cycle.prototype = {
            constructor: cycle,
            init: function(args) {
                var len = args.length;
                this.index = 0; //默认第一个
                this.values = [];

                if (_.isArray(args[0])) {
                    this.values = args[0];
                } else if (_.isObject(args[0])) {
                    for (var key in args[0]) {
                        var obj = {}
                        obj[key] = args[0][key]
                        this.values.push(obj);
                    }
                } else {
                    this.values.push(args[0]);
                }
                if (len >= 2) {
                    if (_.isNumber(args[0])) {
                        var start = args[0],
                            end = args[1];
                        for (var i = start; i <= end; i++) this.values.push(i);
                    } else {
                        this.index = args[1]
                    }
                }
                if (len === 3) this.text = args[2];
                this.length = this.values.length;
            },
            next: function() {
                return this.values[this.index = this.index >= this.values.length - 1 ? 0 : this.index + 1];
            },
            prev: function() {
                return this.values[this.index = this.index <= 0 ? this.values.length - 1 : this.index - 1];
            },
            current: function() {
                return this.values[this.index = this.index === -1 ? 0 : this.index];
            },
            val: function() {
                return this.current();
            },
            first: function() {
                return this.length > 0 ? this.values[0] : null;
            },
            last: function() {
                return this.length > 0 ? this.values[this.length - 1] : null;
            },
            text: function(str) {
                this.text = str;
            },
            attr: function(opt) {
                for (var k in opt) this[k] = opt[k];
                return this;
            }
        }
        cycle.prototype.init.prototype = cycle.prototype;

        _.sliderCycle = function(options) {
            var min = options.min,
                max = options.max,
                step = options.step,
                value = options.value,
                values = [],
                i = 0,
                t = min,
                index = 0;
            //判断小数位数
            // var n=step.toString().split(".")[1].length;
            var n = 0;
            step.toString().replace(/\d+(?:\.(\d+))?/, function(m, f) {
                if (f) n = f.length;
            });

            while (t <= max) {
                values.push(t);
                if (t === value) index = i;
                t = Number((t + step).toFixed(n));
                i++;
            }
            return _.cycle(values, index).attr(options);
        };


        //polyfill  requestAnimationFrame
        inBrowser && (function() {
            var lastTime = 0;
            var vendors = ['ms', 'moz', 'webkit', 'o'];
            for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
                window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
            }
            if (!window.requestAnimationFrame) window.requestAnimationFrame = function(callback, element) {
                var currTime = +new Date();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime)); //1000 / 60
                var id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
            if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }());



        var PIx2 = Math.PI * 2; //- 0.0001;

        //弧度radian
        _.rad = function(a) {
            a %= 360;
            return a * Math.PI / 180
        };
        //弧度转角度
        _.deg = function(rad) {
            return rad * (180 / Math.PI);
        };
        //正玄
        _.sin = function(a) {
            a %= 360;
            return Math.sin(a * Math.PI / 180);
        };
        //余玄
        _.cos = function(a) {
            a %= 360;
            return Math.cos(a * Math.PI / 180);
        };
        //正切
        _.tan = function(a) {
            a %= 360;
            return Math.tan(a * Math.PI / 180);
        }
        _.atan = function(a) {
            a %= 360;
            return Math.atan(a * Math.PI / 180);
        }
        //获取斐波那契数列
        //第三个数开始，每个数都是前两个数之和
        _.fibonacci = function(n) {
            if (n === 1) return [0];
            if (n === 2) return [0, 1];
            var arr = [0, 1];
            while (n-- - 2) arr.push(arr[arr.length - 1] + arr[arr.length - 2]);
            // for (var i = 0; i < n - 2; i++) arr.push(arr[i] + arr[i + 1])
            return arr;
        }


        //延迟队列
        var _queue = _.queue = function(fn) {
            return new _queue.prototype.init(fn)
        }
        _queue.prototype = {
            constructor: _queue,
            init: function(fn) {
                this.dataStore = [];
                this.speeds = {
                    slow: 600,
                    fast: 200,
                    _default: 400
                };
                fn && this.enqueue(fn)
            },
            enqueue: function(fn) {
                this.dataStore.push(fn);
            },
            dequeue: function() {
                return this.dataStore.shift();
            },
            exequeue: function() {
                var fn = this.dequeue();
                fn && fn.call(this, this.exequeue);
            },
            delay: function(fn, time) {
                var self = this;
                time = _.isNumber(time) ? time : time in this.speeds ? this.speeds[time] : this.speeds._default;
                this.enqueue(function(next) {
                    setTimeout(function() {
                        fn && fn();
                        next && next.call(self);
                    }, time);
                })
                self.timeout && clearTimeout(self.timeout);
                self.timeout = setTimeout(function() {
                    self.exequeue();
                }, 0)
            }

        }
        _queue.prototype.init.prototype = _queue.prototype;

        var Easing = {
            //定义域和值域均为[0, 1], 传入自变量x返回对应值y
            //先加速后减速
            ease: function(x) {
                // return -0.5*Math.cos(Math.PI * (2 - x)) + 0.5;
                if (x <= 0.5) return 2 * x * x;
                else if (x > 0.5) return -2 * x * x + 4 * x - 1;
            },

            // 初速度为0 ,一直加速
            easeIn: function(x) {
                return x * x;
            },

            //先慢慢加速1/3, 然后突然大提速, 最后减速
            ease2: function(x) {
                return x < 1 / 3 ? x * x : -2 * x * x + 4 * x - 1;
            },

            //初速度较大, 一直减速, 缓冲动画
            easeOut: function(x) {
                return Math.pow(x, 0.8);
            },

            //碰撞动画
            collision: function(x) {
                var a, b; //a, b代表碰撞点的横坐标
                for (var i = 1, m = 20; i < m; i++) {
                    a = 1 - (4 / 3) * Math.pow(0.5, i - 1);
                    b = 1 - (4 / 3) * Math.pow(0.5, i);
                    if (x >= a && x <= b) {
                        return Math.pow(3 * (x - (a + b) / 2), 2) + 1 - Math.pow(0.25, i - 1);
                    }
                }
            },

            //弹性动画
            elastic: function(x) {
                return -Math.pow(1 / 12, x) * Math.cos(Math.PI * 2.5 * x * x) + 1;
            },

            //匀速动画
            linear: function(x) {
                return x;
            },

            //断断续续加速减速
            wave: function(x) {
                return (1 / 12) * Math.sin(5 * Math.PI * x) + x;
            },

            //先向反方向移动一小段距离, 然后正方向移动, 并超过终点一小段, 然后回到终点
            opposite: function(x) {
                return (Math.sqrt(2) / 2) * Math.sin((3 * Math.PI / 2) * (x - 0.5)) + 0.5;
            }

        }

        var _tween = _.tween = function(options) {
            return new _tween.prototype.init(options);
        }

        // 补间动画     直线运动 匀速 非匀速   曲线运动  路径动画
        _tween.prototype = {
            constructor: _tween,
            init: function(options) {
                this._start = options.start;
                this._end = options.to;
                this.callback = options.callback;
                this.duration = options.duration; //Math.ceil(options.duration / 17);
                this._repeat = options.repeat;
                this._yoyo = options.yoyo;
                this.type = options.type || "linear";
                // this.step = 0;
                this._deta = {}
                for (var key in this._end) {
                    this._deta[key] = this._end[key] - this._start[key] || 0;
                }
                this._delayTime = options.delay || 0;
                this._startTime = +new Date(); // Date.now();
                this._startTime += this._delayTime;
                this.update()
            },
            callTween: function(time) {
                var k = (time - this._startTime) / this.duration;
                k = (this.duration === 0 || k > 1) ? 1 : k;

                var vk;
                if (_.isObject(this.type)) {
                    vk = {};
                    for (var key in this._deta) { //this.type
                        vk[key] = Easing[this.type[key] || "linear"](k);
                    }
                } else {
                    var fn = Easing[this.type];
                    vk = fn(k);
                }

                //重复
                if (this._repeat) {
                    if (k === 1) {
                        this._startTime = time;
                        if (isFinite(this._repeat)) {
                            this._repeat--;
                        }

                        if (this._yoyo) { // start end替换
                            var temp = this._start;
                            this._start = this._end;
                            this._end = temp;
                            for (var key in this._end) {
                                this._deta[key] = this._end[key] - this._start[key] || 0;
                            }

                        }
                    }
                }
                var obj = {};
                for (var key in this._deta) {
                    // var vk = curve[this.type[key]](k);
                    var v;
                    if (_.isObject(vk)) {
                        v = vk[key]
                    } else {
                        v = vk;
                    }
                    obj[key] = v * this._deta[key] + this._start[key];
                }
                return obj
            },
            update: function() {
                var self = this;
                // this.step++;
                var time = +new Date();
                var obj = this.callTween.call(this, time)

                if (time - this._startTime <= this.duration) {
                    this.callback(obj)
                    // requestAnimationFrame.call(this,this.update);
                    setTimeout(function() {
                        self.update.call(self);
                    }, 17)
                } else {
                    this.callback(obj);
                }
            }
        }
        _tween.prototype.init.prototype = _tween.prototype;

        //向量  空间计算工具
        var _vector = _.vector = function(opt) {
            return new _vector.prototype.init(opt)
        }
        _vector.prototype = {
            constructor: _vector,
            init: function(opt) {
                this.x = opt.x || 0;
                this.y = opt.y || 0;
                this.z = opt.z || 0;
            },
            // reset:function(){
            //     return this.constructor(this.opt);
            // },
            //相等 equals
            equal: function(v) {
                return ((v.x === this.x) && (v.y === this.y));
            },
            clone: function() {
                return this.constructor({
                    x: this.x,
                    y: this.y,
                    z: this.z
                });
            },
            //负向量 转180度  
            //negated
            neg: function() {
                this.x = -this.x;
                this.y = -this.y;
                this.z = -this.z;
                return this;
            },
            //法向量 normal vector 垂直向量 
            //Vector norm
            norm: function() {
                return this.constructor({
                    x: -this.y,
                    y: this.x
                }); //-this.y, this.x
            },
            //向量相加
            //Translate vector
            //translate(v1, v2):= v1.add(v2)
            add: function(v) {
                this.x += v.x;
                this.y += v.y;
                return this;
            },
            //向量相减
            sub: function(v) {
                this.x -= v.x;
                this.y -= v.y;
                return this;
            },
            //缩放 scalar
            scale: function(s) {
                this.x *= s;
                this.y *= s;
                return this;
            },
            //取模 向量长度  勾股定理
            //修改长度，改变向量的大小
            abs: function(len) {
                if (_.isUndefined(len))
                    // return Math.sqrt(this.x * this.x + this.y * this.y);
                    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                var abs = this.abs();
                if (abs !== 0 && len !== abs) {
                    this.scale(len / abs);
                }
                return this;
            },

            //方向 向量的角度
            deg: function(deg) {
                if (_.isUndefined(deg))
                    return this.radToDeg(Math.atan2(this.y, this.x));

                var r = this.abs();
                this.x = r * Math.cos(this.degToRad(deg));
                this.y = r * Math.sin(this.degToRad(deg));
                return this;
            },
            //方向 向量的弧度
            rad: function(rad) {
                if (_.isUndefined(rad))
                    return Math.atan2(this.y, this.x);

                var r = this.abs();
                this.x = r * Math.cos(rad);
                this.y = r * Math.sin(rad);
                return this;
            },
            //向量点积
            //Scale vector
            //scale(v1, factor):= v1.mul(factor)
            //Rotate vector around center
            //rotate(v, angle):= v.mul({abs: 1, arg: angle})
            //Rotate vector around a point
            //rotate(v, p, angle):= v.sub(p).mul({abs: 1, arg: angle}).add(p)
            mul: function(v) {
                return this.x * v.x + this.y * v.y;
            },
            //夹角 根据两个向量夹角计算  Included angle
            ia: function(v) {
                var theta = this.mul(v) / (this.abs() * v.abs());
                return Math.acos(theta);
            },
            //是否垂直 Normal to
            isNorm: function(v) {
                return this.mul(v) === 0;
            },
            //角度转弧度
            degToRad: function(deg) {
                return deg * (Math.PI / 180);
            },
            //弧度转角度
            radToDeg: function(rad) {
                return rad * (180 / Math.PI);
            },
            //向量的绕Z轴旋转
            rotate: function(deg) {
                var ca = _.cos(deg); //Math.cos(this.degToRad(deg));
                var sa = _.sin(deg); //Math.sin(this.degToRad(deg));
                var x = this.x,
                    y = this.y;
                var rx = x * ca - y * sa;
                var ry = x * sa + y * ca;
                this.x = rx;
                this.y = ry;
                return this;
            },
            //三维向量的叉积，向量积
            cross: function(v) {
                var x = this.x,
                    y = this.y,
                    z = this.z;
                this.x = y * v.z - z * v.y;
                this.y = z * v.x - x * v.z;
                this.z = x * v.y - y * v.x;
                return this;
            },
            // 绕XY轴旋转
            rotateXY: function(a, b) {
                var ca = Math.cos(this.degToRad(a)),
                    sa = Math.sin(this.degToRad(a)),
                    cb = Math.cos(this.degToRad(b)),
                    sb = Math.sin(this.degToRad(b));

                var x = this.x,
                    y = this.y,
                    z = this.z,
                    rz = y * sa + z * ca;

                this.y = y * ca - z * sa;
                this.z = x * -sb + rz * cb;
                this.x = x * cb + rz * sb;
                return this;
            },
            //透视比率 perspectiveRatio
            pr: function(viewDist) {
                viewDist = viewDist ? viewDist : 300;
                return viewDist / (this.z + viewDist);
            },
            //投射到屏幕上的二维点  project
            proj: function(pr) {
                pr = pr ? pr : this.pr();
                this.x *= pr;
                this.y *= pr;
                this.z = 0;
                return this;
            },
            //转成极坐标
            toPolar: function(o) {
                var a = this.deg(),
                    r = this.abs();
                return o ? {
                    a: a,
                    r: r,
                    o: o
                } : {
                    a: a,
                    r: r,
                }
            },
            toP: function(o) {
                return this.toPolar(o);
            }
        }
        _vector.prototype.init.prototype = _vector.prototype;

        // 极坐标点
        //输入：r,a ,o(x,y)
        //输出：x y  
        var _pointPolar = _.pointPolar = function(opt) {
            return new _pointPolar.prototype.init(opt)
        }
        _pointPolar.prototype = {
            constructor: _pointPolar,
            init: function(opt) {
                var a = this.a = opt.a || 0,
                    r = this.r = opt.r || 0,
                    o = this.o = opt.o || { x: 0, y: 0 };
                var p = this.xy(r, a, o);
                this.x = p.x;
                this.y = p.y;
            },
            //极坐标转xy坐标
            xy: function(r, a, o) {
                return {
                    x: o.x + r * _.cos(a),
                    y: o.y + r * _.sin(a)
                }
            },
            //向量 vector 以this为原点坐标 表示向量 p
            toVector: function(p) {
                return p ? _vector({
                    x: p.x - this.x,
                    y: p.y - this.y
                }) : _vector({
                    x: this.x - this.o.x,
                    y: this.y - this.o.y
                })
            },
            toV: function(p) {
                return this.toVector(p);
            },
            //距离  勾股定律 向量取模 distance
            //distance(v1, v2):= v1.sub(v2).abs()
            distance: function(p) {
                return this.toV(p).abs();
            },
            dist: function(p) {
                return this.distance(p);
            },
            transform: function(opt) {
                return this.constructor(_.extendOwn({}, this, opt));
            },
            clone: function(opt) {
                return this.transform(opt)
            },

            //(x,y)关于y=x的对称点是(y,x)
            //关于y=-x的对称点为 （-y,-x）
            //对称点 y=x是 线段（x,y）,(y,x)的垂直平分线
            //斜率k1*k2=-1 垂直平分线
            //中垂线是线段的一条对称轴
            //斜率 slope
            slope: function(p) {
                return (this.y - p.y) / (this.x - p.x);
            },
            //中点 middle, 求this和p的中点， p{x,y}
            mid: function(p) { //, ratio
                var v = this.toV(p).scale(0.5);
                return this.clone(v.toP());
            },
            //均分点meanSplit。分割n次，分割成n+1段
            split: function(p, n) {
                var ps = [];
                for (var i = 1; i <= n; i++) {
                    var v = this.toV(p).scale(i / (n + 1));
                    ps.push(this.clone(v.toP()));
                }
                return ps;
            },
            //镜像 镜像点，以p为镜像原点
            mirror: function(p, ratio) {
                var v = this.toV(p);
                if (ratio) v.scale(ratio);
                return this.clone(v.toP(p));
            },
            //经过点的平行线 parallel lines
            //经过t点的平行线
            // _parallel: function(p, t, k) {
            //     var v = this.toV(p);
            //     return v.scale(k).add(t);
            // },
            //经过t点的垂线
            //k为0时，中间控制点落在这条线段上，k为1时，中间控制点与直线的距离为这条线段的长度
            //curveness曲率
            // _vertical: function(p, t, k) {
            //     var v = this.toV(p);
            //     return v.norm().scale(k).add(t);
            // },

            //经过点的垂线

            //两点确定的直线上 移动距离
            //k=tanθ=sinA/cosA
            translate: function(p, d) {
                var v = this.toV(p).abs(d);
                return this.clone(v.toP());
            },
            trans: function(p, d) {
                return this.translate(p, d);
            },
            //vertical split line  ,垂点，曲率
            //垂直均分线，垂线上的点与垂点距离 
            vertical: function(p, d) {
                var v = this.toV(p).norm().abs(d);
                return this.clone(v.toP());
            },
            norm: function(p, d) {
                return this.vertical(p, d);
            },
            //平移
            // _translateXY: function(x, y) {
            //     var o2 = {
            //         x: this.o.x + x || 0,
            //         y: this.o.y + y || 0
            //     }
            //     return this.clone({ o: o2 });
            // },
            // _translate: function(k, d, o) {
            //     var r = Math.sqrt(Math.pow(k, 2) + 1);
            //     var sina = k / r;
            //     var cosa = 1 / r;
            //     var o2 = {};
            //     o2.x = k * d * cosa + o.x;
            //     o2.y = k * d * sina + o.y;
            //     return this.clone({ o: o2 })
            // },
            //旋转
            rotate: function(a) {
                return this.clone({ a: (this.a + a) % 360 });
            },
            scale: function(e) {
                return this.clone({ r: this.r * e });
            },
            //投射点
            proj: function(p, pr) {
                var v = this.toV(p).proj(pr);
                return this.clone(v.toP());
            },
            //透视比
            pr: function(p, d) {
                var v = this.toV(p)
                return v.pr(d);
            }
        }
        _pointPolar.prototype.init.prototype = _pointPolar.prototype;

        //点
        //直角坐标 xy Coordinate
        var _point = _.point = function(opt) {
            return new _point.prototype.init(opt);
        }
        _point.prototype = {
            constructor: _point,
            init: function(opt) {
                this.x = opt.x;
                this.y = opt.y;
                // this.r = opt.r;
                this.color = opt.color;
                this.vx = Math.random() * 2 - 1;
                this.vy = Math.random() * 2 - 1;
                //range

                this.left = opt.left;
                this.right = opt.right;
                this.top = opt.top;
                this.bottom = opt.bottom;
            },
            move: function() {
                this.x += this.vx;
                this.y += this.vy;
                // this.a=this.a*0.9;
                // this.vy+=0.22; //加速下落
                // this.vy += 0.01 * this.vx * this.vx; //*this.vx

                // this.vx+=0.41*this.vy


                if (this.x < this.left || this.x > this.right) {
                    this.vx *= -1;
                }
                if (this.y < this.top || this.y > this.bottom) {
                    this.vy *= -1;
                }

                return this;
            },
        }
        _point.prototype.init.prototype = _point.prototype;



        //顶点  极坐标,等角切分
        //当r相同时  半径变化比率rRation=1  为正多边形
        //1 ,.05，两个数循环。形成星形  ，凹多边形
        //渐渐变大或变小 ，形成 螺旋线 
        //不等角切分 等距r  形成矩形  (未处理) 
        var _vertex = _.vertex = function(options) {
            return new _vertex.prototype.init(options)
        }
        _vertex.prototype = {
            constructor: _vertex,
            init: function(options) {
                if (options) {
                    this.po = this.centerPoint(options);
                    this.vs = this.vertices(options);
                }
                return this;
            },
            //圆心
            centerPoint: function(opt) {
                var o = {
                    x: opt.x,
                    y: opt.y
                }
                return _pointPolar({ o: o });
            },
            //顶点 polygon 多边形
            vertices: function(opt) {
                var shape = opt.group || opt.shape,
                    r = opt.r || 100,
                    a = opt.a || 0,
                    x = opt.x,
                    y = opt.y,
                    rRatio = opt.rRatio || 1,
                    aRatio = opt.aRatio || 1,
                    turns = opt.turns || 1,
                    num = opt.num || 3;
                var po = this.po;

                //变化类型：加速 匀速
                var rRatioType = opt.rRatioType;
                // this.aRatioType = op.aRatioType;

                switch (shape) {
                    case "star":
                        rRatioType = "ac";
                        rRatio = [rRatio, 1 / rRatio]
                        break;
                    case "spiral":
                        r = 0.01;
                        turns = 30;
                        break;
                }
                var vs = [];
                var rRatioCycle = _.cycle(rRatio || 1);
                var rn = r;
                var an;
                for (var i = 0; i < num * turns; i++) {
                    switch (rRatioType) {
                        case "cv": //case "constantvelocity": //匀速螺线 阿基米德螺线
                            rn += r * (rRatioCycle.next() - 1);
                            break;
                        case "ac": //加速螺旋 case "acceleration":
                            rn = i === 0 ? r : i === 1 ? r * rRatioCycle.val() : rn * rRatioCycle.next();
                            break;
                    }

                    // switch (aRatioType) {
                    //     case "cv":
                    //     case "constantvelocity":
                    //         // a += opt.a * (aRatio.next() - 1);
                    //         a=i * 360 / num + opt.a,
                    //         break;
                    //     case "acc":
                    //     case "acceleration": //加速螺旋
                    //         // a = a == 0 ? opt.a * rRatio.val() : opt.a * rRatio.next();/
                    //         a=i * 360 / num + opt.a,
                    //         break;
                    // }
                    an = i * 360 / num + a;
                    var p = po.clone({ a: an, r: rn });
                    vs.push(p);
                }
                return vs;
            },
            //内接多边形 顶点
            invertices: function(vs) {
                var vs = vs || this.vs,
                    len = vs.length;
                if (len < 2 || vs[0].dist(vs[1]) < 10) return false;
                return vs.map(function(t, i) {
                    return t.mid(vs[i + 1 < len ? i + 1 : 0]);
                })
            },
            regularVertices: function(opt) {
                var num = opt.num;
                var po = this.po;
                //夹角
                var ia = 360 / num;
                var vs = [p];
                for (var i = 0; i < num; i++) {
                    vs.push(p = po.rotate(ia));
                }
                return vs;
            },
            //变形
            transform: function(opt) {
                return this.vs.map(function(t) {
                    return t.transform(opt);
                })
            },
            //可以改变   r a o，其他参数无效
            clone: function(opt) {
                return this.vs.map(function(t) {
                    return t.clone(opt);
                })
            },
            //旋转
            rotate: function(a) {
                return this.vs.map(function(t) {
                    return t.rotate(a);
                })
            },
            //内切三角形  递归
            intriangle: function(vs) {
                var self = this;
                var vsGroup = [];
                (function _intriangle(vs) {
                    var vs2 = self.invertices(vs);
                    if (vs2) {
                        vsGroup.push(vs2);
                        vs.map(function(t, i) {
                            var vs3 = [t, vs2[i], vs2[i === 0 ? vs2.length - 1 : i - 1]]
                            _intriangle(vs3)
                        });
                    }
                })(vs);
                return vsGroup
            },
            //螺旋
            spiral: function(opt) {
                var self = this;
                var po = this.po || this.centerPoint(opt),
                    vs = [po],
                    turns = opt.turns || 1,
                    r = opt.r;
                for (var i = 0; i < turns; i += 2) {
                    [
                        [r * i, 0],
                        [0, r * i],
                        [-r * (i + 1), 0],
                        [0, -r * (i + 1)]
                    ].forEach(function(t) {
                        vs.push(po.translateXY.apply(po, t));
                    })
                }
                return vs;
            },

        }
        _vertex.prototype.init.prototype = _vertex.prototype;



        //基础图形
        var _shape = _.shape = function(draw, opt) {
            return new _shape.prototype.init(draw, opt);
        };

        _shape.prototype = {
            constructor: _shape,
            init: function(draw, opt) {
                var self = this;
                var canvas;
                if (draw) {
                    this.draw = draw;
                    this.canvas = draw.canvas;
                    this.context = draw.context;
                }
                if (!opt) return;
                //图形合并
                [{ k: "line", num: 2 }, { k: "triangle", num: 3 }, { k: "square", num: 4 }].forEach(function(t) {
                    if (t.k === opt.shape) {
                        opt.shape = "polygon";
                        opt.num = t.num;
                    }
                });
                var shape = _.isUndefined(opt.shape) ? "polygon" : opt.shape;
                var x = _.isUndefined(opt.x) ? this.canvas.width / 2 : opt.x;
                var y = _.isUndefined(opt.y) ? this.canvas.height / 2 : opt.y;
                var a = _.isUndefined(opt.a) ? 0 : opt.a;
                x += opt.offsetX || 0;
                y += opt.offsetY || 0;


                var opt = this.opt = _.clone(opt, {
                    shape: shape,
                    width: opt.r,
                    height: opt.r,
                    x: x,
                    y: y,
                    a: a,
                });
                self.setup(opt);
            },
            setup: function(opt) {
                var opt = opt || this.opt;
                var shape = opt.shape;
                if (this[shape]) {
                    if (opt.fractalMirror) {
                        return this.fractalMirror(opt);
                    }
                    if (opt.fractal) {
                        return this.fractal(opt);
                    }
                    if (opt.fractalIn) {
                        return this.fractalIn(opt);
                    } else {
                        //重新计算vs
                        this._vertex(opt);
                        return this[shape].call(this, opt);
                    }
                } else {
                    console.log(+"not support:" + shape)
                }
            },
            _vertex: function(opt) {
                var vertex = this.vertex = _.vertex(opt);
                this.vs = vertex.vs;
                this.po = vertex.po;
            },
            //分形 逐级缩小
            fractal: function(opt) {
                var self = this;
                this.setup(_.clone(opt, { fractal: false }));
                var fractalRatio = opt.fractalRatio || 0.618;
                var r = opt.r * fractalRatio; //ratio增大，计算量大，会致死锁，设置最大level5
                var minR = opt.minR || 5;
                var fractalLevel = opt.fractalLevel || 0;
                var maxLevel = _.isUndefined(opt.maxLevel) ? 5 : opt.maxLevel;
                fractalLevel++;
                var fractal = fractalLevel >= maxLevel || r < minR ? false : true;
                this.vs.forEach(function(t) {
                    var opt2 = _.clone(opt, { x: t.x, y: t.y, r: r, fractal: fractal, fractalLevel: fractalLevel });

                    // var v=t.toVector().scale(1+fractalRatio);
                    // // var v=t.toVector();
                    // // var v2=v.clone().scale(fractalRatio).rotate(30);
                    // // v=v.add(v2);
                    // var p=_pointPolar(v.toPolar(t.o));
                    // var opt2 = _.clone(opt, { x: p.x, y: p.y, r: r, fractal: fractal, fractalLevel: fractalLevel });
                    self.setup(opt2);
                });
            },
            //分形  逐级放大
            fractalIn: function(opt) {
                var self = this;
                this.setup(_.clone(opt, { fractalIn: false }));
                var fractalLevel = opt.fractalLevel || 0;
                var maxLevel = _.isUndefined(opt.maxLevel) ? 5 : opt.maxLevel;
                fractalLevel++;
                if (fractalLevel >= maxLevel) return;
                var vs = this.vs;
                if (vs.length < 2) return;
                var v = vs[0].toVector().add(vs[1].toVector()); //计算上级r a，相连的向量和
                var opt = _.clone(opt, v.toP(), { fractalLevel: fractalLevel })
                self.setup(opt);
            },
            //顶点镜像分形
            fractalMirror: function(opt) {
                this.setup(_.clone(opt, { fractalMirror: false }));
                var fractalLevel = opt.fractalLevel || 0;
                var maxLevel = _.isUndefined(opt.maxLevel) ? 5 : opt.maxLevel;
                fractalLevel++;
                if (fractalLevel >= maxLevel) return;
                var vertex = _.vertex(opt);
                var vs = vertex.vs;
                var po = vertex.po;
                var fractalRatio = opt.fractalRatio || 0.618;
                var minR = opt.minR || 5;
                vs.forEach(function(t, i) {
                    var o = po.mirror(t, fractalRatio);
                    if (o.r < minR) {
                        return
                    }
                    var opt2 = _.clone(opt, { r: o.r, x: o.x, y: o.y, a: o.a + 180, fractalLevel: fractalLevel }); //,showMirror: showMirror
                    self.shape(opt2);
                })
            },
            color: function(colorful) {
                if (colorful) {
                    if (this.opt.fill) {
                        this.opt.color = _.rgba();
                    } else {
                        this.opt.color = _.rgb();
                    }
                }
                return this;
            },
            //平移
            // translate: function(x, y) {
            //     var opt = _.clone(this.opt, {
            //         x: this.opt.x + x,
            //         y: this.opt.y + y,
            //         offsetX: 0,
            //         offsetY: 0
            //     });
            //     return this.draw.shape(opt);
            // },
            // regularVertices: function(opt) {
            //     var p = _.point(opt)
            //     var num = opt.num;
            //     //夹角
            //     var ia = 360 / num;
            //     var vs = [p];
            //     for (var i = 0; i < num; i++) {
            //         vs.push(p = p.rotate(ia));
            //     }
            //     return vs;
            // },
            regularPolygon: function(opt) {
                var vs = _.vertex().regularVertices(opt);
                this.draw.link(vs, opt);
            },
            spiral: function(opt) {
                var vs = _.vertex().spiral(opt);
                this.draw.link(vs, opt);
            },
            //斐波那契数列 螺旋
            fibonacci: function(opt) {
                var num = opt.num;
                var fb = _.fibonacci(num);
                var sequence = opt.group.sequence;
                var clockwise = sequence === "clockwise" ? true : false;

                // var clockwise = opt.clockwise;
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                this.draw.beginPath(opt);
                // var w = 2 * r;
                // ctx.beginPath();
                // ctx.beginPath();
                // ctx.moveTo(x, y);
                // ctx.lineTo(x + r, y);
                // //fb1
                // ctx.arc(x, y, r, 0, Math.PI * 2, true);
                // ctx.rect(x - r, y - r, w, w);
                // //fb3 1
                // ctx.rect(x + r, y - r, w, w);
                // ctx.arc(x + r, y - r, w, 0, Math.PI * 0.5, false); //顺时针
                // // ctx.arc(x+r,y-r,2*r,Math.PI * 1.5, Math.PI * 2,false);

                // //fb4 2
                // ctx.rect(x - r, y - r - 2 * w, 2 * w, 2 * w);
                // ctx.arc(x - r, y - r , 2 * w, Math.PI * 1.5, Math.PI * 2,false);
                // // ctx.arc(x-r,y-r,w,0, Math.PI * 0.5,false);//顺时针

                // // ctx.closePath();
                // this.render(opt);



                // 绘制曲线方法
                // @param prevR 这是斐波那契数列中前一位的数值，也就是上一截曲线的半径
                // @param n 这是斐波那契数列中的下标
                // @param r 这是斐波那契数列当前下标的值，也就是将画曲线的半径
                function _fibonacci(prevR, n, r) {
                    // var radius = r ; //r * 5
                    //五倍半径画，不然太小了

                    var startAngle = Math.PI
                    var endAngle = Math.PI * 0.5
                    //每个半径只画1/4个圆，所以开始角度和结束角度刚好相差 1/4 * PI


                    //设置为逆时针方向画

                    //改变圆点坐标、开始角度和结束角度
                    //第三个元素的圆点坐标、开始角度和结束角度上面已经给出，所以从第四个元素开始改变圆点坐标、开始角度和结束角度，也就是从n > 2开始
                    if (n > 2) {
                        //下面坐标的改变可以参考上面的图和直接用canvas画的代码。
                        switch (n % 4) {
                            case 0:
                                x = x + prevR - r
                                startAngle = 0
                                endAngle = Math.PI * 1.5
                                break;
                            case 1:
                                y = y - prevR + r
                                startAngle = Math.PI * 1.5
                                endAngle = Math.PI
                                break;
                            case 2:
                                x = x - prevR + r
                                startAngle = Math.PI
                                endAngle = Math.PI * 0.5
                                break;
                            case 3:
                                y = y + prevR - r
                                startAngle = Math.PI * 0.5
                                endAngle = 0
                                break;
                        }
                    }
                    ctx.arc(x, y, r, startAngle, endAngle, true);
                    // ctx.rect(x-r, y-r, 2*r, 2*r);
                }


                for (var i = 0; i < fb.length; i++) {
                    //从第三个元素开始画，符合斐波那契数列的规律
                    if (i >= 2) {
                        _fibonacci(fb[i - 1], i, fb[i])
                    }
                }

                this.draw.render(_.clone(opt, { closed: false }))
                return this;
            },
            //螺旋
            // spiral: function(opt) {
            //     var ctx = this.context;
            //     var x = opt.x,
            //         y = opt.y,
            //         r = opt.r;
            //     ctx.beginPath();
            //     var r0 = 1;
            //     while (r0 < r) {
            //         r0 = r0 * 1.1
            //         ctx.arc(x, y, r0, r0, r0 + 1, true);
            //     }
            //     // ctx.closePath();
            //     this.render(opt);
            //     return this;
            // },
            //顶点
            vertices: function(opt) {
                var self = this;
                var vs = this.vs; //|| _.vertex(opt).vs;
                vs.forEach(function(t) {
                    self.circle(_.clone(opt, { x: t.x, y: t.y, r: 3, text: "" }))
                })

                //方法二
                // var shapeGroup = vs.map(function(t) {
                //     return {shape: _.clone(opt, { x: t.x, y: t.y, r: 3, text: "", shape: "circle" })}
                // })
                // this.draw.setup(shapeGroup)
            },
            //文本
            text: function(opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                var text = opt.text || opt.num;
                var color = opt.color || "#000";
                ctx.fillStyle = color;
                ctx.font = r + "px Verdana";
                var measure = ctx.measureText(text);
                ctx.fillText(text, x - measure.width / 2, y + r / 2);
            },
            //圆形
            circle: function(opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                var sa = opt.sa || 0,
                    ea = opt.ea || Math.PI * 2;

                ctx.beginPath();
                ctx.arc(x, y, r, sa, ea, true);
                ctx.closePath();
                this.draw.render(opt);
                var text = opt.text;
                if (!_.isUndefined(text)) {
                    ctx.fillStyle = "#000";
                    ctx.font = "12px Verdana";
                    var measure = ctx.measureText(text);
                    ctx.fillText(text, x - measure.width / 2, y + r / 2);
                    // ctx.fillText(text, x - 4, y + 5);

                    // mPaint.setTextAlign(Paint.Align.CENTER);
                    // Paint.FontMetrics fm = mPaint.getFontMetrics();
                    // //假设已经计算出文字上下居中后Y轴的坐标为 ---> y;
                    // var textY = y + (fm.descent - fm.ascent) / 2 - fm.descent;
                    // canvas.drawText(text, X, textY, mPaint);
                }
                return this;
            },
            ball: function(opt) {
                var ctx = this.context;
                opt.fill = true;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.closePath();
                this.draw.render(opt);
            },
            //椭圆
            ellipse: function(opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r,
                    a = opt.a || 2 * r,
                    b = opt.b || r;
                ctx.save();
                //选择a、b中的较大者作为arc方法的半径参数
                var r = (a > b) ? a : b;
                var ratioX = a / r; //横轴缩放比率
                var ratioY = b / r; //纵轴缩放比率
                ctx.scale(ratioX, ratioY); //进行缩放（均匀压缩）
                ctx.beginPath();
                //从椭圆的左端点开始逆时针绘制
                ctx.moveTo((x + a) / ratioX, y / ratioY);
                ctx.arc(x / ratioX, y / ratioY, r, 0, 2 * Math.PI);
                ctx.closePath();
                this.draw.render(opt);
                ctx.restore();
                return this;
            },
            //sector扇形
            sector: function(opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                var startAngle = opt.a;
                var endAngle;
                var anticlockwise = true; //逆时针方向
                if (anticlockwise) {
                    startAngle - Math.PI * 0.5
                } else {
                    endAngle = startAngle + Math.PI * 0.5
                }
                ctx.beginPath();
                ctx.arc(x, y, r, startAngle, endAngle, anticlockwise)
                ctx.closePath();
                this.draw.render(opt);
                return this;
            },
            //环形
            ring: function(opt) {
                var ctx = this.context;
                this.draw.beginPath(opt)
                var x = opt.x,
                    y = opt.y,
                    r = opt.r,
                    r2 = r * opt.rRatio;
                ctx.arc(x, y, r, 0, PIx2, false);
                ctx.moveTo(x + r2, y);
                ctx.arc(x, y, r2, PIx2, 0, true);
                this.draw.closePath(opt)
                this.draw.render(opt);

                // if (_.isObject(opt.group) && opt.group.group == "ring") {
                //     var shape = opt.shape.shape;
                //     this[shape] && this[shape](opt.shape)

                //     var r2 = opt.shape.r * opt.shape.rRatio;
                //     opt.shape = _.clone(opt.shape, { r: r2 });
                //     this[shape] && this[shape](opt)
                // } else {
                //     // var opt = this.default(opt.shape);
                //     // var c = this.central();
                //     ctx.beginPath();
                //     opt.r2 = opt.r * opt.rRatio;
                //     ctx.arc(opt.x, opt.y, opt.r, 0, PIx2, false);
                //     ctx.moveTo(opt.x + opt.r2, opt.y);
                //     ctx.arc(opt.x, opt.y, opt.r2, PIx2, 0, true);
                //     ctx.closePath();
                //     this.render(opt);
                // }
                return this;
            },
            //心形
            heart: function(opt) {

            },
            //马蹄形 u形
            ushape: function(opt) {

            },
            //v形
            vshape: function(opt) {

            },
            //多边形
            polygon: function(opt) {
                return this.draw.link(this.vs, opt);
            },
            //矩形
            rectangle: function(opt) {
                var ctx = this.context;
                var r = opt.r,
                    w = 2 * r * _.cos(45),
                    h = 2 * r * _.sin(45);
                var x = opt.x - w / 2,
                    y = opt.y - h / 2;
                this.draw.beginPath(opt);
                ctx.rect(x, y, w, h)
                this.draw.closePath(opt);
                this.draw.render(opt);
            },
            //菱形
            diamond: function(opt) {
                opt.num = 4;
                if (_.isNumber(opt.rRatio)) {
                    opt.rRatio = [opt.rRatio, 1 / opt.rRatio];
                } else {
                    opt.rRatio = [0.5, 2];
                }
                opt.rRatioType = "ac";
                this.vs = _.vertex(opt).vs;
                return this.polygon(opt);
            },
            //星星
            star: function(opt) {
                opt.shape = "star"
                this.vs = _.vertex(opt).vs;
                this.polygon(opt);
                return this;
            },
            //正五角星
            pentagram: function(opt) {
                var num = opt.num || 5, //num of edge
                    // a = opt.a, //offset 
                    r = opt.r,
                    ratio = opt.ratio || (3 - 4 * Math.pow(_.sin(18), 2)), //正五角星2.61803
                    vs = this.vs,
                    vs2 = [];
                for (var i = 0; i < num; i++) {
                    var p1 = vs[i];
                    var p2 = p1.clone({
                        a: p1.a + 180 / num,
                        r: r / ratio
                    });
                    vs2.push(p1);
                    vs2.push(p2);
                }
                return this.draw.link(vs2, opt);
            },
            //交叉线
            cross: function(opt) {
                var num = opt.num;
                var vsGroup = [];
                var vertex = this.vertex;
                var opt = _.clone(opt, { num: opt.num * 2 });
                // var vs = _.vertex(opt).vs; //改变num 需要重新计算
                var vs = vertex.vertices(opt)
                for (var i = 0; i < opt.num; i++) {
                    vsGroup.push([vs[i], vs[i + num]]);
                }
                return this.draw.linkGroup(vsGroup, opt);
            },
            //玫瑰花
            rose: function(opt) {
                var self = this;
                var vertex = this.vertex;
                var vs = vertex.vs;
                var vsGroup = [vs];

                var level = 0;
                var turns = opt.turns || 3;
                (function _rose(vs) {
                    if (level >= turns) {
                        return;
                    }
                    var r = opt.r / Math.pow(2, ++level);
                    var vs2 = vertex.clone({ r: r });
                    vsGroup.push(vs2);
                    //断线
                    vs.map(function(t, i) {
                        var vs3 = [t, vs2[i + 1 === vs2.length ? 0 : i + 1]];
                        vsGroup.push(vs3);
                    });
                    _rose(vs2);
                })(vs);

                return self.draw.linkGroup(vsGroup, opt);
            },
            //太阳花
            sunflower: function(opt) {
                var interval = opt.interval || 2;
                var vsGroup = [];
                var vs = this.vs;
                var len = vs.length;

                for (var i = 0; i < len; i++) {
                    var vs2 = [];
                    vs2.push(vs[i]);
                    vs2.push(vs[(i + interval) % len]);
                    vsGroup.push(vs2);
                }
                return this.draw.linkGroup(vsGroup, opt);
            },
            //谢尔宾斯基三角形
            sierpinski: function(opt) {
                var self = this;
                var vertex = this.vertex;
                var vs = vertex.vs;
                var vsGroup = [vs];

                //内切三角形
                (function _intriangle(vs) {
                    var vs2 = vertex.invertices(vs);
                    if (vs2) {
                        vsGroup.push(vs2);
                        vs.map(function(t, i) {
                            var vs3 = [t, vs2[i], vs2[i === 0 ? vs2.length - 1 : i - 1]]
                            _intriangle(vs3)
                        });
                    }
                })(vs);
                return self.draw.linkGroup(vsGroup, opt);
            },
            //谢尔宾斯基地毯
            carpet: function(opt) {
                var self = this;
                var vertex = this.vertex;
                var vs = vertex.vs;
                var vsGroup = [vs];
                var num = opt.num;

                (function _carpet(opt) {
                    var r = opt.r;
                    if (r < 5) {
                        return
                    }
                    var vertex = _.vertex(opt);
                    var r2 = r / 3;
                    var vs2 = vertex.clone({ r: r2 });
                    vsGroup.push(vs2)
                    var r3 = r * 2 / 3;
                    var vs3 = vertex.clone({ r: r3 });
                    var vs4 = [],
                        len = vs3.length;
                    vs3.forEach(function(t, i) {
                        vs4.push(t);
                        vs4.push(t.mid(vs3[i + 1 === len ? 0 : i + 1]));
                    })
                    vs4.forEach(function(t) {
                        var opt2 = _.clone(opt, { r: r2, x: t.x, y: t.y })
                        _carpet(opt2)
                    })

                })(opt);
                return self.draw.linkGroup(vsGroup, opt);
            },

            //内切 多边形
            inpolygon: function(opt) {
                var self = this;
                var vertex = this.vertex;
                var vs = vertex.vs;
                var vsGroup = [vs];
                (function _inpolygon(vs) {
                    var vs2 = vertex.invertices(vs);
                    if (vs2) {
                        vsGroup.push(vs2);
                        _inpolygon(vs2)
                    }
                })(vs);
                return self.draw.linkGroup(vsGroup, opt);
            },
            //顶点镜像
            // mirror: function(opt) {
            //     var vsGroup = [];
            //     // var vs = _.vertex(opt).vs;
            //     var vs=this.vs;
            //     vsGroup.push(vs);
            //     vs.forEach(function(t) {
            //         var vs2 = [];
            //         vs.forEach(function(t2) {
            //             vs2.push(t2.mirror(t));
            //         })
            //         vsGroup.push(vs2);
            //     });
            //     return this.draw.linkGroup(vsGroup, opt);
            // },
            //轴对称
            axialMirror: function(opt) {
                var self = this;
                var vertex = this.vertex;
                var vs = vertex.vs;
                var po = vertex.po;
                var vsGroup = [vs];
                var a = opt.a,
                    num = opt.num,
                    r = opt.r;
                var an,
                    rn = 2 * r * _.cos(180 / num);
                vs.forEach(function(t, i) {
                    var p = po.clone({
                        a: t.a + 180 / num,
                        r: rn
                    })
                    var vs2 = vertex.clone({
                        o: {
                            x: p.x,
                            y: p.y
                        }
                    })
                    vsGroup.push(vs2);
                });
                return this.draw.linkGroup(vsGroup, opt);
            },
            //蜂巢
            comb: function(opt) {
                var self = this;
                var vsGroup = [];
                opt.num = 6;
                var vertex = this.vertex;
                var vs = vertex.vs;
                var po = vertex.po;
                vsGroup.push(vs);
                var a = opt.a,
                    num = opt.num,
                    r = opt.r;
                var _comb1 = function(n) {
                    var rn = 2 * n * r * _.cos(180 / num);
                    vs.forEach(function(t, i) {
                        var p = po.clone({
                            a: t.a + 180 / num,
                            r: rn
                        })
                        var vs2 = vertex.clone({
                            o: {
                                x: p.x,
                                y: p.y
                            }
                        })
                        vsGroup.push(vs2);
                    });

                };
                var _comb2 = function(n) {
                    var rn = 2 * n * r + r; //3 * r 
                    vs.forEach(function(t, i) {

                        var p = po.clone({
                            a: t.a,
                            r: rn
                        })
                        var vs2 = vertex.clone({
                            o: {
                                x: p.x,
                                y: p.y
                            }
                        })
                        vsGroup.push(vs2);
                    });
                };
                [1, 2, 3].forEach(function(n) {
                    _comb1(n);
                    _comb2(n);
                });


                return this.draw.linkGroup(vsGroup, opt);

            },
            // 勒洛三角形  reuleaux triangle
            reuleaux: function(opt) {
                var self = this;
                var vertex = this.vertex;
                var vs = vertex.vs;
                this.draw.link(vs, opt);
                //边长
                var r = 2 * opt.r * _.sin(180 / opt.num);
                vs.forEach(function(t) {
                    self.circle(_.clone(opt, { x: t.x, y: t.y, r: r, text: "" }))
                });
            },
            //佛珠
            beads: function(opt) {
                var self = this;
                var vs = this.vs;
                var len = vs.length;
                var r = opt.r * _.sin(180 / opt.num);
                vs.forEach(function(t, i) {
                    var p = t.mid(vs[i + 1 < len ? i + 1 : 0]);
                    self.circle(_.clone(opt, { x: p.x, y: p.y, r: r, text: "" }));
                })
                this.draw.link(vs, opt);
            },
            // 科赫曲线  雪花曲线 todo
            kohn: function(opt) {
                var self = this;
                var vs = this.vs;
                // return this.draw.link(vs, opt)

                var _kohn = function(p, p1) {
                    var ps = p.split(p1, 2);
                    var d = ps[0].dist(ps[1]) / Math.sqrt(2);
                    var m = ps[0].mid(ps[1]);
                    var p2 = m.vertical(ps[1], d);
                    ps.splice(1, 0, p2);
                    var ps2 = [p].concat(ps);
                    ps2.push(p1)
                    // return ps2;
                    if (d < 10) {
                        return ps2
                    }

                    var ps3 = [];
                    var len = ps2.length;

                    ps2.forEach(function(t, i) {
                        if (i + 1 < len) {
                            var ps = _kohn(t, ps2[i + 1])
                            if (i === len - 2) {
                                ps3 = ps3.concat(ps);
                            } else {
                                ps3 = ps3.concat(ps.slice(0, ps.length - 1));
                            }
                        }
                    });
                    return ps3;
                }

                // var vs2 = _kohn(vs[0], vs[1]);
                // var vs2=[];
                var vsGroup = [];
                var len = vs.length;
                vs.forEach(function(t, i) {
                    // if (i + 1 < vs.length) {
                    var t2 = vs[i + 1 === len ? 0 : i + 1];
                    vsGroup.push(_kohn(t, t2));
                    // self.draw.point({
                    //     x: t.x,
                    //     y: t.y,
                    //     text: i
                    // })
                    // self.draw.link(_kohn(t, t2), opt)
                    // }
                });
                this.draw.linkGroup(vsGroup, opt)
            },
            //等角射线
            ray: function(opt) {
                var vs = this.vs,
                    len = vs.length,
                    po = this.po,
                    vsGroup = [];
                if (opt.fillInterval) {
                    for (var i = 0; i < len; i += 2) {
                        vsGroup.push([po, vs[i], vs[i + 1 === len ? 0 : i + 1]])
                    }
                } else {
                    vsGroup = vs.map(function(v, i) {
                        return [po, v];
                    })
                    opt.fill && vsGroup.push(vs);
                }
                return this.draw.linkGroup(vsGroup, opt);
            },
            //射线分形
            rayFractal: function(opt) {
                var vertex = _.vertex(opt);
                var vs = vertex.vs,
                    len = vs.length,
                    po = vertex.po,
                    vsGroup = [];
                var self = this;

                var _ray = function(opt) {
                    var vertex = _.vertex(opt);
                    var vs = vertex.vs,
                        len = vs.length,
                        po = vertex.po;
                    var vsGroup = [];
                    if (opt.fillInterval) {
                        for (var i = 0; i < len; i += 2) {
                            vsGroup.push([po, vs[i], vs[i + 1 === len ? 0 : i + 1]])
                        }
                    } else {
                        vs.forEach(function(v, i) {
                            vsGroup.push([po, v]);
                        })
                        opt.fill && vsGroup.push(vs);
                    }
                    self.draw.linkGroup(vsGroup, opt);
                }
                vs.forEach(function(t) {
                    _ray(_.clone(opt, { x: t.x, y: t.y }))
                })
            },

            // 顶点变形
            transform: function() {
                var self = this;
                var speed = 1;
                var vs = this.vs;
                vs.forEach(function(t) {
                    _.extend(t, {
                        vx: (Math.random() * 2 - 1) * speed,
                        vy: (Math.random() * 2 - 1) * speed,

                    })
                });

                (function _move() {
                    vs.forEach(function(t) {
                        t.x += t.vx;
                        t.y += t.vy;
                    });
                    // self.draw.clear();
                    self.draw.link(vs);
                    setTimeout(_move, 100);
                })()
            },
            //一笔画 画饼
            pie: function(opt) {
                var vertex = this.vertex,
                    vs = vertex.vs,
                    len = vs.length,
                    po = this.po;
                var ctx = this.context;
                ctx.beginPath();
                var n = 2;
                vs.forEach(function(t, i) {
                    if (opt.showVertices)
                        ctx.fillText('' + i, t.x, t.y); //+':'+parseInt(t.a)
                    var t1 = vs[i + n - 1 >= len ? i + n - 1 - len : i + n - 1];
                    if (i % n === 0)
                        ctx.arc(po.x, po.y, opt.r, _.rad(t1.a), _.rad(t.a), true);
                });
                ctx.closePath();
                this.draw.render(opt);
            },
            //太阳
            sun: function(opt) {
                var vertex = this.vertex,
                    vs = vertex.vs,
                    len = vs.length,
                    po = vertex.po;
                if (len < 3) return;

                var vs2 = vs.map(function(t, i) {
                    var t2 = vs[i + 1 === len ? 0 : i + 1];
                    var v = t.toVector().add(t2.toVector());
                    return t.clone(v.toP());
                });

                var vs3 = [];
                vs.forEach(function(t, i) {
                    vs3.push(t);
                    vs3.push(vs2[i])
                })
                this.draw.link(vs.concat(vs3), opt);
            },
            //风车
            windmill: function(opt) {
                var vertex = this.vertex,
                    vs = vertex.vs,
                    len = vs.length,
                    po = vertex.po;
                if (len < 3) return;
                var v;

                var vs2 = vs.map(function(t, i) {
                    var t2, t3;
                    if (i + 1 === len) {
                        t2 = vs[0];
                        t3 = vs[1]
                    } else if (i + 2 === len) {
                        t2 = vs[i + 1];
                        t3 = vs[0]
                    } else {
                        t2 = vs[i + 1];
                        t3 = vs[i + 2];
                    }
                    v = t.toVector(t2).add(t.toVector(t3));
                    return t.clone(v.toP());
                });
                var vs3 = [];
                vs.forEach(function(t, i) {
                    vs3.push(t);
                    vs3.push(vs2[i])
                })
                this.draw.link(vs.concat(vs3), opt);
                //分形放大
                // opt.level=_.isUndefined(opt.level)?1:opt.level;
                // opt.level++;
                // if (opt.level > 5) return;
                // this.setup(_.clone(opt, v.toP()))
            },



        }
        _shape.prototype.init.prototype = _shape.prototype;

        //图形组合
        var _shapeGroup = _.group = function(draw, opt) {
            return new _shapeGroup.prototype.init(draw, opt)
        }
        _shapeGroup.prototype = {
            constructor: _shapeGroup,
            init: function(draw, opt) {
                this.draw = draw;
                this.context = draw.context;
                this.canvas = draw.canvas;

                var r = opt.shape.r,
                    color = opt.shape.color,
                    shape = opt.shape.shape || "circle";
                var colorful = opt.group.colorful;

                var x = _.isUndefined(opt.group.x) ? this.canvas.width / 2 : opt.group.x;
                var y = _.isUndefined(opt.group.y) ? this.canvas.height / 2 : opt.group.y;

                var sr = r;
                var width = r,
                    height = r;

                if (opt.group) {
                    if (!!~["mirror", "surround"].indexOf(opt.group.group)) {
                        width = opt.group.sr + r;
                        height = opt.group.sr + r
                    }
                }

                if (_.isUndefined(opt.group.a)) opt.group.a = 0;
                var colorArr = [];
                var interval = opt.group.interval || 1;

                switch (colorful) {
                    case "random":
                        //随机色
                        for (var i = 0; i < 360 / interval; i++) {
                            colorArr.push(_.rgba())
                        }
                        break;
                    case "gradient":
                        //渐变色
                        colorArr = _.gradientColor(_.rgb(), _.rgb(), 360 / interval);
                        break;

                    case "singleGradient":
                        //单色渐变
                        colorArr = _.gradientColor(_.deepColor(), "#ffffff", 360 / interval);
                    case "solid": //单色
                        break;
                    default:
                        break;
                }
                opt.group = _.clone(opt.group, {
                    width: width,
                    height: height,
                    x: x,
                    y: y,
                    colorArr: colorArr,
                });
                this.opt = opt; //_.clone(opt);
                this.setup();
            },
            //图形
            shape: function(optShape) {
                return this.draw.shape(optShape); //opt.shape
            },
            color: function(opt) {
                var colorful = opt.group.colorful;
                var fill = opt.shape.fill;
                var opt2 = {};
                if (colorful) {
                    if (fill) {
                        opt2.color = _.rgba();
                    } else {
                        opt2.color = _.rgb();
                    }
                }
                return opt2;
            },
            setup: function(opt) {
                var opt = opt || this.opt;
                if (opt.group) {
                    //重新计算vs
                    var vertex = this.vertex = _.vertex(opt.group);
                    this.vs = vertex.vs;
                    this.po = vertex.po;

                    return this.groups = this[opt.group.group](opt)
                } else {
                    return this.shape(opt.shape);
                }
            },
            //多边形
            polygon: function(opt) {
                var self = this,
                    groups = this.vs,
                    po = this.po,
                    len = groups.length;
                var vertex = _.vertex(opt.shape);
                var vsGroup = [];
                var seq = opt.group.sequence; //顺时针逆时针
                switch (seq) {
                    case "clockwise":
                        break;
                    case "anticlockwise":
                        groups.reverse();
                        break;
                    case "shuffle":
                        groups.shuffle();
                        break;
                }
                return groups.map(function(t, i) {
                    opt.shape = _.clone(opt.shape, { x: t.x, y: t.y, easing: false })
                    var drawShape, vs;
                    if (opt.group.animate && opt.group.easing === "none") { //动画
                        opt.shape.delay = i === 0 ? false : opt.group.animationInterval; //true
                        drawShape = self.shape(opt.shape);
                        vs = vertex.clone({ o: { x: t.x, y: t.y } });
                    } else {
                        drawShape = self.shape(opt.shape);
                        vs = drawShape.vs;
                    }

                    //半径
                    if (opt.group.showRadius) {
                        self.draw.link([po, t], opt.group);
                    }

                    //中心相连
                    if (opt.group.link) { //连接线
                        for (var j = i; j < len - 1; j++) {
                            self.draw.link([t, groups[j + 1]], opt.group);
                        }
                    }
                    //相邻连线 neighbor
                    if (opt.group.neighborLink) { //连接线
                        self.draw.link([t, groups[i + 1 === len ? 0 : i + 1]]);
                    }
                    //顶点相连
                    if (opt.group.vertexLink) {
                        var vs0, vs2;
                        if (i === 0) {
                            vsGroup.push(vs);
                        } else if (i + 1 < len) {
                            vs2 = vsGroup.pop();
                            vs.forEach(function(t, i) {
                                self.draw.link([t, vs2[i]], opt.group);
                            });
                        } else if (i + 1 === len) {
                            vsGroup.forEach(function(t2) {
                                vs.forEach(function(t, i) {
                                    self.draw.link([t, t2[i]], opt.group);
                                });

                            })
                        }
                        vsGroup.push(vs);
                    }
                    //显示圆心编号
                    if (opt.group.identifierCenter) {
                        self.draw.point({ x: t.x, y: t.y, text: i })
                    }

                    //锥线
                    if (opt.group.conic) {
                        vs.forEach(function(t) {
                            self.draw.link([po, t], opt.group);
                        });
                    }
                    return drawShape;
                });
            },
            //分形
            fractal: function(opt) {
                var self = this;
                var po = { x: opt.group.x, y: opt.group.y };
                var vertex = _.vertex(_.clone(opt.shape, po));
                var vs = vertex.vs; //组合顶点
                vs.forEach(function(t) {
                    opt.shape = _.clone(opt.shape, { x: t.x, y: t.y })
                    self.shape(opt.shape);
                });
            },
            // 锥形
            cone: function(opt) {
                var self = this;

                var groups = this.vs;
                var po = this.po;
                var len = groups.length;

                var vsGroup = [];
                groups.forEach(function(t) {
                    opt.shape = _.clone(opt.shape, { x: t.x, y: t.y })
                    var drawShape = self.shape(opt.shape);
                    var vs = drawShape.vs;
                    vs.forEach(function(s) {
                        vsGroup.push([s, po]);
                    });
                })
                this.draw.linkGroup(vsGroup, opt.shape);
            },
            //柱形
            pillar: function(opt) {
                opt.group.num = 2;
                opt.group.vertexLink = true;
                var vertex = this.vertex = _.vertex(opt.group);
                this.vs = vertex.vs;
                this.po = vertex.po;
                return this.polygon(opt);
            },
            //环形
            ring: function(opt) {
                this.shape(opt.shape);
                var r2 = opt.shape.r * 0.618; //opt.shape.rRatio;
                // opt.shape = _.clone(opt.shape, { r: r2 });
                this.shape(_.clone(opt.shape, { r: r2 }));
                // this.draw.shape(opt.shape);
                // this[shape] && this[shape](opt)


                // if (_.isObject(opt.group) && opt.group.group == "ring") {
                //     var shape = opt.shape.shape;
                //     this[shape] && this[shape](opt.shape)

                //     var r2 = opt.shape.r * opt.shape.rRatio;
                //     opt.shape = _.clone(opt.shape, { r: r2 });
                //     this[shape] && this[shape](opt)
                // } else {
                //     var opt = this.default(opt.shape);
                //     // var c = this.central();
                //     ctx.beginPath();
                //     opt.r2 = opt.r * opt.rRatio;
                //     ctx.arc(opt.x, opt.y, opt.r, 0, PIx2, false);
                //     ctx.moveTo(opt.x + opt.r2, opt.y);
                //     ctx.arc(opt.x, opt.y, opt.r2, PIx2, 0, true);
                //     ctx.closePath();
                //     this.render(opt);
                // }
                return this;
            },

            //环绕  回旋
            // 公转: revolution 自转: rotation
            surround: function(opt) {
                var self = this;
                var r = opt.shape.r;
                var rotation = opt.group.rotation; //自转
                var interval = opt.group.interval || 1; //间隔
                var spiral = opt.group.spiral; //螺旋
                var x = opt.group.x,
                    y = opt.group.y;

                var gr = opt.group.r; //环绕半径
                if (_.isUndefined(gr)) {
                    gr = r;
                    r = r / 3;
                }
                // var clockwise = opt.group.clockwise; //顺时针逆时针
                var sequence = opt.group.sequence;
                var clockwise = sequence === "clockwise" ? true : false;
                var sAngle, eAngle;

                var sa = opt.group.a || 0;

                if (clockwise) {
                    sAngle = sa + 360;
                    eAngle = sa; //0;
                    if (spiral) {
                        sAngle = sAngle * spiral;
                    }
                } else {
                    sAngle = sa; //0;
                    eAngle = sa + 360
                    if (spiral) {
                        eAngle = eAngle * spiral;
                    }
                }
                var a = sAngle;
                var animationInterval = opt.group.animationInterval || 5;
                var index = 0;
                (function _surround() {
                    if (r < 5) {
                        return
                    }
                    if (clockwise) {
                        if (a <= eAngle) {
                            return;
                        }
                        a -= interval;
                        if (spiral) { //回旋
                            r = r * a / 360 / spiral;
                        }
                    } else {
                        if (a >= eAngle) {
                            return;
                        }
                        a += interval;
                        if (spiral) { //回旋
                            r = r * (eAngle - a) / 360 / spiral;
                        }
                    }

                    if (rotation) { //自转
                        opt.shape.a = a
                    }

                    var opt2 = {
                        x: x + gr * _.sin(a),
                        y: y + gr * _.cos(a),
                        r: r
                    }
                    //颜色
                    if (opt.group.colorArr.length > index) {
                        opt2.color = opt.group.colorArr[index++];
                    }

                    opt.shape = _.clone(opt.shape, opt2);

                    self.shape(opt.shape);
                    //显示半径
                    if (opt.group.showRadius) {
                        self.draw.link([{ x: x, y: y }, { x: opt.shape.x, y: opt.shape.y }]);
                    }

                    if (opt.group.animate) { //动画
                        setTimeout(_surround, animationInterval)
                    } else {
                        _surround();
                    }
                })();


                //显示圆心
                if (opt.group.showCenter) {
                    self.draw.shape({
                        shape: "circle",
                        r: 3,
                        x: x,
                        y: y,
                        color: opt.group.colorArr[0], //_.rgb(),
                        fill: true
                    });
                }
                return self;
            },
            //同心
            concentric: function(opt) {
                var self = this;
                var r = opt.shape.r;
                var interval = opt.group.interval || 1;
                var animationInterval = opt.group.animationInterval || 5;
                (function _concentric() {
                    if (r <= 0) {
                        return;
                    }
                    opt.shape = _.clone(opt.shape, self.color(opt), { r: r });
                    self.shape(opt.shape);
                    r = r - interval;
                    if (opt.group.animate) {
                        setTimeout(_concentric, animationInterval)
                    } else {
                        _concentric();
                    }
                })();
                return self;
            },
            //外切圆
            excircle: function(opt) {
                this.shape(opt.shape);
                opt.shape = _.clone(opt.shape, { shape: "circle", text: "" })
                this.shape(opt.shape);
                return this;
            },
            //平铺
            repeat: function(opt) {
                var self = this;
                var canvas = this.canvas;
                var w = canvas.width,
                    h = canvas.height;
                var r = opt.group.interval || opt.shape.r; //间距
                var mx = w % r;
                var my = h % r;
                var animate = opt.group.animate;
                var animationInterval = opt.group.animationInterval || 5;
                var sequence = opt.group.sequence;
                var clockwise = sequence === "clockwise" ? true : false;
                // var clockwise = opt.group.clockwise;
                var rotation = opt.group.rotation; //自转
                var sa = opt.group.a || 0;


                var top = r + my / 2;
                var left = r + mx / 2;
                var right = w - r - mx / 2;
                opt.shape.y = top;
                if (clockwise) {
                    opt.shape.x = left;
                } else {
                    opt.shape.x = right;
                }
                if (rotation) { //自转
                    opt.shape.a = sa
                }
                var index = 0;
                (function _repeat() {
                    if (clockwise) {
                        if (opt.shape.x > w) {
                            return;
                        }
                        if (opt.shape.y > h) {
                            opt.shape.y = top;
                            opt.shape.x += 2 * r;
                        }
                    } else {
                        if (opt.shape.x < r) {
                            return;
                        }
                        if (opt.shape.y > h) {
                            opt.shape.y = top;
                            opt.shape.x -= 2 * r;
                        }
                    }
                    if (opt.group.colorArr.length > index) {
                        opt.shape.color = opt.group.colorArr[index++];
                    }

                    opt.shape = _.clone(opt.shape); //, self.color(opt)
                    self.shape.call(self, opt.shape);
                    opt.shape.y += 2 * r;
                    if (animate) {
                        setTimeout(_repeat, animationInterval);
                    } else {
                        _repeat()
                    }
                })();
                return self;
            },
            // 顶点变形
            transform: function() {
                var self = this;
                var speed = 1;
                var vs = this.vs;
                vs.forEach(function(t) {
                    _.extend(t, {
                        vx: (Math.random() * 2 - 1) * speed,
                        vy: (Math.random() * 2 - 1) * speed,

                    })
                });

                (function _move() {
                    vs.forEach(function(t) {
                        t.x += t.vx;
                        t.y += t.vy;
                    });
                    self.draw.clear();
                    self.polygon(self.opt)
                    setTimeout(_move, 100);
                })()
            }


            // repeatX: function(opt) {
            //     opt.group.repeatX = true;
            //     repeat(opt)
            //     // var self = this;
            //     // var opt = this.default(opt);
            //     // var canvas = this.canvas;
            //     // var w = canvas.width,
            //     //     h = canvas.height;
            //     // var shape = opt.shape;
            //     // var r = opt.interval || opt.r; //间距
            //     // var mx = w % r;
            //     // opt.x = r + mx / 2;
            //     // while (opt.x < w) {
            //     //     // shape && self[shape].call(self, opt);
            //     //     this.shape(opt);
            //     //     opt.x += 2 * r;
            //     // }
            // },
            // repeatY: function(opt) {
            //     opt.group.repeatY = true;
            //     repeat(opt)
            //     // var self = this;
            //     // var opt = this.default(opt);
            //     // var canvas = this.canvas;
            //     // var w = canvas.width,
            //     //     h = canvas.height;
            //     // var shape = opt.shape;
            //     // var r = opt.interval || opt.r; //间距
            //     // var my = h % r;
            //     // opt.y = r + my / 2;
            //     // while (opt.y < h) {
            //     //     // shape && self[shape].call(self, opt);
            //     //     this.shape(opt);
            //     //     opt.y += 2 * r;
            //     // }
            // },
        }
        _shapeGroup.prototype.init.prototype = _shapeGroup.prototype;


        //运动
        //rotate move zoom  gravitate  jiggle  float circle ellips
        //组合运动 rotate_zoom
        var _motion = _.motion = function(draw, opt) {
            return new _motion.prototype.init(draw, opt);
        }

        _motion.prototype = {
            constructor: _motion,
            init: function(draw, opt) {
                var self = this;
                this.draw = draw;
                this.motion = opt.motion.motion || "move";
                this.link = opt.motion.link;
                this.shadow = opt.motion.shadow;

                var speed = opt.motion.speed || 1,
                    zoomSpeed = opt.motion.zoomSpeed || 1,
                    num = opt.motion.num || 1,
                    colorful = opt.motion.colorful,
                    bounce = opt.motion.bounce,
                    click = opt.motion.click;


                var screenWidth = this.draw.canvas.width,
                    screenHeight = this.draw.canvas.height;


                this.groups = [];
                this.a = 0;
                this.r = opt.motion.r || 100;
                //中心点
                this.centerX = screenWidth / 2;
                this.centerY = screenHeight / 2;

                var follow = _.isUndefined(opt.motion.follow) ? true : opt.motion.follow;


                //速度随机
                var _randomV = function(t) {
                    return _.clone(t, {
                        vx: (Math.random() * 2 - 1) * speed,
                        vy: (Math.random() * 2 - 1) * speed,
                        bounce: bounce,
                        speed: speed,
                        zoomState: "in",
                        followSpeed: 0.01 + Math.random() * 0.04,
                        follow: follow,
                        click: click,
                        mass: t.r * t.r,
                        //range
                        top: 0,
                        left: 0,
                        right: screenWidth,
                        bottom: screenHeight,
                        animate: false,
                        lightState: 1,
                        zoomSpeed: zoomSpeed
                    });
                }

                if (_.isArray(opt.shape)) {
                    opt.shape.forEach(function(t) {
                        t = _randomV(t);
                        var item = draw.shape(t);
                        item.color(colorful)
                        self.groups.push(item);
                    })
                } else {
                    for (var i = 0; i < num; i++) {
                        opt.id = i;
                        var t;
                        if (opt.group) {
                            opt.group = _randomV(opt.group);
                            t = draw.group(opt);
                        } else {
                            opt.shape = _randomV(opt.shape);
                            t = draw.shape(opt.shape);
                            t.color(colorful)
                        }
                        this.groups.push(t);
                    };
                }
                this.len = this.groups.length;
                this.setup();
            },
            setup: function() {
                var self = this;
                var vsGroup = [];
                var groups = self.groups;
                var len = groups.length;
                var motion = self.motion;
                if (self.shadow) {
                    self.draw.shadow();
                } else {
                    self.draw.clear();
                }

                groups.forEach(function(t, i) {
                    motion.split("_").forEach(function(m) {
                        self[m] && self[m](t.opt);
                        self.follow(t.opt);
                    });
                    t.setup();

                    if (self.link) { //连接线，相互连接
                        for (var j = i; j < len - 1; j++) {
                            var vs;
                            var t2 = groups[j + 1];
                            if (t.opt.group) {
                                vs = [t.opt.group, t2.opt.group];
                            } else {
                                vs = [t.opt, t2.opt];
                            }
                            self.draw.link(vs);
                            // self.collide(t.opt,t2.opt);
                            //碰撞
                        }
                    }
                });
                self.draw.canvas.callback && self.draw.canvas.callback.call(self.draw.context, self.draw.context);

                if (inBrowser) {
                    self.id = requestAnimationFrame(self.setup.bind(self));
                } else {
                    self.id = setTimeout(self.setup.bind(self), 17)
                }
            },
            //停止
            stop: function() {
                if (inBrowser) {
                    this.id && cancelAnimationFrame(this.id);
                } else {
                    this.id && clearTimeout(this.id);
                }
            },
            //移动跟随 followmove
            follow: function(opt) {
                var mouse = this.draw.mouse;
                //移动中心点
                if (!!~["circle", "ellipse"].indexOf(this.motion)) { //"spiral",
                    var self = this;
                    (function(opt) {
                        if (opt.follow && mouse) { //移动跟随
                            var dx = mouse.x - self.centerX;
                            var dy = mouse.y - self.centerY;
                            self.centerX += (dx * opt.followSpeed);
                            self.centerY += (dy * opt.followSpeed);
                        } else if (opt.click && mouse) { //点击重绘
                            self.centerX = mouse.x
                            self.centerY = mouse.y
                        }
                    })(opt.group || opt)

                } else {
                    (function(opt) {
                        if (opt.follow && mouse) {
                            var dx = mouse.x - opt.x
                            var dy = mouse.y - opt.y
                            opt.x += (dx * opt.followSpeed);
                            opt.y += (dy * opt.followSpeed);
                        } else if (opt.click && mouse) {
                            opt.x = mouse.x
                            opt.y = mouse.y
                        }
                    })(opt.group || opt)
                }
            },
            //移动
            move: function(opt) {
                (function(opt) {
                    opt.x += opt.vx || 1;
                    opt.y += opt.vy || 1;
                })(opt.group || opt);
                this.bounce(opt);
            },
            //正弦函数运动公式 y = sin(x)
            sineMove: function(opt) {
                var self = this;

                (function(opt) {
                    opt.x += opt.vx > 0 ? 1 : -1;
                    opt.y += _.sin(self.a) * self.r * (opt.vy > 0 ? 1 : -1);
                    self.a += opt.speed;
                })(opt.group || opt);
                this.bounce(opt);
            },
            //反弹
            bounce: function(opt) {
                (function(opt) {
                    if (opt.bounce) { //碰壁反射 
                        if (opt.x < opt.left + opt.width) { //碰到左边的边界
                            opt.x = opt.width;
                            opt.vx = -opt.vx;
                        } else if (opt.y < opt.top + opt.height) {
                            opt.y = opt.height;
                            opt.vy = -opt.vy;
                        } else if (opt.x > opt.right - opt.width) {
                            opt.x = opt.right - opt.width;
                            opt.vx = -opt.vx;
                        } else if (opt.y > opt.bottom - opt.height) {
                            opt.y = opt.bottom - opt.height;
                            opt.vy = -opt.vy;
                        }
                    } else { //左出右进  左进右出
                        if (opt.vx < 0 && opt.x < opt.left - opt.width) { //碰到左边的边界
                            opt.x = opt.right + opt.r;
                        } else if (opt.vy < 0 && opt.y < opt.top - opt.height) {
                            opt.y = opt.bottom + opt.r;
                        } else if (opt.vx > 0 && opt.x > opt.right + opt.width) {
                            opt.x = opt.left - opt.r;
                        } else if (opt.vy > 0 && opt.y > opt.bottom + opt.height) {
                            opt.y = opt.top - opt.r;
                        }
                    }
                })(opt.group || opt);
            },
            //碰撞
            collide: function(opt1, opt2) {

                (function(opt1, opt2) {
                    var dx = opt1.x - opt2.x,
                        dy = opt1.y - opt2.y,
                        dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < opt2.r + opt1.r) {
                        //calculate angle, sine, and cosine
                        var angle = Math.atan2(dy, dx),
                            sin = Math.sin(angle),
                            cos = Math.cos(angle),
                            //rotate opt2's position
                            x0 = 0,
                            y0 = 0,
                            //rotate opt1's position
                            x1 = dx * cos + dy * sin,
                            y1 = dy * cos - dx * sin,
                            //rotate opt2's velocity
                            vx0 = opt2.vx * cos + opt2.vy * sin,
                            vy0 = opt2.vy * cos - opt2.vx * sin,
                            //rotate opt1's velocity
                            vx1 = opt1.vx * cos + opt1.vy * sin,
                            vy1 = opt1.vy * cos - opt1.vx * sin,
                            //collision reaction
                            vxTotal = vx0 - vx1;

                        vx0 = ((opt2.mass - opt1.mass) * vx0 + 2 * opt1.mass * vx1) /
                            (opt2.mass + opt1.mass);
                        vx1 = vxTotal + vx0;
                        x0 += vx0;
                        x1 += vx1;
                        //rotate positions back
                        var x0Final = x0 * cos - y0 * sin,
                            y0Final = y0 * cos + x0 * sin,
                            x1Final = x1 * cos - y1 * sin,
                            y1Final = y1 * cos + x1 * sin;
                        //adjust positions to actual screen positions
                        opt1.x = opt2.x + x1Final;
                        opt1.y = opt2.y + y1Final;
                        opt2.x = opt2.x + x0Final;
                        opt2.y = opt2.y + y0Final;
                        //rotate velocities back
                        opt2.vx = vx0 * cos - vy0 * sin;
                        opt2.vy = vy0 * cos + vx0 * sin;
                        opt1.vx = vx1 * cos - vy1 * sin;
                        opt1.vy = vy1 * cos + vx1 * sin;
                    }

                })(opt1.group || opt1, opt2.group || opt2)


            },
            //变形
            transform: function(opt) {
                (function(opt) {
                    opt.num += opt.speed;
                })(opt.group || opt)
            },
            //旋转
            rotate: function(opt) {
                (function(opt) {
                    opt.a += opt.speed;
                })(opt.group || opt)
            },
            //飘忽不定
            jiggle: function(opt) {
                (function(opt) {
                    opt.x += Math.random() * 2 - 1;
                    opt.y += Math.random() * 2 - 1;
                })(opt.group || opt)
                this.bounce(opt)
            },
            //漂浮
            float: function(opt) {
                // 负相关
                var deta = Math.random() * 2 - 1;
                (function(opt) {
                    opt.vx += deta;
                    opt.vy -= deta;
                    opt.x += opt.vx || 1;
                    opt.y += opt.vy || 1;

                })(opt.group || opt);
                this.bounce(opt)
            },
            //曲线
            curve: function(opt) {
                (function(opt) {
                    opt.x += opt.vx || 1;
                    opt.y += opt.vy || 1;
                    opt.vy += 0.01 * opt.vx * opt.vx;
                })(opt.group || opt)
                this.bounce(opt)
            },
            //重力运动 
            gravitate: function(opt) {
                (function(opt) {
                    opt.vy += 0.22; //加速下落
                    opt.vx *= 0.998; //地面摩擦
                    if (opt.y > opt.bottom - opt.height) {
                        opt.vy *= 0.96; //地面反弹减速
                    }
                    opt.bounce = true;
                })(opt.group || opt);
                this.move(opt)
            },
            //缩放
            zoom: function(opt) {
                var minR = opt.minR || 1;
                var maxR = opt.maxR || opt.right / 2;
                var speed = opt.zoomSpeed || opt.speed || 1;
                (function(opt) {
                    if (opt.r >= maxR) {
                        opt.zoomState = "out";
                    } else if (opt.r <= minR) {
                        opt.zoomState = "in";
                    }
                    if (opt.zoomState === "in") {
                        opt.r += speed
                    } else {
                        opt.r -= speed
                    }
                })(opt.group || opt);
            },
            //放大
            zoomin: function(opt) {
                (function(opt) {
                    opt.r += opt.speed || 1
                })(opt.group || opt)
            },
            //放大
            zoomout: function(opt) {
                (function(opt) {
                    opt.r -= opt.speed || 1
                })(opt.group || opt)
            },
            //绕圈
            circle: function(opt) {
                var self = this;
                (function(opt) {
                    opt.x = self.centerX + _.sin(self.a) * self.r;
                    opt.y = self.centerY + _.cos(self.a) * (self.r);
                    self.a += opt.speed * 0.1;
                })(opt.group || opt)
            },
            //螺旋
            spiral: function(opt) {
                var self = this;
                this.circle(opt);
                self.r += self.swell || 1;
                (function(opt) {
                    if (opt.x + opt.r > opt.right || opt.y + opt.r > opt.bottom) {
                        self.swell = -1;
                    } else if (self.r < 1) {
                        self.swell = 1;
                    }
                })(opt.group || opt)
            },
            //椭圆
            ellipse: function(opt) {
                var self = this;
                (function(opt) {
                    opt.x = self.centerX + Math.sin(self.a) * self.r;
                    opt.y = self.centerY + Math.cos(self.a) * (self.r) * 2;
                    self.a += opt.speed;
                })(opt.group || opt)
            },

            //发光
            light: function(opt) {
                (function(opt) {
                    if (opt.shadowBlur >= 20) {
                        self.lightState = -1

                    } else if (opt.shadowBlur <= 0) {
                        self.lightState = 1
                    }

                    opt.shadowBlur += opt.speed * self.lightState;
                })(opt.group || opt)
            },
            //跳动发光
            throbLight: function(opt) {
                var minR = opt.minR || 1;
                var maxR = opt.maxR || opt.right / 2;
                var maxShadowBlur = opt.maxShadowBlur || 10;
                var minShadowBlur = opt.minShadowBlur || 0;
                var speed = opt.speed || 1;
                var blurSpeed = speed * (maxShadowBlur - minShadowBlur) / (maxR - minR);
                (function(opt) {
                    if (opt.r >= maxR) {
                        opt.zoomState = "out";
                        opt.shadowBlur = maxShadowBlur
                    } else if (opt.r <= minR) {
                        opt.zoomState = "in";
                        opt.shadowBlur = minShadowBlur
                    }
                    if (opt.zoomState === "in") {
                        opt.r += speed;
                        opt.shadowBlur += blurSpeed
                    } else {
                        opt.r -= speed;
                        opt.shadowBlur -= blurSpeed
                    }
                })(opt.group || opt);
            }
        }
        _motion.prototype.init.prototype = _motion.prototype;


        // 解析draw.opt 文件
        var createOptCycle = _.createOptCycle = function(optJson) {
            var optCycle = {
                data: {},
                methods: {
                    autoNext: function(item, ev) {
                        if (inBrowser) {
                            var k = item.closest(".tab-body-item").attr("name");
                            var x = item.name;
                            var checked = item.checked;
                            optCycle.data[k][x].auto = checked;
                            console.log(x, checked)
                        }
                    }
                },
                filters: {
                    toggle: function(val) {
                        return val === true ? "是" : "否"
                    },
                    color: function(val) {
                        if (inBrowser)
                            return val + '<div class="colorblock" style="background-color:' + val + '"></div>';
                        return val;
                    }
                }
            };
            for (var k in optJson) {
                var o = optJson[k];
                if (_.isObject(o)) {
                    optCycle.data[k] = {};
                    for (var x in o) {
                        var val = o[x];
                        if (x === "switch") {
                            optCycle.data[k][x] = val;
                        } else {
                            var type = val.type;
                            var c = null;
                            switch (type) {
                                case "picker":
                                    c = _.cycle(val.values, val.index || 0);
                                    break;
                                case "slider":
                                    c = _.sliderCycle(val);
                                    break;
                                case "color":
                                case "color_rgba":
                                case "color_rgb":
                                    var colorArr = [],
                                        len = val.length || 15;
                                    while (len--) {
                                        if (type === "color_rgba") {
                                            colorArr.push(_.rgba());
                                        } else if (type === "color_rgb") {

                                            colorArr.push(_.rgb());
                                        } else {
                                            colorArr.push(_.color());
                                        }
                                    }
                                    c = _.cycle(colorArr, 0);
                                    break;
                                case undefined:
                                    if (_.isBoolean(val)) {
                                        c = _.cycle([{ key: true, text: "是" }, { key: false, text: "否" }], val ? 0 : 1);
                                        c.type = "toggle";
                                        c.value = val;
                                    } else if (_.isObject(val)) {
                                        if (_.isBoolean(val.value)) {
                                            c = _.cycle([{ key: true, text: "是" }, { key: false, text: "否" }], val.value ? 0 : 1)
                                            c.type = "toggle";
                                            c.value = val.value;
                                        }
                                    } else if (_.isString(val)) {
                                        optCycle.data[k][x] = val;
                                    }
                                    break;
                            }
                            if (c) {
                                if (val.text) c.text = val.text;
                                if (val.auto) c.auto = val.auto;
                                if (val.type) c.type = val.type;
                                optCycle.data[k][x] = c;
                            }
                        }
                    }
                }
            }

            //init opt
            optCycle.init = function() {
                var opt = {};
                for (var k in optCycle.data) {
                    var o = optCycle.data[k];
                    if (_.isObject(o)) {
                        if (!!~["group", "motion"].indexOf(k)) {
                            if (o.switch === "off") {
                                continue;
                            }
                        }
                        opt[k] = {};
                        for (var x in o) {
                            var val = o[x];
                            if (_.isBoolean(val)) {
                                opt[k][x] = val;
                            } else if (_.isObject(val)) {
                                if (_.isBoolean(val.value)) {
                                    opt[k][x] = val.value;
                                    if (val.auto) { //自动变值下一个
                                        val.value = !val.value;
                                    }
                                } else {
                                    opt[k][x] = _.isObject(val.val()) ? val.val().key : val.val();
                                    if (val.auto) { //自动变值下一个
                                        val.next && val.next();
                                    }
                                }
                            } else if (_.isString(val)) {
                                opt[k][x] = val;
                            }
                        }
                    }
                }
                return opt;
            }

            //view data
            optCycle.viewData = function() {
                var data = optCycle.data;
                var _viewData = { tabs: [] };
                for (var k in data) {
                    var tab = { key: k, items: [], switch: "none", active: false }; //random: [],
                    _viewData.tabs.push(tab);
                    var o = data[k];
                    if (_.isObject(o)) {
                        for (var x in o) {
                            var val = o[x];
                            if (x === "text") {
                                tab[x] = val;
                            } else if (x === "switch") {
                                tab[x] = val;
                                tab[x + "Method"] = _.camelCase("next", k, x);
                            } else if (x === "active") {
                                tab[x] = val;
                            } else {
                                var item = { key: x, value: val, text: x, id: k + "_" + x }; //method: _.camelCase("next", k, x),
                                if (_.isBoolean(val)) {
                                    item.filter = "toggle";
                                    item.value = optCycle.filters.toggle(val);
                                } else if (_.isNumber(val)) {
                                    item.filter = "string";
                                } else if (_.isObject(val)) {
                                    item = _.extendOwn(item, val);
                                    if (_.isBoolean(val.value)) {
                                        item.value = optCycle.filters.toggle(val.value);
                                    } else {
                                        if (_.isObject(val.val())) {
                                            item.value = 'text' in val.val() ? val.val().text : val.val();
                                        } else {
                                            if (!!~["color", "lineColor", "background", "shadowColor"].indexOf(item.key)) {
                                                item.value = optCycle.filters.color(val.val());
                                            } else {
                                                item.value = val.val();
                                            }
                                        }
                                    }
                                } else {
                                    item.filter = x;
                                }
                                tab.items.push(item);
                            }
                        }
                    }
                }
                return _viewData
            }
            return optCycle;
        };

        //画图 
        //基础图形组合，加动画
        var draw = _.draw = function(options, canvas) {
            return new draw.prototype.init(options, canvas);
        }
        draw.prototype = {
            constructor: draw,
            init: function(options, canvas) { // componentInstance
                var self = this;

                if (canvas) {
                    this.canvas = canvas;
                    if (inBrowser) {
                        this.context = this.canvas.getContext("2d");
                    } else {
                        this.context = canvas.context;
                    }
                } else {
                    if (inBrowser) {
                        if (options.el) {
                            var el = _.$(options.el);
                            if (el.nodeName.toLowerCase() === "canvas") {
                                this.canvas = el;
                            } else {
                                this.canvas = document.createElement("canvas");
                                el.appendChild(this.canvas);
                            }
                        } else if (options.canvasid) {
                            this.canvas = _.$("#" + options.canvasid);
                            if (this.canvas.length === 0) {
                                this.canvas = document.createElement("canvas");
                                this.canvas.id = options.canvasid;
                            }
                        } else if (options.container || options.containerid) {
                            this.container = options.container ? _.$(options.container) : options.containerid ? _.$("#" + options.containerid) : document.documentElement;
                            if (this.container.length === 0) {
                                console.log("not found container:" + options.container);
                            } else {
                                if (this.container.$("canvas").length === 0) {
                                    this.canvas = document.createElement("canvas");
                                    this.container.appendChild(this.canvas);
                                } else {
                                    this.canvas = this.container.$("canvas");
                                }
                            }
                        } else {
                            this.canvas = document.createElement("canvas");
                        }



                        this.context = this.canvas.getContext("2d");

                        var isDragging = false;
                        var startHnadler = function(item, ev) {
                            var offset = _.pos(item);
                            var pos = _.pos(ev);
                            var mouse = self.mouse = {
                                x: pos.x - offset.x,
                                y: pos.y - offset.y
                            }
                            if (self.opt) {
                                if (!self.opt.motion) {
                                    self.opt.shape.begin && self.clear();
                                    if (self.opt.shape) self.opt.shape = _.extend(self.opt.shape, { x: mouse.x, y: mouse.y });
                                    if (self.opt.group) self.opt.group = _.extend(self.opt.group, { x: mouse.x, y: mouse.y });
                                    self.setup.call(self, self.opt);
                                }
                            }
                            isDragging = true;
                        }
                        var moveHandler = function(item, ev) {
                            if (isDragging) {
                                var offset = _.pos(item);
                                var pos = _.pos(ev);
                                self.mouse = {
                                    x: pos.x - offset.x,
                                    y: pos.y - offset.y
                                }
                            }
                        }
                        var endHandler = function(item, ev) {
                            isDragging = false;

                        }

                        //事件
                        toucher([{
                            el: this.canvas,
                            type: "touchstart",
                            callback: function(item, ev) {
                                startHnadler(item, ev);
                            }
                        }, {
                            el: this.canvas,
                            type: "touchmove",
                            callback: function(item, ev) {
                                moveHandler(item, ev);
                            }
                        }, {
                            el: this.canvas,
                            type: "mousedown",
                            callback: function(item, ev) {
                                startHnadler(item, ev)
                            }
                        }, {
                            el: this.canvas,
                            type: "mousemove",
                            callback: function(item, ev) {
                                moveHandler(item, ev);
                            }
                        }, {
                            el: this.canvas,
                            type: "mouseup",
                            callback: function(item, ev) {
                                endHandler(item, ev)
                            }
                        }])
                    }
                }

                if (_.isObject(options)) {
                    this.options = options;
                    if (options.scale) this._scale = options.scale;
                    //比率
                    if (options.ratio) this.ratio(options.ratio);

                    //大小
                    ["width", "height"].forEach(function(t) {
                        if (options[t]) self.canvas[t] = options[t];
                    });


                    var bg = {};
                    [{
                            k: "color",
                            v: "background-color"
                        },
                        {
                            k: "color",
                            v: "background"
                        },
                        {
                            k: "src",
                            v: "background-image"
                        },
                        {
                            k: "size",
                            v: "background-size"
                        },
                        {
                            k: "position",
                            v: "background-position"
                        },
                        {
                            k: "repeat",
                            v: "background-repeat"
                        }
                    ].forEach(function(t) {
                        if (options[t.v]) bg[t.k] = options[t.v]
                    });
                    this.background(bg);
                    this.callback = options.callback;
                    this.queue = _queue();
                }
                return this;
            },
            //比率
            ratio: function(key) {
                var container = this.container || document.documentElement;
                var _scale = this._scale || 1;
                var w = container.clientWidth,
                    h = container.clientHeight;
                if (_.isString(key)) {
                    if (!!~key.indexOf(":")) {
                        key.replace(/(\d+):(\d+)/, function(match, x, y) {
                            h = w * y / x;
                        });
                    } else if (!isNaN(parseFloat(key))) {
                        h = w * parseFloat(key);
                    }
                } else if (_.isNumber(key)) {
                    h = w * key;
                }
                this.width = w * _scale;
                this.height = h * _scale;
                this.canvas.setAttribute('width', this.width);
                this.canvas.setAttribute('height', this.height);
                this.o = {
                    x: this.width / 2,
                    y: this.height / 2
                }
                return this;

            },
            fullscreen: function() {
                return this.ratio("fullscreen");
            },
            background: function(opt) {
                var self = this,
                    canvas = self.canvas,
                    ctx = self.context,
                    src = opt.src,
                    size = opt.size,
                    position = opt.position,
                    repeat = opt.repeat,
                    color = opt.color,
                    callback = opt.callback;


                if (color) {
                    self.setFillStyle(color);
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                src && _.loadImg(src, function(img) {
                    var imgWidth = img.width,
                        imgHeight = img.height,
                        canvasWidth = canvas.width,
                        canvasHeight = canvas.height;

                    switch (size) {
                        case "cover": //等比例缩放 盖住cover   auto原图 
                            var zoom = _.max(canvasWidth / imgWidth, canvasHeight / imgHeight),
                                newImgWidth = imgWidth * zoom,
                                newImgHeight = imgHeight * zoom;
                            if (position === 'center') {
                                var x = zoom <= 1 ? (canvasWidth - newImgWidth) / 2 : -(canvasWidth - newImgWidth) / 2,
                                    y = zoom <= 1 ? (canvasHeight - newImgHeight) / 2 : -(canvasHeight - newImgHeight) / 2;
                                ctx.drawImage(img, x, y, newImgWidth, newImgHeight);
                            } else {
                                ctx.drawImage(img, 0, 0, newImgWidth, newImgHeight);
                            }
                            break;
                        case "contain": //等比例缩放 框内contain 
                            var zoom = _.min(canvasWidth / imgWidth, canvasHeight / imgHeight),
                                newImgWidth = imgWidth * zoom,
                                newImgHeight = imgHeight * zoom;
                            if (position === 'center') {
                                var x = (canvasWidth - newImgWidth) / 2,
                                    y = (canvasHeight - newImgHeight) / 2;
                                ctx.drawImage(img, x, y, newImgWidth, newImgHeight);
                            } else {
                                ctx.drawImage(img, 0, 0, newImgWidth, newImgHeight);
                            }

                            if (repeat === "repeat") {
                                _.zipImg({
                                    img: img,
                                    zoom: zoom,
                                    callback: function() {
                                        var bg = ctx.createPattern(this, 'repeat');
                                        self.setFillStyle(bg);
                                        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                                        ctx.fill();
                                    }
                                });
                            }
                            break;
                        case "stretch": //stretch 拉伸铺满
                            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                            break;
                        case "auto":
                            ctx.drawImage(img, 0, 0);
                            break;
                        default:
                            ctx.drawImage(img, 0, 0);
                            break;
                    }

                    callback && callback();
                });
                return this;
            },
            toImage: function() {
                return this.canvas.toDataURL('image/jpeg');
            },
            toButton: function(type) {
                return this.toElement({
                    className: "btn",
                    type: type
                });
            },
            toElement: function(opt) {
                var tag = opt.tag || opt.nodeName || "div";
                var div = document.createElement(tag);
                div.className = opt.class || opt.className;
                switch (opt.type) {
                    case "img":
                        var img = document.createElement("img");
                        img.src = this.toImage();
                        div.appendChild(img);
                        break;
                    case "background":
                        div.style.backgroundImage = 'url(' + this.toImage() + ')';
                        break;
                    case "canvas":
                        var canvas = this.canvas;
                        var draw = _.draw(this.options);
                        var imgData = this.context.getImageData(0, 0, canvas.width, canvas.height);
                        draw.context.putImageData(imgData, 0, 0);
                        div.appendChild(draw.canvas);
                        break;
                    default:
                        div.appendChild(this.canvas);
                        break;
                }
                return div;
            },
            save: function() {
                this.context.save();
            },
            restore: function() {
                this.context.restore();
            },
            //样式   小程序写法 setXXX
            setFillStyle: function(color) {
                var color = _.isUndefined(color) ? "#000000" : color;
                var ctx = this.context;
                ctx.fillStyle = color;
                ctx.setFillStyle && ctx.setFillStyle(color);
            },
            setStrokeStyle: function(color) {
                var color = _.isUndefined(color) ? "#000000" : color;
                var ctx = this.context;
                ctx.strokeStyle = color;
                ctx.setStrokeStyle && ctx.setStrokeStyle(color);
            },
            setLineWidth: function(lineWidth) {
                var ctx = this.context;
                var lineWidth = _.isUndefined(lineWidth) ? 0.5 : lineWidth;
                ctx.lineWidth = lineWidth;
                ctx.setLineWidth && ctx.setLineWidth(lineWidth);
            },
            setShadowBlur: function(shadowBlur) {
                var ctx = this.context;
                var shadowBlur = _.isUndefined(shadowBlur) ? 10 : shadowBlur;
                ctx.shadowBlur = shadowBlur;
                ctx.setShadowBlur && ctx.setShadowBlur(shadowBlur);

                ctx.shadowColor = "black";
            },
            setShadowColor: function(shadowColor) {
                var ctx = this.context;
                var shadowColor = _.isUndefined(shadowColor) ? 10 : shadowColor;
                ctx.shadowColor = shadowColor;
                ctx.setShadowColor && ctx.setShadowColor(shadowColor);
            },
            // miter (默认) round (圆形) bevel (斜角)
            setLineJoin: function(lineJoin) {
                var ctx = this.context;
                var lineJoin = _.isUndefined(lineJoin) ? "miter" : lineJoin;
                ctx.lineJoin = lineJoin;
                ctx.setLineJoin && ctx.setLineJoin(lineJoin);
            },
            fill: function(opt) {
                var ctx = this.context;
                if (opt) {
                    if (opt.randomColor) {
                        opt.color = _.rgba();
                    }
                    if (opt.fill) {
                        opt.shadowBlur && this.setShadowBlur(opt.shadowBlur);
                        opt.shadowColor && this.setShadowColor(opt.shadowColor);
                        this.setFillStyle(opt.color);
                        ctx.fill();
                    }
                }
                return this
            },
            stroke: function(opt) {
                var ctx = this.context;
                if (opt) {
                    if (opt.lineWidth == 0) {
                        return this;
                    } else {
                        this.setLineJoin(opt.lineJoin);
                        this.setLineWidth(opt.lineWidth);
                        if (opt.randomColor) {
                            opt.color = _.rgb();
                        }
                        this.setStrokeStyle(opt.lineColor || opt.color);
                        ctx.stroke();
                    }

                } else {
                    ctx.stroke();
                }
                return this;
            },
            render: function(opt) {
                return this.fill(opt).stroke(opt);
            },
            //图形闭合
            closePath: function(opt) {
                var ctx = this.context;
                if (opt) {
                    var closed = _.isUndefined(opt.closed) ? true : opt.closed;
                    if (closed) ctx.closePath();
                } else {
                    ctx.closePath();
                }
                return this;
            },
            //新开画布
            beginPath: function(opt) {
                var ctx = this.context;
                if (opt) {
                    var begin = _.isUndefined(opt.begin) ? true : opt.begin;
                    if (begin) ctx.beginPath();
                } else {
                    ctx.beginPath();
                }
                return this;
            },
            shadow: function() {
                var canvas = this.canvas,
                    ctx = this.context,
                    bg = this.opt.motion.background,
                    color = 'rgba(0,0,0,0.05)';
                if (bg) color = _.colorRgb(bg, 0.05);

                //光影效果
                this.setFillStyle(color);
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                return this;
            },
            clear: function(color) {
                var canvas = this.canvas,
                    ctx = this.context;
                if (color) {
                    //ctx.fillStyle = 'rgba(0,0,0,0.05)'; //光影效果
                    this.setFillStyle(color || this.options.background || "#ffffff");
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                return this;
            },
            //中心点
            central: function() {
                return {
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2
                }
            },
            //默认参数
            default: function(opt) {
                var self = this;
                if (opt) {
                    if (_.isArray(opt)) {
                        return opt.map(function(t) {
                            return _.clone(self.default(), t);
                        })
                    } else {
                        return _.clone(this.default(), opt);
                    }

                } else {
                    return {
                        x: this.canvas.width / 2,
                        y: this.canvas.height / 2,
                        r: 10,
                        color: _.color()
                    }
                }
            },
            //短参数 映射
            shortName: function(opt) {
                opt && [{ k: "n", v: "num" },
                    { k: "s", v: "shape" },
                    { k: "showR", v: "showRadius" },
                    { k: "showV", v: "showVertices" },
                    { k: "showC", v: "showCenter" },
                    { k: "showEC", v: "showExcircle" },
                    { k: "showIC", v: "showIncircle" },
                    { k: "showD", v: "showDiagonal" },
                    { k: "showM", v: "showMirror" },
                ].forEach(function(t) {
                    if (!_.isUndefined(opt[t.k])) opt[t.v] = opt[t.k];
                });
                return opt;
            },
            //虚线  todo
            // dashLine: function(p1, p2) {

            //     var k = (p2.y - p1.y) / (p2.x - p1.x) //斜率k     正 负 0  
            //     var b = p1.y - k * p1.x //常数b 

            //     var step = 10
            //     // var xi = x1 + i;
            //     // var yi = k * xi + b;

            //     //      var xj=x1+i+1     //控制步长决定绘制的是虚线还是实线  
            //     // var yj=k*xj+b;  


            // },
            //连线
            link: function(vs, opt) {
                var self = this;
                var ctx = this.context;
                this.beginPath(opt);
                if (opt && opt.dashed) {
                    //虚线
                    var len = vs.length;
                    vs.forEach(function(t, i) {
                        var t2 = vs[i + 1 === len ? 0 : i + 1];
                        var d = t.dist(t2);
                        var ps = t.split(t2, Math.floor(d / 5));
                        ps.unshift(t);
                        ps.push(t2);
                        ps.forEach(function(t, i) {
                            if (i % 2 === 0) {
                                ctx.moveTo(t.x, t.y);
                            } else {
                                ctx.lineTo(t.x, t.y);
                            }
                        })
                    })
                } else {
                    //实线
                    vs.forEach(function(t, i) {
                        if (t) {
                            if (i === 0) {
                                ctx.moveTo(t.x, t.y);
                            } else {
                                ctx.lineTo(t.x, t.y);
                            }
                        }
                    })
                }

                self.closePath(opt);
                self.render(opt);

                if (opt) {
                    //显示外切圆
                    if (opt.showExcircle) this.excircle(opt);
                    //显示内切圆
                    if (opt.showIncircle) this.incircle(opt);
                    //显示半径
                    if (opt.showRadius) this.radius(vs, opt);
                    //显示顶点
                    if (opt.showVertices || opt.identifierVertices) this.vertices(vs, opt);
                    //显示圆心
                    if (opt.showCenter) this.centerPoint(opt)
                    //对角线
                    if (opt.showDiagonal) this.diagonal(vs, opt)
                    //间隔填色
                    if (opt.fillInterval) this.zebra(vs, opt);
                    //顶点镜像
                    if (opt.showMirror) this.mirror(vs, opt);
                }
                return this;
            },
            // 外切圆
            excircle: function(opt) {
                return this.shape(_.clone(opt, { shape: "circle", text: "" }));
            },
            //内切圆
            incircle: function(opt) {
                var r = opt.r * _.cos(180 / opt.num);
                return this.shape(_.clone(opt, { shape: "circle", r: r, text: "" }));
            },
            //旁切圆
            escribedcircle: function(opt) {

            },
            //则该三角形内切圆圆心坐标：
            // [ax1+bx2+cx3] / [a+b+c]， [ay1+by2+cy3] / [a+b+c]
            //半径 r=s/p  s=p(p-a)(p-b)([-c])^1/2
            // incircle: function(opt) {
            //     // var vs = this.vertices(opt);
            //     // var num=3,d=[],p=0;
            //     // for (var i = 0; i < num; i++) {
            //     //     d[i]=this.dist(vs[i],vs[i>=num?0:i+1]);
            //     //     p +=d[i];
            //     // }
            //     // p=p/2;
            // },
            //半径
            radius: function(vs, opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y;
                ctx.beginPath();
                vs.forEach(function(t) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(t.x, t.y)
                })
                this.render(opt);
            },
            //顶点
            vertices: function(vs, opt) {
                var _shape = self.shape();
                var verticesColor = _.rgb();

                var animate = opt.animate,
                    animationInterval = opt.animationInterval || 200;

                vs.forEach(function(t, i) {
                    t.fill = true;
                    if (opt.identifierVertices) {
                        t.r = 10
                        t.text = i + 1;
                        t.color = "rgba(0,0,0,0.2)"
                    } else {
                        t.color = verticesColor;
                        t.r = 3;
                    }
                    if (animate) {
                        setTimeout(function() {
                            _shape.circle(t);
                        }, animationInterval * i)
                    } else {
                        _shape.circle(t);
                    }
                });

            },
            //圆心
            centerPoint: function(opt) {
                return this.shape().circle({
                    r: 3,
                    x: opt.x,
                    y: opt.y,
                    color: _.rgb(), //verticesColor,
                    fill: true
                });
            },
            //对角线
            diagonal: function(vs, opt) {
                var vs = vs || this.vertices(opt);
                var vsGroup = [];
                var len = vs.length;
                for (var i = 0; i < len - 2; i++) {
                    for (var j = i + 2; j < len; j++) {
                        if (!(i === 0 && j === len - 1)) {
                            vsGroup.push([vs[i], vs[j]]);
                        }
                    }
                }
                return this.linkGroup(vsGroup, _.clone(opt, { showVertices: false }));
                // return this.draw.link(vs, opt);
            },
            //间隔填色
            zebra: function(vs, opt) {
                var vs = vs || this.vertices(opt);
                var x = opt.x,
                    y = opt.y;
                var vsGroup = _.slice(vs, 2).map(function(t) {
                    return t.concat([{ x: x, y: y }])
                })
                return this.linkGroup(vsGroup, _.clone(opt, { fill: true, showVertices: false, showExcircle: false, fillInterval: false }));
                // return this.draw.link(vs, opt);
            },
            //顶点镜像
            mirror: function(vs, opt) {
                var self = this;
                // var vsGroup = [];
                // var vs = vs || this.vertices(opt);
                // vs.forEach(function(t) {
                //     var vs2 = []
                //     vs.forEach(function(t2) {
                //         t2.mirror && vs2.push(t2.mirror(t));
                //     })
                //     vsGroup.push(vs2);
                // });
                // this.linkGroup(vsGroup, _.clone(opt, { showMirror: false }));



                var vertex = _.vertex(opt)
                var po = vertex.po;
                vs.forEach(function(t, i) {
                    var o = po.mirror(t);
                    self.shape(_.clone(opt, { x: o.x, y: o.y, a: o.a + 180, showMirror: false }));
                })


            },

            linkGroup: function(vsGroup, opt) {
                var self = this;
                // console.log("图形个数：" + vsGroup.length)
                // var result = {
                //     num: vsGroup.length
                // }
                // self.callback && self.callback(result);
                if (opt && opt.animate) { //动画
                    _.extend(opt, { animate: false })
                    var animationInterval = opt.animationInterval || 0;
                    vsGroup.forEach(function(t, i) {
                        setTimeout(function() {
                            self.link(t, opt);
                        }, animationInterval * i);
                    })
                } else {
                    vsGroup.forEach(function(t) {
                        self.link(t, opt)
                    })
                }
                return self;
            },
            //打点
            point: function(opt) {
                return this.shape(_.clone({
                    s: "circle",
                    r: 6,
                    color: "rgba(0,0,0,0.2)",
                    fill: true,
                }, opt))
            },
            //图形
            shape: function(opt) {
                var self = this;
                if (_.isArray(opt)) return opt.map(function(t) {
                    return self.shape(t)
                });

                opt = self.shortName(opt);
                opt = self.default(opt);
                if (opt.animate && opt.easing) {
                    _tween({
                        start: { x: opt.x, y: 0, a: opt.a - 180 },
                        to: { x: opt.x, y: opt.y, a: opt.a },
                        duration: opt.animationInterval || 2000,
                        type: opt.easing, //动画类型
                        callback: function(o) {
                            self.clear();
                            self.shape(_.clone(opt, o, { easing: false }));
                        }
                    });
                }
                if (opt.delay) { //延迟动画
                    return self.queue.delay(function() {
                        self.shape(_.clone(opt, { delay: false }));
                    }, opt.delay)
                }
                var s = _.shape(self, opt);
                if (opt.disappear) {
                    this.disappear(opt);
                }
                return s;
            },
            //图形组合
            group: function(opt) {
                var t;
                if (opt.group) {
                    opt.group = this.shortName(opt.group);
                    opt.group = this.default(opt.group);

                    if (opt.group.animate && opt.group.easing && opt.group.easing !== "none") {
                        _tween({
                            start: { r: opt.group.r + 100, a: opt.group.a - 180 },
                            to: { r: opt.group.r, a: opt.group.a },
                            duration: opt.group.animationInterval || 2000,
                            type: opt.group.easing, //动画类型
                            callback: function(o) {
                                _.extend(opt.group, o, { easing: false }); //{ x: o.x, y: o.y,a }
                                self.clear();
                                t = _shapeGroup(self, opt);
                            }
                        });
                    } else {
                        t = _shapeGroup(this, opt);
                    }
                } else {
                    t = this.shape(opt.shape);
                }
                this.canvas.callback && this.canvas.callback.call(this.context, this.context);

                return t;
            },
            //运动
            motion: function(opt) {
                var self = this;
                opt.motion = this.shortName(opt.motion);

                //模拟鼠标点击，改变位置
                var _randomMouse = function() {
                    self.mouse = {
                        x: self.canvas.width * Math.random(),
                        y: self.canvas.height * Math.random()
                    }
                    self.mouseTimmer = setTimeout(_randomMouse, opt.motion.simulateInterval || 1000)
                }
                self.mouseTimmer && clearTimeout(self.mouseTimmer);
                opt.motion.simulate && _randomMouse();
                return _motion(this, opt);
            },
            setup: function(opt) {
                self = this;
                if (_.isArray(opt)) return opt.map(function(t) {
                    return self.setup.call(self, t);
                });

                this.opt = opt;
                this.motionCache && this.motionCache.stop();
                if (opt.motion) return this.motionCache = this.motion(opt);
                return this.group(opt);
            },
            stop: function() {
                this.motionCache && this.motionCache.stop();
            },
            verticesGroup: function(opt) {
                var self = this;
                var vs = self.vertices(opt.group);
                return vs.map(function(t) {
                    return self.vertices(_.clone(opt.shape, { x: t.x, y: t.y }));
                })
            },

            //于Canvas(画布)的translate(平移)、scale(缩放) 、rotate(旋转) 、skew(错切)

            //离散顶点 discrete  离散数列 discrete series
            //平移  translation 平移点阵 translational lattice;
            //canvas.translate() － 画布的平移：
            translate: function(opt, dx, dy) {
                var opt = this.default(opt);
                var vs = [];
                var interval = opt.interval || 10; //步距离
                var step = opt.step || 1; //步数
                var direction = opt.direction || 0; //平移方向
                var x = opt.x,
                    y = opt.y;
                var po = _.pointPolar({
                    o: {
                        x: opt.x,
                        y: opt.y
                    }
                })
                for (var i = 0; i < step; i++) {
                    var p = po.clone({
                        r: interval,
                        a: direction
                    });
                    vs.push(p);
                }
                return vs;
            },
            // translateX: function(opt, tx) {

            // },
            // translateY: function(opt, ty) {

            // },
            // //相似图形 ， 变大小
            // scale: function() {
            //     //context.scale(scalewidth,scaleheight);

            // },

            //格子
            grid: function(opt) {
                var canvas = this.canvas;
                var opt = this.default(opt);
                var interval = opt.interval || 10;
                var vsGroup = [];
                for (var i = interval + 0.5; i < canvas.width; i += interval) {
                    var vs = [];
                    vs.push({ x: i, y: 0 })
                    vs.push({ x: i, y: canvas.height });
                    vsGroup.push(vs);
                }
                for (var i = interval + 0.5; i < canvas.height; i += interval) {
                    var vs = [];
                    vs.push({ x: 0, y: i })
                    vs.push({ x: canvas.width, y: i });
                    vsGroup.push(vs);
                }
                return this.linkGroup(vsGroup, opt);
            },

            // 反转颜色
            reverse: function() {
                var canvas = this.canvas;
                var ctx = this.context;
                var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                for (var i = 0; i < imgData.data.length; i += 4) {
                    imgData.data[i] = 255 - imgData.data[i];
                    imgData.data[i + 1] = 255 - imgData.data[i + 1];
                    imgData.data[i + 2] = 255 - imgData.data[i + 2];
                    imgData.data[i + 3] = 255;
                }
                ctx.putImageData(imgData, 0, 0);
            },
            //粒子
            getPixels: function() {
                var canvas = this.canvas;
                var ctx = this.context;
                var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                var cols = 100,
                    rows = 100;
                var s_width = parseInt(imgData.width / cols);
                var s_heihgt = parseInt(imgData.height / rows);

                console.log(imgData.data.length)
                var ps = []
                for (var i = 0; i < cols; i++) { //imgData.width
                    for (var j = 0; j < rows; j++) { //imgData.height
                        var pos = j * s_heihgt * imgData.width + i * s_width
                        var r = imgData.data[pos * 4],
                            g = imgData.data[pos * 4 + 1],
                            b = imgData.data[pos * 4 + 2],
                            a = imgData.data[pos * 4 + 3], //alpha 通道 (0-255; 0 是透明的，255 是完全可见的)
                            x = i * s_width, //+ (Math.random() - 0.5) * 20,
                            y = j * s_heihgt; //+ (Math.random() - 0.5) * 20,
                        var color = "rgba(" + [r, g, b, Math.round(10 * a / 255) / 10].join(",") + ")";
                        if (a > 10) {
                            var p1 = _.point({
                                x: x,
                                y: y,
                                color: color,
                                r: 1
                            })
                            ps.push(p1)
                        }
                    }
                }
                return ps;
            },
            //粒子消散 particle
            disappear: function(opt) {
                var self = this;
                var time = opt.disappear || 1000;
                var dots = this.getPixels();
                var timeout;
                var _disappear = function() {
                    self.clear();
                    dots.forEach(function(t) {
                        self.point(t.move());
                    });
                    timeout = setTimeout(_disappear, 17)
                };
                setTimeout(function() {
                    _disappear();
                }, time);
                setTimeout(function() {
                    self.clear();
                    timeout && clearTimeout(timeout)
                }, time + 10000);
            }
        }
        draw.prototype.init.prototype = draw.prototype;



        //多线程 任务
        var tasker = _.tasker = function(options) {
            return new tasker.prototype.init(options);
        }
        tasker.prototype = {
            constructor: tasker,
            init: function(options) {
                // this.name = options.name;
                var file = options.file;
                var data = this.data = options.data; //参数
                var callback = options.callback;
                if (typeof(Worker) !== "undefined") {
                    if (typeof(this.w) === "undefined") {
                        this.w = new Worker(file);
                    }
                    this.w.addEventListener('message', function(event) {
                        //e.data为从worker线程得到的数据
                        console.log(event.data)
                        callback && callback(event.data);
                    });
                }
                return this;
            },
            open: function(name, cfg) {
                this.w.postMessage({ name: name, act: "open", cfg: _.clone(this.data, cfg) });
                console.log("task open: " + name);
                return this;
            },
            close: function(name) {
                this.w.postMessage({ name: name, act: "close" })
                console.log("task close: " + name);
                return this;
            }
        }
        tasker.prototype.init.prototype = tasker.prototype;


        //页面滚动  todo 兼容性有问题
        var scroller = _.scroller = function(options) {
            return new scroller.prototype.init(options);
        }
        scroller.prototype = {
            constructor: scroller,
            init: function(options) {
                var self = this;

                if (options) {

                    var _scroll = function() {
                        toucher({
                            el: self.el, //document
                            type: "scroll",
                            callback: function() {
                                self.onScroll && self.onScroll.call(self.el);
                            }
                        })
                    }
                    self.root = document.body;
                    if (_.isObject(options)) {
                        self.el = options.el ? _.query(options.el) : self.root;
                        self.onTop = options.onTop;
                        self.onBottom = options.onBottom;
                        self.onScroll = options.onScroll;
                    } else if (_.isString(options)) {
                        self.el = _.query(options);
                    } else if (_.isFunction(options)) {
                        self.el = self.root;
                        self.onScroll = options;
                    }
                    self.onScroll && _scroll();
                } else {
                    self.el = self.root;
                }
                self.isRoot = !!~["HTMLHtmlElement", "HTMLBodyElement", 'htmldocument'].map(function(t) {
                    return t.toLowerCase();
                }).indexOf(_.type(self.el));

                if (self.isRoot) {
                    self.scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                } else {
                    self.scrollTop = self.el.scrollTop
                }


            },
            toView: function(el) {
                el = _.query(el) || this.el;
                el.scrollIntoView(); //只有此方法不会导致button的灵魂出窍
                //scroolTop=scrollHeight 和 scrollTo(0,h) //会导致 button失效，位置不对
            },
            atTop: function() { //到顶 reach the top
                return this.el.scrollTop === 0;
            },
            atBottom: function() { //到底
                if (this.isRoot) {
                    return this.el.scrollTop + this.el.clientHeight === this.el.offsetHeight;
                } else {
                    return this.el.scrollTop + this.el.clientHeight === this.el.scrollHeight;
                }
            },

            toTop: function(callback) {
                this.el.scrollTop = 0;
                callback && callback.call(this.el);
            },
            toBottom: function(callback) {
                var self = this;
                this.el.scrollTop = this.el.scrollHeight;
                callback && callback.call(this.el);
            },
            scrollpage: function(direction, distance) { //方向  距离
                var self = this;
                var step = distance || 10;
                self.timer && clearTimeout(self.timer);
                self.srollerTimer && clearTimeout(self.srollerTimer);
                switch (direction) {
                    case "up":

                        self.el.scrollTop -= step;
                        break;
                    case "down":
                        self.el.scrollTop += step;
                        break;
                }
                if (!distance) {
                    self.timer = setTimeout(function() {
                        self.scrollpage.call(self, direction)
                    }, 17);
                }
            },
            to: function(x, y) {
                window.scrollTo(x, y);
            },
            up: function(distance) {
                this.scrollpage.call(this, "up", distance);
            },
            down: function(distance) {
                this.scrollpage.call(this, "down", distance);
            },
            stop: function() {
                this.timer && clearTimeout(this.timer);
            }
        }
        scroller.prototype.init.prototype = scroller.prototype;


        //路由  todo
        // router({
        //     config:[{name:'',url:'#',template:'#tpl_id'}],
        //     pageAppend:function(){

        //     },
        //     defaultPage:"home"
        // })
        //router({"markdown":"markdown"})
        var router = _.router = function(options) {
            return new router.prototype.init(options);
        }

        router.prototype = {
            constructor: router,
            // $container: $('#container'),
            pageStack: [],
            configs: [],
            pageAppend: function() {},
            defaultPage: null,
            pageIndex: 1,

            routes: {},
            defaultAction: "home",

            init: function(options) {
                var self = this;


                if (options) {

                    this.routes = options;
                }

                addEvent("hashchange", window, function() {
                    var u = self.parseUrl();
                    self._go(u.route);

                })




                if (history.state && history.state.pageIndex) {
                    this.pageIndex = history.state.pageIndex;
                }

                this.pageIndex--;

                var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
                var page = self._find('url', url) || self.defaultPage;
                this._go(page);
                return this;

            },
            getAction: function(route) {
                return this.routes[route] ? this.routes[route] : this.defaultAction;


            },
            ////////
            getSearch: function() {
                var match = location.href.replace(/#.*/, '').match(/\?.+/);
                return match ? match[0] : '';
            },

            // Gets the true hash value. Cannot use location.hash directly due to bug
            // in Firefox where location.hash will always be decoded.
            getHash: function() {
                var match = location.href.match(/#(.*)$/);
                return match ? match[1] : '';
            },
            decodeFragment: function(fragment) {
                return decodeURI(fragment.replace(/%25/g, '%2525'));
            },
            getPath: function() {
                var path = this.decodeFragment(
                    location.pathname + this.getSearch()
                ).slice(0); //this.root.length - 1
                return path.charAt(0) === '/' ? path.slice(1) : path;
            },
            parseUrl: function() {
                var params = {},
                    href = location.href,
                    hash = location.hash,
                    route = hash;

                var getHash = function() {
                    var match = location.href.match(/#(.*)$/);
                    return match ? match[1] : '';
                };
                var path = this.getPath();

                hash = getHash();
                // api.html?id=3&page=fff#events
                // api.html#events?id=3&page=fff
                // api.html#events/1122
                href.replace(/[?&](.+?)=([^&#]*)/g, function(_, k, v) {
                    params[k] = decodeURI(v)
                });
                //#去重
                if (hash) {
                    hash = hash.length > 1 ? hash.replace(/#+/g, "#") : "";
                    route = hash.replace(/#/g, "");
                }
                return {
                    params: params,
                    hash: hash,
                    route: route,
                    path: path
                }
            },

            ////
            push: function(config) {
                this.configs.push(config);
                return this;
            },
            go: function(to) {

                if (to) {
                    location.hash = to;
                }
            },
            _go: function(route) {
                this.pageIndex++;
                history.replaceState && history.replaceState({ pageIndex: this.pageIndex }, '', location.href);
                var a = this.getAction(route);

                if (_.isFunction(a)) {
                    a.call(this);
                } else {
                    console.log(a)
                }
                console.log(this.pageIndex);
            },
            back: function() {
                history.back();
            },
            _back: function(config) {
                this.pageIndex--;
                var stack = this.pageStack.pop();
                if (!stack) {
                    return;
                }
                var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
                var found = this._findInStack(url);
                if (!found) {
                    var $html = _.$(config.template).addClass('js_show').addClass(config.name);
                    $html.insertBefore(stack.dom);
                    if (!config.isBind) {
                        this._bind(config);
                    }
                    this.pageStack.push({
                        config: config,
                        dom: $html
                    });
                }
                return this;
            },
            _findInStack: function(url) {
                var found = null;
                for (var i = 0, len = this.pageStack.length; i < len; i++) {
                    var stack = this.pageStack[i];
                    if (stack.config.url === url) {
                        found = stack;
                        break;
                    }
                }
                return found;
            },
            _find: function(key, value) {
                var page = null;
                for (var i = 0, len = this.configs.length; i < len; i++) {
                    if (this.configs[i][key] === value) {
                        page = this.configs[i];
                        break;
                    }
                }
                if (!page) {
                    var page = { "template": value, id: value, url: value };
                    page[key] = value;
                    this.push(page)
                }
                return page;
            },
            _bind: function(page) {
                var events = page.events || {};
                for (var t in events) {
                    for (var type in events[t]) {
                        // this.$container.on(type, t, events[t][type]);
                    }
                }
                page.isBind = true;
            }
        };
        router.prototype.init.prototype = router.prototype;



        //标准过滤器
        var StandardFilters = {
            string: function(val) {
                if (_.isArray(val) || _.isObject(val)) val = _.stringify(val); // val = JSON.stringify(val);
                return val;
            },
            //数组第一个
            first: function(val) {
                if (_.isArray(val)) val = val[0];
                return val;
            },
            last: function(val) {
                if (_.isArray(val)) val = val[val.length - 1];
                return val;
            },
            pre: function(val) {
                return _.preHtml(val);
            },
            //取整 四舍五入
            int: function(val) {
                return _.isNumber(Number(val)) ? Math.round(Number(val)) : val;
            },
            number: function(val) {
                return Number(val);
            },
            wan: function(val) {
                return Number(val) > 10000 ? (Number(val) / 10000).toFixed(1) + "万" : val;
            },
            fixed: function(val) {
                return Number(val).toFixed(1);
            },
            cent: function(val) {
                return (Number(val) / 100).toFixed(2);
            },
            percent: function(val) {
                return Math.ceil(val * 100) + "%";
            },
            yearmonth: function(val) {
                return (new Date(Number(val))).format("YYYY年MM月");
            },
            monthdaytime: function(val) {
                return (new Date(Number(val))).format("MM月DD日 HH:mm");
            },
            datetime: function(val) {
                return (new Date(Number(val))).format("YYYY-MM-DD HH:mm");
            },
            date: function(val) {
                return (new Date(Number(val))).format("YYYY-MM-DD");
            },
            time: function(val) {
                return (new Date(Number(val))).format("HH:mm");
            },
            //默认头像
            avatar: function(val) {
                return val ? ' style="background-image: url(' + val + ');"' : ''
            },

            file: function(val) {
                ////文件加载  ajax加载 "/comein-files/" + val.substr(val.indexOf('Detail'), val.length)
                return "<div data-file='" + val + "'></div>";
            },
            text: function(val) {
                return _.escape(val)
            },
        };
        ["markdown", "escape", "unescape"].forEach(function(t) {
            StandardFilters[t] = function(val) {
                return _[t](val);
            }
        });
        ['round', 'ceil', 'floor'].forEach(function(t) {
            StandardFilters[t] = function(val) {
                return _.isNumber(Number(val)) ? Math[t](Number(val)) : val;
            }
        });
        //调用过滤器 
        var callFilter = function(val, filter, data) {
            if (filter) {
                var self = this,
                    _callFilter = function(val, filterName, data) {
                        var _filter = customFilters[filterName];
                        if (_.isUndefined(_filter)) {
                            return val
                        } else if (_.isFunction(_filter)) {
                            val = _filter.call(self, val, data);
                        } else {
                            try {
                                var fn = new Function("return (" + _filter + ".call(this,arguments[0]));");
                                val = fn.call(self, val, data);
                            } catch (e) {
                                console.log(e);
                                try {
                                    var fn = new Function("data", "return (" + _filter + ");");
                                    val = fn.call(self, val, data);
                                } catch (e) {
                                    console.log(e);
                                    val = _filter;
                                }
                            }
                        }
                        return val;
                    };

                var fs = ("" + filter).split(","),
                    len = fs.length;
                if (len > 0 && fs[len - 1] !== "string") { fs.push("string"); }
                fs.forEach(function(t) {
                    val = _callFilter.call(self, val, t, data);
                });
            }
            return val;
        };

        //preModel 预处理
        // <div model="name">this is a  model </div>
        //<div model="name">{=name} </div>
        var regModel = /<[^>]+?model=\"(.*?)\".*?(>.*?<)\/[^>]+?>/gi
        var regbind = /<[^>]+?bind=\"(.*?)\".*?(>.*?<)\/[^>]+?>/gi
        var preModel = function(tpl) {
            var matcher = new RegExp([
                regModel.source,
                regbind.source,
            ].join('|') + '|$', 'gi');

            return tpl.replace(matcher, function(match, name, text, name2, text2) {
                name = name || name2;
                text = text || text2;
                return match.replace(text, ">{=" + name + "}<");
            })
        };

        //解析模板标签
        //{=name|filter}  /{=(.*?)(?:\|(.*?))?}/g
        var parseTag = _.parseTag = function(tpl, data) {
            var self = this;
            return tpl.replace(reg_tpl_tag, function(match, name, filter) {
                name = name.trim();
                filter = (filter || "string").trim();
                var val = "";
                try {
                    if (filter.indexOf("$") === 0) { //filter map
                        filter = eval("data." + filter.replace("$", ""));
                    }
                    if ("$index" === name.toLowerCase()) {
                        return $index++;
                    } else if ("$length" === name.toLowerCase()) {
                        return $length;
                    } else if ("$this" === name.toLowerCase()) {
                        val = data;
                    } else if (reg_operation_symbol.test(name)) {
                        val = data.cmd(name);
                    } else {
                        val = _.getVal(data, name);
                    }
                } catch (e) {
                    console.log(e, data);
                }
                if (_.isUndefined(val)) val = "";
                return val = callFilter.call(self, val, filter, data);
            })
        };
        //解析模板
        //tpl, data, syntax, groupTpl, lazyTpl, moreTpl, defaultTpl, loop
        var parseTpl = _.parseTpl = function(cfg) {
            var self = cfg || this,
                tpl = self.tpl || getTpl(self.template),
                groupTpl = self.groupTpl,
                lazyTpl = self.lazyTpl,
                moreTpl = self.moreTpl,
                defaultTpl = self.defaultTpl,
                loop = self.loop,
                syntax = self.syntax,
                data = self.data;

            if (_.isEmpty(tpl) && _.isEmpty(groupTpl)) return "";

            tpl && (function() {
                tpl = preModel(tpl);
            })();

            $index = 1;
            var str = "";
            if (_.isUndefined(data)) {
                $length = 0;
                str = _.isUndefined(defaultTpl) ? tpl : defaultTpl;
            } else if (_.isArray(data)) {
                var $length = data.length;

                var loopNumber = Number(loop) || $length; //循环次数 NaN
                if ((moreTpl || lazyTpl) && loopNumber >= $length) loopNumber = 3;

                var ps = [],
                    lastGroup = "",
                    currGroup = "";

                for (var i = 0; i < $length; i++) {
                    var item = data[i];

                    !_.isUndefined(groupTpl) && (function() { //分组模板
                        currGroup = parseTag.call(self, groupTpl, item);
                        if (currGroup !== lastGroup) {
                            ps.push(currGroup);
                        }
                        lastGroup = currGroup;
                    })();

                    if (i >= loopNumber) {
                        if (!_.isUndefined(moreTpl)) { //更多模板
                            ps.push(parseTag.call(self, moreTpl, item));
                            break;
                        }

                        if (!_.isUndefined(lazyTpl)) { //懒加载
                            ps.push(parseTag.call(self, lazyTpl, item));
                        } else {
                            break;
                        }
                    } else {
                        if (tpl) { //模板
                            ps.push(parseTag.call(self, tpl, item));
                        }
                    }
                }
                str = ps.join('');
            } else if (_.isObject(data)) {
                $length = 1;
                tpl && (function() {
                    str = parseTag.call(self, tpl, data)
                })();
            } else {
                $length = 1;
                str = tpl;
            }
            var syntax = syntax || customSyntax;
            switch (syntax) {
                case "markdown":
                    str = _.markdown(str);
                    break;
                case "pre":
                    str = _.preHtml(str);
                    break;
                default:
                    break
            }
            return str;
        };

        //根据名称取得tpl
        var getTpl = _.getTpl = function(tplId) {
            if (tplId) {
                var _tpl = _.query(tplId.pound());
                return _tpl && _tpl.length > 0 ? _.text(_tpl).trim() : null;
            }
            return null;
        }
        //elment的tpl
        var elTpl = function(name) {
            var tpl, id;
            if (_.hasAttr.call(this, name)) {
                id = this.attr(name);
                if (id === "this" || _.isEmpty(id)) {
                    tpl = _.html(this).trim();
                } else {
                    tpl = getTpl(id)
                }
            }
            return tpl;
        };

        //act : append html before 模板替换动作  默认是 html，模板内都替换
        //解析节点
        var parseEl = function() {
            var self = this,
                tpl, syntax, groupTpl, lazyTpl, moreTpl, defaultTpl, loop,
                el = self.el,
                data = self.data,
                act = self.act,
                keyword = self.keyword;
            self.tpl = self.template || elTpl.call(el, TEMPLATE);
            [GROUP, LAZY, MORE, DEFAULT].forEach(function(t) {
                if (self.templates && !_.isUndefined(self.templates[t])) {
                    self[t + "Tpl"] = self.templates[t];
                } else {
                    self[t + "Tpl"] = elTpl.call(el, t);
                }
            });
            if (self.tpl) {
                loop = "auto";
            } else if (self.groupTpl) {

            } else {
                tpl = el.html();
                loop = "1"; //非模板不循环
                if (!reg_tpl_tag.test(tpl)) {
                    parseDirective.call(self, el, data);
                    return false;
                }
            }
            if (_.hasAttr.call(el, SYNTAX)) syntax = el.attr(SYNTAX);
            if (_.hasAttr.call(el, NOLOOP)) loop = "1"; //数组不循环
            if (_.hasAttr.call(el, LOOP)) loop = el.attr(LOOP);
            if (_.hasAttr.call(el, PAGESIZE)) loop = el.attr(PAGESIZE); //分页
            if (_.hasAttr.call(el, DATA)) { //指定数据子对象
                var child = el.attr(DATA);
                if (_.has(data, child)) data = eval("data." + child);
            }
            if (_.isArray(data)) { //数组
                if (keyword && _.hasAttr.call(el, KEYWORD)) { //关键字查询
                    var name = el.attr(KEYWORD);
                    data = _.filter(data, function(item) {
                        var ks = name.split(",")
                        if (ks.length === 1) {
                            return _.has(_.getVal(item, name), keyword);
                        } else {
                            var flag = false;
                            ks.forEach(function(name) {
                                if (_.has(_.getVal(item, name), keyword)) flag = true;
                            });
                            return flag;
                        }

                    });
                }
            }

            //计算长度
            if (_.isArray(data)) {
                $length = data.length
            } else if (_.isUndefined(data)) {
                $length = 0;
            } else if (_.isObject(data)) {
                $length = 1;
            } else {
                $length = 1;
            }

            var tplConfig = _.clone(self, {
                data: data,
                loop: loop,
                syntax: syntax,
            });
            var str = parseTpl.call(tplConfig);
            switch (act) {
                case "append":
                    //兼容性处理
                    // el = el.parentNode.lastElementChild || el.parentNode.lastChild;
                    str = el.html() + str;
                    break;
                case "before":
                    str += el.html();
                default:
                    break;
            }
            //如果tpl不是外部命名，区块dom内的html不需要重置,意味着之前通过dom操作获取的节点，在模板解析后还可以用。
            if (self.tpl || el.attr(TEMPLATE) || el.attr(GROUP)) {
                el.html(str);
            }
            parseDirective.call(self, el, data);
        };

        //标准指令
        var StandardDirectives = {};

        //指令解析
        var parseDirective = function(elem, data) {
            var self = this,
                elemModel = elem.query(MODEL.brackets());
            var onHandler = function(item, ev) {
                if (_.isElement(this)) {
                    var name = this.attr(ON),
                        method = self.methods[name]; //每个独立methods
                    method && _.isFunction(method) && method.call(self, this, ev);
                }
            };

            var dragHandler = function() {
                console.log("dragHandler");

            }
            StandardDirectives[ON] = onHandler;

            var type;
            _.each(StandardDirectives, function(fn, key) {
                if (key === DRAG) {
                    type = DRAG;
                } else {
                    type = TAP;
                }
                var el = _.$(key.brackets(elem));

                if (ON !== key) {
                    var customHandler = function(item, ev) {
                        var method = self.methods["_on_" + key];
                        if (method && _.isFunction(method)) {
                            method.call(self, item, ev);
                        }
                    }
                    toucher({
                        el: el,
                        type: type,
                        clear: true,
                        listener: customHandler
                    });

                } else {
                    toucher({
                        el: el,
                        type: type,
                        clear: true,
                        listener: fn
                    });
                }
            });

            //双向数据绑定
            elemModel && elemModel.length > 0 && elemModel.each(function(item, index) {
                var name = this.attr(MODEL),
                    v = _.query(this).val();
                template.prototype[name] = v
                var _result = _.clone(template.prototype);
                Object.defineProperty(template.prototype, name, {
                    set: function(newVal) { //监控数据被修改
                        var oldVal = _result[name];
                        _result[name] = newVal;

                        if (newVal !== oldVal) {
                            template.prototype.apply(name, newVal);
                        }
                    },
                    get: function() {
                        return _result[name];

                    },
                    enumerable: true,
                    configurable: true
                });
            });

            //model change 数据绑定
            elemModel && elemModel.length > 0 && elemModel.on("keyup", function() {
                var v = _.query(this).val(),
                    name = this.attr(MODEL);
                elem.query(MODEL.brackets()).html(v);
                console.log(v, name);

                template.prototype[name] = v;
            });
        };

        //模板构造函数 
        function template(options) {
            return new template.prototype.init(options);
        }
        template.prototype = {
            constructor: template,
            init: function(options) {
                var self = this,
                    args = Array.prototype.slice.call(arguments),
                    len = args.length;
                self.methods = {};

                switch (len) {
                    case 0:
                        if (_.isEmpty(self.el)) return;
                        break;
                    case 1:
                        if (_.isArray(options)) {
                            return options.map(function(t) {
                                return template(t)
                            })
                        } else if (_.isObject(options)) {
                            _.each(options, function(v, k) {
                                switch (k) {
                                    case "el":
                                        self.el = options.el;
                                        if (_.isString(self.el)) self.el = _.query(self.selector = self.el);
                                        if (_.isJQuery(self.el)) self.el = _.jqToEl(self.el, _.autoid);
                                        if (_.isElement(self.el) || _.isArray(self.el) && _.size(self.el) > 0) {
                                            rootEl = self.el;
                                        } else {
                                            console.log("not query el" + options.el)
                                            self.el = document.createElement("div");
                                            self.el.id = options.el.replace("#", "");
                                            if (options.template) {
                                                self.el.setAttribute("template", options.template.replace("#", ""))
                                            }
                                            if (options.container) {
                                                _.query(options.container).appendChild(self.el);
                                            } else {
                                                document.body.appendChild(self.el);
                                            }
                                            return false;
                                        }
                                        break;
                                    case "data":
                                        self.data = _.isFunction(options.data) ? options.data() : options.data;

                                        if (_.isObject(self.data) || _.isArray(self.data)) {

                                            // try {
                                            //     console.log(self.data);
                                            //     var _result = _.clone(self.data);
                                            //     _.keys(self.data).forEach(function(key) {
                                            //         Object.defineProperty(self.data, key, {
                                            //             set: function(newVal) { //监控数据被修改
                                            //                 // var value=x;
                                            //                 console.log(_result[key], key);
                                            //                 var oldVal = _result[key];
                                            //                 console.log(self.data);
                                            //                 console.log("oldVal=" + oldVal);
                                            //                 _result[key] = newVal;
                                            //                 // result[key] = newVal;
                                            //                 console.log("newVal=" + newVal);
                                            //                 if (newVal != oldVal) {
                                            //                     self.apply(key, newVal);
                                            //                 }
                                            //             },
                                            //             get: function() {
                                            //                 console.log(_result[key], key);
                                            //                 return _result[key];
                                            //             },
                                            //             enumerable: true,
                                            //             configurable: true
                                            //         });

                                            //     })
                                            // } catch (e) {
                                            //     console.log(e);

                                            // }

                                        } else {
                                            self.data = {};
                                        }
                                        break;
                                    case "syntax":
                                        self.syntax = customSyntax = options.syntax;
                                        break;
                                    case "methods":
                                        self.methods = _.clone(customMethods, v);
                                        break;
                                    default:
                                        self[k] = v;
                                        break;
                                }
                            });
                        }
                        break;
                    default:
                        throw new Error("invalid options ,formate should be likes: {el:el,data:data}");
                        break;
                }


                customFilters = _.clone(StandardFilters, self.filters);
                _.extend(StandardDirectives, self.directives);
                // self = _.extend({ methods: {} }, self)
                _.each(self.directives, function(fn, key) {
                    self.methods["_on_" + key] = fn;
                })
                options = _.extend(options, { el: self.el, methods: self.methods });
                //before render
                _.isFunction(self.before) && self.before.call(self, self.data);
                var el = self.el;
                if (self.act === "cloneBefore") {
                    var cloneEl = _.autoid(self.el.cloneNode(true), true);
                    self.el.parentNode.insertBefore(cloneEl, self.el);
                    options.act = "";
                    el = options.el = cloneEl;
                }
                if (self.act === "cloneAfter") {
                    var cloneEl = _.autoid(self.el.cloneNode(true), true);
                    self.el.parentNode.appendChild(cloneEl, self.el);
                    options.act = "";
                    el = options.el = cloneEl;
                }
                if (_.isElement(el)) {
                    self.parser.call(options, el);
                } else if (_.isArray(el) && _.size(el) > 0) {
                    el.forEach(function(t) {
                        self.parser.call(_.clone(options, { el: t }), t);
                    });
                }
                //render ok
                _.isFunction(self.callback) && self.callback.call(options, self.data);

                //事件代理
                if (self.events) {
                    if (_.isFunction(self.events)) {
                        toucher({
                            el: el,
                            type: "tap",
                            clear: true,
                            listener: self.events
                        })
                    } else if (_.isObject(self.events)) {
                        var tp = [];
                        for (x in self.events) {
                            tp.push({
                                el: el,
                                type: x,
                                listener: self.events[x]
                            })
                        }
                        toucher(tp);
                    }
                }
            },
            parser: function(el) {
                var self = this;
                if (self.template || _.hasAttr.call(el, TEMPLATE) || _.hasAttr.call(el, GROUP)) {
                    parseEl.call(self);
                } else {
                    // parseEl.call(templateConfig); //self
                    //只解析[template][group]标签下的模板语言
                    var ts = el.query(TEMPLATE.brackets(), GROUP.brackets());
                    // _.isArray(ts) && ts.forEach(function(t) {
                    //     parseEl.call(_.clone(self, { el: t }));
                    // })
                    _.size(ts) > 0 && ts.each(function(item, index) {
                        parseEl.call(_.clone(self, { el: item }));
                    });

                }
            },
            //同步数据 [model]
            apply: function(key, value) {
                var self = this;
                var _kv = function(k, v) {
                    return k + "='" + v + "'";
                }
                var arr = [];
                arr.push(_kv(MODEL, key).brackets());
                arr.push(_kv(BIND, key).brackets());
                var selector = arr.join(","); //"[" + MODEL + "='" + key + "'],[" + BIND + "='" + key + "']"
                rootEl.query(selector).each(function(item, index) {
                    console.log(this.tagName, item);
                    switch (this.tagName.toLowerCase()) {
                        case "div":
                            _.query(this).html(value)
                            break;
                        case "input":
                            _.query(this).val(value)
                            break;
                    }
                });
            }
        };
        //继承工具
        _.extend(template.prototype, _);
        template.prototype.init.prototype = template.prototype;
        if (inBrowser) {
            //兼容 underscore
            if (!window._) { window._ = _; }
            window.tpler = _.tpler;
            window.toucher = _.toucher;
            window.walker = _.walker;
            window.router = _.router;
        }
        return template;
    }));