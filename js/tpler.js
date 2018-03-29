//一个js开发框架
//template.event.canvas
//兼容小程序
//v0.4.20180327
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
        var reg_tpl_tag = /{=(.*?)(?:\|(.*?))?}/g;
        var reg_operation_symbol = /[\+|\-|\*|\/|\(|\)]+/g; //支持 加减乘除括号  operation symbol
        var rootEl, $index = 1,
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

        var isSupportTouch = (function() {
            if (inBrowser) {
                try {
                    document.createEvent("TouchEvent");
                    return true;
                } catch (e) {
                    // console.log(e);
                    return false;
                }
            } else {
                return false;
            }
        })();

        var extend = function(obj) {
            var args = Array.prototype.slice.call(arguments),
                len = args.length;
            for (var i = 1; i < len; i++) {
                var source = args[i];
                if (source) {
                    for (var prop in source) { //include functions in prototype
                        obj[prop] = source[prop];
                    }
                }
            }
            return obj;
        };

        var extendMe = function(obj) {
            var args = Array.prototype.slice.call(arguments),
                len = args.length;
            for (var i = 1; i < len; i++) {
                var source = args[i];
                if (source) {
                    for (var prop in source) { //only properties in this object
                        if (Object.prototype.hasOwnProperty.call(source, prop))
                            obj[prop] = source[prop];
                    }
                }
            }
            return obj;
        };

        // var _createClass = function() {
        //     function defineProperties(target, props) {
        //         for (var i = 0; i < props.length; i++) {
        //             var descriptor = props[i];
        //             descriptor.enumerable = descriptor.enumerable || false;
        //             descriptor.configurable = true;
        //             if ("value" in descriptor) descriptor.writable = true;
        //             Object.defineProperty(target, descriptor.key, descriptor);
        //         }
        //     }
        //     return function(Constructor, protoProps, staticProps) {
        //         if (protoProps) defineProperties(Constructor.prototype, protoProps);
        //         if (staticProps) defineProperties(Constructor, staticProps);
        //         return Constructor;
        //     };
        // }();



        var env = (function() {
            var os = {};
            if (inBrowser) {
                var ua = navigator.userAgent,
                    android = ua.match(/(Android)[\s\/]+([\d\.]+)/),
                    ios = ua.match(/(iPad|iPhone|iPod)\s+OS\s([\d_\.]+)/),
                    wp = ua.match(/(Windows\s+Phone)\s([\d\.]+)/),
                    isWebkit = /WebKit\/[\d.]+/i.test(ua),
                    isSafari = ios ? (navigator.standalone ? isWebkit : (/Safari/i.test(ua) && !/CriOS/i.test(ua) && !/MQQBrowser/i.test(ua))) : false;
                if (android) {
                    os.android = true;
                    os.version = android[2];
                }
                if (ios) {
                    os.ios = true;
                    os.version = ios[2].replace(/_/g, '.');
                    os.ios7 = /^7/.test(os.version);
                    os.ios11 = /^11/.test(os.version);
                    if (ios[1] === 'iPad') {
                        os.ipad = true;
                    } else if (ios[1] === 'iPhone') {
                        os.iphone = true;
                        // os.iphone5 = screen.height == 568;
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
            }
            return os;
        })();


        var UA, isIE, isIE9, isEdge, isAndroid, isIOS, isChrome, weixin, envt, screen = { x: 100, y: 100 };
        if (inBrowser) {
            UA = inBrowser && window.navigator.userAgent.toLowerCase();
            isIE = UA && /msie|trident/.test(UA);
            isIE9 = UA && UA.indexOf('msie 9.0') > 0;
            isEdge = UA && UA.indexOf('edge/') > 0;
            isAndroid = UA && UA.indexOf('android') > 0;
            isIOS = UA && /iphone|ipad|ipod|ios/.test(UA);
            isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
            weixin = UA && UA.toLowerCase().match(/MicroMessenger/i) == "micromessenger";
            envt = extend(env, {
                inBrowser: inBrowser,
                UA: UA,
                isIE: isIE,
                isIE9: isIE9,
                isEdge: isEdge,
                isAndroid: isAndroid,
                isIOS: isIOS,
                isChrome: isChrome,
                weixin: weixin
            });
            screen = {
                x: inBrowser ? document.documentElement.clientWidth : 100,
                y: inBrowser ? document.documentElement.clientHeight : 100
            };

        }


        function TimeCom(dateValue) {
            var newCom;
            if (dateValue == "") {
                newCom = new Date();
            } else {
                newCom = new Date(dateValue);
            }
            this.year = newCom.getFullYear();
            this.month = newCom.getMonth() + 1;
            this.day = newCom.getDate();
            this.hour = newCom.getHours();
            this.minute = newCom.getMinutes();
            this.second = newCom.getSeconds();
            this.msecond = newCom.getMilliseconds();
            this.week = newCom.getDay();
        }


        var _ = {
            envt: envt,
            extend: extend,
            extendMe: extendMe,
            screen: screen,

            toDate: function(str) {
                if (/^\d*$/.test(str)) {
                    return new Date(Number(str));
                } else if (_.isString(str)) {
                    return new Date(Date.parse(str.replace(/-/g, "/")));
                }
                return str;
            },
            dateAdd: function(interval, number, date) {
                var date;
                if (_.isString(date)) {
                    date = _.toDate(date)
                } else {
                    date = new Date(date);
                }
                switch (interval.toLowerCase()) {
                    case "y":
                    case "year":
                        return new Date(date.setFullYear(date.getFullYear() + number));
                    case "m":
                    case "month":
                        return new Date(date.setMonth(date.getMonth() + number));
                    case "d":
                    case "day":
                        return new Date(date.setDate(date.getDate() + number));
                    case "w":
                    case "week":
                        return new Date(date.setDate(date.getDate() + 7 * number));
                    case "h":
                    case "hour":
                        return new Date(date.setHours(date.getHours() + number));
                    case "n":
                    case "min":
                    case "minute":
                        return new Date(date.setMinutes(date.getMinutes() + number));
                    case "s":
                    case "second":
                        return new Date(date.setSeconds(date.getSeconds() + number));
                    case "l":
                    case "ms":
                    case "msecond":
                        return new Date(date.setMilliseconds(date.getMilliseconds() + number));
                }
            },
            dateDiff: function(interval, date1, date2) {
                var TimeCom1 = new TimeCom(date1);
                var TimeCom2 = new TimeCom(date2);
                var result;
                switch (String(interval).toLowerCase()) {
                    case "y":
                    case "year":
                        result = TimeCom1.year - TimeCom2.year;
                        break;
                    case "m":
                    case "month":
                        result = (TimeCom1.year - TimeCom2.year) * 12 + (TimeCom1.month - TimeCom2.month);
                        break;
                    case "d":
                    case "day":
                        result = Math.round((Date.UTC(TimeCom1.year, TimeCom1.month - 1, TimeCom1.day) - Date.UTC(TimeCom2.year, TimeCom2.month - 1, TimeCom2.day)) / (1000 * 60 * 60 * 24));
                        break;
                    case "h":
                    case "hour":
                        result = Math.round((Date.UTC(TimeCom1.year, TimeCom1.month - 1, TimeCom1.day, TimeCom1.hour) - Date.UTC(TimeCom2.year, TimeCom2.month - 1, TimeCom2.day, TimeCom2.hour)) / (1000 * 60 * 60));
                        break;
                    case "n":
                    case "min":
                    case "minute":
                        result = Math.round((Date.UTC(TimeCom1.year, TimeCom1.month - 1, TimeCom1.day, TimeCom1.hour, TimeCom1.minute) - Date.UTC(TimeCom2.year, TimeCom2.month - 1, TimeCom2.day, TimeCom2.hour, TimeCom2.minute)) / (1000 * 60));
                        break;
                    case "s":
                    case "second":
                        result = Math.round((Date.UTC(TimeCom1.year, TimeCom1.month - 1, TimeCom1.day, TimeCom1.hour, TimeCom1.minute, TimeCom1.second) - Date.UTC(TimeCom2.year, TimeCom2.month - 1, TimeCom2.day, TimeCom2.hour, TimeCom2.minute, TimeCom2.second)) / 1000);
                        break;
                    case "l":
                    case "ms":
                    case "msecond":
                        result = Date.UTC(TimeCom1.year, TimeCom1.month - 1, TimeCom1.day, TimeCom1.hour, TimeCom1.minute, TimeCom1.second, TimeCom1.msecond) - Date.UTC(TimeCom2.year, TimeCom2.month - 1, TimeCom2.day, TimeCom2.hour, TimeCom2.minute, TimeCom2.second, TimeCom1.msecond);
                        break;
                    case "w":
                    case "week":
                        result = Math.round((Date.UTC(TimeCom1.year, TimeCom1.month - 1, TimeCom1.day) - Date.UTC(TimeCom2.year, TimeCom2.month - 1, TimeCom2.day)) / (1000 * 60 * 60 * 24)) % 7;
                        break;
                    default:
                        result = "invalid";
                }
                return (result);

            },
            timeFormat: function(time) {
                if (typeof time !== 'number' || time < 0) {
                    return time;
                }
                var hour = parseInt(time / 3600);
                time = time % 3600;
                var minute = parseInt(time / 60);
                time = time % 60;
                // 这里秒钟也取整
                var second = parseInt(time);

                return ([hour, minute, second]).map(function(n) {
                    n = n.toString();
                    return n[1] ? n : '0' + n;
                }).join(':');
            },
            //一年中的第几周
            week: function(dateStr) {
                var totalDays = 0;
                var d = _.toDate(dateStr); //new Date();
                if (!d) return "";
                var years = d.getFullYear();
                var days = new Array(12);
                days[0] = 31;
                days[2] = 31;
                days[3] = 30;
                days[4] = 31;
                days[5] = 30;
                days[6] = 31;
                days[7] = 31;
                days[8] = 30;
                days[9] = 31;
                days[10] = 30;
                days[11] = 31;

                //判断是否为闰年，针对2月的天数进行计算
                if (Math.round(d.getFullYear() / 4) == d.getFullYear() / 4) {
                    days[1] = 29
                } else {
                    days[1] = 28
                }

                if (d.getMonth() == 0) {
                    totalDays = totalDays + d.getDate();
                } else {
                    var curMonth = d.getMonth();
                    for (var count = 1; count <= curMonth; count++) {
                        totalDays = totalDays + days[count - 1];
                    }
                    totalDays = totalDays + d.getDate();
                }
                //得到第几周
                var result = Math.round(totalDays / 7);
                return result;
            },
            month: function(dateStr) {
                var d = _.toDate(dateStr);
                return d ? d.getMonth() : "";
            },
            text: function(obj) {
                //HTMLScriptElement.text  是一个属性，故用此方法
                if (_.isElement(obj)) {
                    return obj.innerText;
                }
            },
            html: function(obj) {
                if (_.isElement(obj)) {
                    return obj.innerHTML;
                }
            },
            fast: function() {
                var _run = function(fn, index, times) {
                    var t1, t2;
                    t1 = (new Date()).getTime();
                    for (var i = 1; i <= times; i++) {
                        fn.call(this);
                    }
                    t2 = (new Date()).getTime();
                    console.log("fn {" + fn.name + "} _run " + times + " times ,last: " + (t2 - t1) + "ms")
                    return t2 - t1;
                }
                var args = Array.prototype.slice.call(arguments),
                    last = args.pop(),
                    times = 10000;
                if (_.isNumber(last)) {
                    times = last;
                } else {
                    args.push(last);
                }
                for (var i = 0; i < args.length; i++) {
                    args[i] && _run.call(this, args[i], i, times);
                }
            },
            //数组相等
            //对象相等
            equal: function(a, b) {
                if (a === b) {
                    return true;
                } else if (_.isArray(a) && _.isArray(b)) {
                    return a.toString() == b.toString();
                } else if (_.isObject(a) && _.isObject(b)) {
                    if (Object.keys(a).length != Object.keys(b).length) {
                        return false
                    }
                    for (var k in a) {
                        if (!_.equal(a[k], b[k])) {
                            return false
                        }
                    }
                    return true;
                } else if (_.type(a) == _.type(b)) {
                    return a == b;
                }
                return false;
            },
            //位置信息 支持事件 和Element
            pos: function(e, offset) {
                function Postion(x, y, el) {
                    if (_.isDocument(el)) {
                        el = document.doctype ? window.document.documentElement : document.body;
                    }
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
                } else if (_.isObject(offset) && "Postion" == _.objectName(offset)) { // offset.__proto__.constructor.name ==
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
                    var el = _.query(e);
                    return _.pos(el)
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
            autoid: function(ele, force) {
                var _autoid = function(ele) {
                    if (_.isDocument(ele)) {
                        return ele;
                    }
                    if (_.isElement(ele)) {
                        if (force) {
                            ele.setAttribute("id", _.random());
                        } else {
                            if (_.isEmpty(ele.id)) {
                                ele.setAttribute("id", _.random());
                            }
                        }
                    }
                    return ele;
                };

                if (_.isArray(ele)) {
                    var arr = [];
                    ele.forEach(function(t) {
                        arr.push(_autoid(t));
                    });
                    return arr;
                } else {
                    return _autoid(ele);
                }
            },
            //Array.prototype.find已经存在，所以使用query
            //返回结果
            //找不到 返回  []，与 closest addclass removeclass等统一[] ，方便链式写
            //找到数组 [el]，长度为1的时，返回 el  ，方便 siblings链式
            query: function(selector) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) {
                    selector = args.join(",")
                }
                if (_.isWindow(selector) || _.isDocument(selector)) {
                    return selector;
                }
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
                    var result = [];
                    selector.forEach(function(item) {
                        result.push(_.query(item));
                    });
                    return result;
                } else if (_.isJQuery(selector)) { //兼容JQuery
                    if (selector.length == 1) {
                        return selector.get(0);
                    } else {
                        var result = [];
                        for (var i = 0; i < selector.length; i++) {
                            result.push(selector.get(i));
                        }
                        return result;
                    }
                } else {
                    selector = _selectorFn.call(this, selector);
                }

                try {
                    var eles = document.querySelectorAll(selector),
                        args = Array.prototype.slice.call(eles),
                        len = args.length;

                    if (len == 0) {
                        return [];
                    } else if (len == 1) {
                        return _.autoid(args[0]);
                    } else if (len > 1) {
                        return _.autoid(args);
                    }

                } catch (e) {
                    console.log(e);
                    //jQuery特有表达式 :filter
                    var arr = selector.split(":");
                    if (arr.length > 1) {
                        return _.query(arr[0]).filter(arr[1]);
                    }
                    return [];
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
                if (_.isEmpty(str)) {
                    return {}
                }
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
                if (len > 1) {
                    return _.capitalize.call(this, args);
                }
                if (_.isArray(word)) {
                    var arr = [];
                    word.forEach(function(t) {
                        arr.push(_.capitalize(t));
                    })
                    return arr;
                }
                return word.substring(0, 1).toUpperCase() + word.substring(1);
            },
            //驼峰命名
            camelCase: function(word) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) {
                    return args[0] + _.capitalize(args.slice(1)).join("");
                }
                if (_.isArray(word)) {
                    return word[0] + _.capitalize(word.slice(1)).join("");
                }
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
                if (selection.rangeCount > 0) selection.removeAllRanges();
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
            //代替 JSON.stringify()
            stringify: function(obj, ownProperty) {
                var sb = [],
                    str = "",
                    k, v;
                if (_.isUndefined(obj)) {
                    str = "undefined";
                } else if (_.isBoolean(obj)) {
                    str = obj ? "true" : "false"
                } else if (_.isString(obj)) {
                    str = "\"" + obj + "\""
                } else if (_.isNumber(obj)) {
                    str = obj;
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
                    obj.forEach(function(t) {
                        sb.push(_.stringify(t));
                    })
                    str = "[" + sb.join(",") + "]";
                } else if (_.isMouseEvent(obj)) {
                    str = "MouseEvent";
                    str += "(" + _.stringify(obj.target) + ")"
                } else if (_.isTouchEvent(obj)) {
                    str = "TouchEvent";
                    str += "(" + _.stringify(obj.target) + ")"
                } else if (_.isNull(obj)) {
                    str += "null";
                } else if (typeof obj == "object") {
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
                    str = "{" + sb.join("") + "}";
                } else if (_.isInfinity(obj)) {
                    str = "Infinity";
                } else {
                    str = "unknowtype";
                }
                return str;
            },
            //符合格式的json字符串
            toJSONString: function(json) {
                if (_.isObject(json)) {
                    return JSON.stringify(json);
                } else {
                    return json;
                }
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
                    if (i == n) {
                        return Math.random() * 80 << 0;
                    } else {
                        return t * Math.random() << 0;
                    }
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
                if (r * g * b == 1) {
                    arr = arr.map(function(t) {
                        return Math.floor(Math.random() * 255);
                    });
                } else if (r + g + b == 0) {
                    var t = Math.floor(Math.random() * 255);
                    arr = [t, t, t];
                } else {
                    var rgb = 155;
                    var c = Math.floor(Math.random() * (255 - rgb) + rgb);
                    arr = arr.map(function(t) {
                        return t == 1 ? (Math.floor(Math.random() * (255 - rgb) + rgb)) : (Math.floor(Math.random() * (c / 2)));
                    });
                }
                arr.push(a);
                return "rgba(" + arr.join(",") + ")";
            },
            // hex2rgb
            colorRgb: function(color) {
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
                    return "RGB(" + sColorChange.join(",") + ")";
                } else {
                    return sColor;
                }

                // if (hex.length == 4) {
                //     hex = hex.replace(/^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/, function(m, r, g, b) {
                //         return "#" + [r, g, b].map(function(t) {
                //             return "" + t + t;
                //         }).join("");
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
                        if (hex === "0") {
                            hex += hex;
                        }
                        strHex += hex;
                    }
                    if (strHex.length !== 7) {
                        strHex = color;
                    }
                    return strHex;
                } else if (reg.test(color)) {
                    var aNum = color.replace(/#/, "").split("");
                    if (aNum.length === 6) {
                        return color;
                    } else if (aNum.length === 3) {
                        var numHex = "#";
                        for (var i = 0; i < aNum.length; i += 1) {
                            numHex += (aNum[i] + aNum[i]);
                        }
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

                var _star = function(tag, options) {
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
                    return text ? _star(tag, options) + text + _end(tag) : _star(tag, options);
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
                if (_.isJQuery(elem)) {
                    elem = elem.get(0);
                }
                if (_.isElement(elem)) {
                    // return _.contains(elem.className.split(" "), cls);
                    return elem.className.split(" ").indexOf(cls) != -1
                } else {
                    return false;
                }
            },
            addClass: function(cls) {
                var elem = this;
                var clsArr = Array.prototype.slice.call(arguments);
                if (clsArr.length == 1 && cls) {
                    clsArr = cls.split(" ");
                }

                var _addClass = function() {
                    var elem = this;
                    if (_.isString(elem)) {
                        elem = _.query(elem);
                    }

                    if (_.isElement(elem)) {
                        elem.className = _.uniq(elem.className.split(" ").concat(clsArr)).join(" "); //允许一次加多个样式
                    } else if (_.isJQuery(elem)) {
                        elem.addClass(cls); //兼容jquery
                    } else if (_.isArray(elem)) {
                        _.each(elem, function(item) {
                            _addClass.call(item); //递归调用
                        });
                    }
                }
                _addClass.call(elem);
                if (_.isArray(elem)) {
                    var len = elem.length;
                    if (len == 0) {
                        // return null;
                        return [];
                    } else if (len == 1) {
                        elem = elem[0];
                    }
                }
                return elem;
            },
            removeClass: function(cls) {
                var elem = this;
                var clsArr = Array.prototype.slice.call(arguments);
                if (clsArr.length == 1 && cls) {
                    clsArr = cls.split(" ");
                }
                if (clsArr.length > 1) {
                    clsArr.forEach(function(t) {
                        _.removeClass.call(elem, t)
                    })
                }
                var _removeClass = function() {
                    var elem = this;
                    if (_.isString(elem)) {
                        elem = _.query(elem);
                    }

                    if (_.isElement(elem)) {
                        if (elem.hasClass(cls)) {
                            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                            elem.className = elem.className.replace(reg, ' ').trim();
                        }
                    } else if (_.isJQuery(elem)) {
                        elem.removeClass(cls); //兼容jquery
                    } else if (_.isArray(elem)) {
                        _.each(elem, function(item) {
                            _removeClass.call(item, cls); //递归调用
                        });
                    }
                }
                _removeClass.call(elem);
                if (_.isArray(elem)) {
                    var len = elem.length;
                    if (len == 0) {
                        return [];
                    } else if (len == 1) {
                        elem = elem[0];
                    }
                }
                return elem;
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
                if (len == 2 && _.isArray(arr) && _.isNumber(size)) {
                    var result = [];
                    for (var x = 0; x < Math.ceil(arr.length / size); x++) {
                        var start = x * size;
                        var end = start + size;
                        result.push(arr.slice(start, end));
                    }
                    return result;
                }
                return len == 0 ? null : len == 1 ? args[0] : args;
            },
            //判断是否有属性
            hasAttr: function(elem, attr) {
                if (_.isElement(elem)) {
                    return !_.isNull(elem.getAttribute(attr));
                } else if (_.isJQuery(elem)) {
                    return typeof(elem.attr(attr)) != "undefined";
                } else if (_.isString(elem)) {
                    elem = _.query(elem);
                    return _.hasAttr(elem, attr)
                } else {
                    return false;
                }
            },
            //for in 可以遍历扩展原型  hasOwnProperty只会原生的
            has: function(obj, key) {
                var _has = function(k) {
                    return Object.prototype.hasOwnProperty.call(this, k)
                }
                if (_.isObject(obj)) {
                    var ks = key.split(".");
                    var len = ks.length;
                    if (len == 1) {
                        return _has.call(obj, key);
                    } else {
                        var o = obj;
                        for (var i = 0; i < len; i++) {
                            var k = ks.shift().trim();
                            if (_has.call(o, k)) {
                                try {
                                    o = o[k];
                                } catch (e) {
                                    // console.log(e);
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        }
                        return true;
                    }
                } else if (_.isArray(obj) || _.isString(obj)) {
                    return obj.indexOf(key) != -1;
                } else if (_.isUndefined(obj) || _.isUndefined(key)) {
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
            //对象类名
            objectName: function(obj) {
                return _.isUndefined(obj) ? _.isUndefined(obj) : _.isNull(obj) ? _.isNull(obj) : obj.prototype.constructor ? obj.prototype.constructor.name : obj.__proto__.constructor.name
            },

            //类型
            type: function(o) {
                // handle null in old IE
                if (o === null) {
                    return 'null';
                }
                // handle DOM elements
                var s = Object.prototype.toString.call(o);
                var t = s.match(/\[object (.*?)\]/)[1].toLowerCase();
                // handle NaN and Infinity
                if (t === 'number') {
                    if (isNaN(o)) {
                        return 'nan';
                    }
                    if (!isFinite(o)) {
                        return 'infinity';
                    }
                }
                return t;
            },
            isElement: function(o) {
                if (o && (o.nodeType === 1 || o.nodeType === 9)) {
                    return true
                }
                return false;
            },
            isDocument: function(o) {
                if (o && o.nodeName && o.nodeType === 9) { //&& o.nodeName == "#document"
                    return true;
                }
                return false;
            },
            isImage: function(o) {
                return _.type(o) == "htmlimageelement";
            },
            isCanvas: function(o) {
                return _.type(o) == "htmlcanvaselement";
            },
            //图片状态
            isImgLoad: function(img) {
                return isIE ? img.readyState == 'complete' : img.complete;
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
            isJQuery: function(o) {
                if (o) {
                    return !!(o.jquery);
                }
                return false;
            },


            keys: function(obj) {
                if (!_.isObject(obj)) return [];
                if (Object.keys) return Object.keys(obj);
                var keys = [];
                for (var key in obj)
                    if (_.has(obj, key)) keys.push(key);
                return keys;
            },

            each: function(obj, iterator, context) {
                if (obj == null) return obj;
                if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
                    obj.forEach(iterator, context);
                } else if (obj.length === +obj.length) {
                    for (var i = 0, length = obj.length; i < length; i++) {
                        if (iterator.call(context, obj[i], i, obj) === {}) return;
                    }
                } else {
                    var keys = _.keys(obj);
                    for (var i = 0, length = keys.length; i < length; i++) {
                        if (iterator.call(context, obj[keys[i]], keys[i], obj) === {}) return;
                    }
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
                if (Array.prototype.indexOf && obj.indexOf === Array.prototype.indexOf) return obj.indexOf(target) != -1;
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
                if (len > 1) {
                    array = args;
                }
                //多维数组转一维
                var ta = _.isArray(array) ? array.join(",").split(",") : array.split(",");
                //去非数字
                for (var i = 0; i < ta.length; i++) {
                    if (ta[i] == "") {
                        ta.splice(i, 1);
                        i--;
                    }
                }
                if (ta == []) return 0;
                return Math.max.apply(Math, ta);
            },
            min: function(array) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len > 1) {
                    array = args;
                }
                //多维数组转一维
                var ta = _.isArray(array) ? array.join(",").split(",") : array.split(",");
                //去非数字
                for (var i = 0; i < ta.length; i++) {
                    if (ta[i] == "") {
                        ta.splice(i, 1);
                        i--;
                    }
                }
                if (ta == []) return 0;
                return Math.min.apply(Math, ta);
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

            clone: function(obj) {
                if (!_.isObject(obj)) return obj;
                return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
            },

            // Invert the keys and values of an object. The values must be serializable.
            invert: function(obj) {
                var result = {};
                var keys = _.keys(obj);
                for (var i = 0, length = keys.length; i < length; i++) {
                    result[obj[keys[i]]] = keys[i];
                }
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
                var elem = Array.prototype.slice.call(arguments);
                if (t.type == "animate") {
                    _.removeClass.call(elem, t.reverse, "hide")
                }
                return _.addClass.call(elem, t.key);
            };

            _[t.reverse] = function() {
                var elem = Array.prototype.slice.call(arguments);
                if (t.type == "animate") {
                    _.addClass.call(elem, t.reverse);
                    return _.removeClass.call(elem, t.key, "hide");
                }
                return _.removeClass.call(elem, t.key);
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
        //增加NodeList Arguments Window touchevent MouseEvent Screen  Infinity
        ['Null', 'Undefined', 'Array', 'String', 'Number',
            'Boolean', 'Function', 'RegExp', 'NaN', 'Infinity', // 'Infinite',
            'NodeList', 'Arguments', 'Window', 'TouchEvent', "MouseEvent", "Screen"
        ].forEach(function(t) {
            _['is' + t] = function(o) {
                return _.type(o) === t.toLowerCase();
            };
        });
        // [object HTMLDivElement] is Object
        _.isObject = function(o) {
            return _.isElement(o) ? true : _.type(o) === "object";
        };
        _.isEmpty = function(obj) {
            if (obj == null) return true;
            if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
            if (_.isElement(obj)) return _.size(obj) == 0;
            for (var key in obj)
                if (_.has(obj, key)) return false;
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
            if (shallow && _.every(input, _.isArray)) {
                return Array.prototype.concat.apply(output, input);
            }
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
            var val = "";
            var nameArr = name.split("."),
                len = nameArr.length;
            if (_.isObject(data)) {
                if (len == 1) {
                    val = data[name];
                } else {
                    val = data[nameArr.shift()];
                    len = len - 1;
                    if (_.isObject(val)) {
                        for (var i = 0; i < len; i++) {
                            val = val[nameArr[i]];
                            if (_.isUndefined(val)) {
                                val = "";
                                return "";
                            }
                        }
                    }
                }
            } else if (_.isString(data) || _.isNumber(data)) {
                if (name == "text") {
                    val = data;
                }
            }
            return val;
        }

        _.$ = _.query;

        // Array.intersect = function(a, b) {
        //     return a.uniq().each(function(o) {
        //         return b.contains(o) ? o : null
        //     });
        // };



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

        // Functions for escaping and unescaping strings to/from HTML interpolation.
        _.each(['escape', 'unescape'], function(method) {
            _[method] = function(string) {
                if (string == null) return '';
                return ('' + string).replace(entityRegexes[method], function(match) {
                    return entityMap[method][match];
                });
            };
        });


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
            for (var key in obj) {
                result.push(_.toQueryPair(key, obj[key]));
            }
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
                    option = _.extend(option, {
                        success: args[1]
                    })
                } else if (_.isObject(args[1])) {
                    option = _.extend(option, args[1])
                    if (_.isObject(option.data)) {
                        option.data = _.toQueryString(option.data);
                    }
                }

            }

            if (len >= 3) {
                if (_.isFunction(args[2])) {
                    option = _.extend(option, {
                        error: args[2]
                    })
                }
            }

            function createXmlHttpRequest() {
                try {
                    xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
                } catch (e) {
                    // console.log(e);
                    try {
                        xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
                    } catch (e2) {
                        // console.log(e2);
                        xmlHttp = false;
                    }
                }
                if (!xmlHttp && typeof XMLHttpRequest != "undefined") {
                    xmlHttp = new XMLHttpRequest();
                }
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
                                uri += (uri.indexOf("?") > -1 ? "&" : "?") + option.data;
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
                if (done) {
                    return true;
                }
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
            if (_.isString(loadEl)) {
                loadEl = _.query(loadEl);
            }
            if (_.isElement(loadEl)) {
                var loadArr = ['~oo~', '^oo^', '^oo~', '~oo^'];
                var loadAnimationTimeout = false;
                var loadAnimation = function() {
                    if (loadAnimationTimeout) {
                        return;
                    }
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
                if (_.isFunction(error)) {
                    error.call(elem, elem, result);
                }
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
                    if (this.height === 0) {
                        isLoad = false;
                        return false;
                    }
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
                if (_.isFunction(f)) {
                    if (i == 0) {
                        return f;
                    } else {
                        return obj[arr[0]] = f;
                    }
                }
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
                function(s) { return Array.prototype.slice.call(document.querySelectorAll(s)).indexOf(this) !== -1; };
            return f.call(el, selector);
        }

        _.closest = function(selector) {
            var el = this;
            while (el) {
                if (el && _.selectorMatches(el, selector)) { //parent.matches(selector)
                    return el;
                }
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


        var _prototype = {}

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
                return eval(ps.join(""));
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
                if (t2 == 0 && t1 == 0) {
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
                // }
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
                    var es = this.split(",");
                    return "[" + es.join("],[") + "]";

                    // return "[" + this + "]";
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
                    len = args.length;
                var str = this;
                for (var i = 0, j = len; i < j; i++) {
                    // str = str.replace(new RegExp('\\{' + i + '\\}', 'g'), arguments[i]);
                    str = str.replace(/{.*?}/, args[i]);
                }
                return str;
            },



        };

        _prototype.dat = {
            // var _ = _;
            // 对Date的扩展，将 Date 转化为指定格式的String 
            // 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
            // 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
            // 例子： 
            // (new Date()).format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
            // (new Date()).format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
            format: function(fmt) { //author: meizz 
                var $1, o = {
                    "M+": this.getMonth() + 1, //月份 
                    "d+|D+": this.getDate(), //日 
                    "h+|H+": this.getHours(), //小时 
                    "m+": this.getMinutes(), //分 
                    "s+": this.getSeconds(), //秒 
                    "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
                    "S": this.getMilliseconds() //毫秒 
                };
                var key, value;
                if (/(y+|Y+)/.test(fmt))
                    $1 = RegExp.$1,
                    fmt = fmt.replace($1, (this.getFullYear() + "").substr(4 - $1.length));
                for (var k in o) {
                    if (new RegExp("(" + k + ")").test(fmt)) {
                        $1 = RegExp.$1,
                            // value = String(""+o[key]),
                            // value = $1.length == 1 ? value : ("00" + value).substr(value.length),
                            // fmt = fmt.replace($1, value);
                            fmt = fmt.replace($1, ($1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                    }
                }
                return fmt;
            }
        };
        _prototype.ele = {
            length: {
                value: 1,
                writable: false
            },
            //兼容jquery  常用方法
            attr: function(key, value) {
                if (value) {
                    this.setAttribute(key, value);
                    return this;
                }
                return this.getAttribute(key);
            },
            remove: function() {
                if (this.parentNode) {
                    this.parentNode.removeChild(this)
                }
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
                if (len == 1) {
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
                if (len == 0) {
                    return this.innerHTML;
                } else {
                    this.innerHTML = args[0];
                    return this;
                }

                // if (_.isUndefined(str)) {
                //     return this.innerHTML;
                // } else {
                //     this.innerHTML = str;
                //     return this;
                // }
            },
            //冲突：HTMLScriptElement.text  是一个属性  ，使用_.text代替
            text: function(str) {
                if (str) {
                    this.innerText = str;
                }
                return this.innerText;
            },
            val: function(value) {
                if (value) {
                    this.setAttribute("value", value);
                    return this;
                }
                // if (_.contains(["select", "input"], this.tagName.toLowerCase())) {

                if (["select", "input"].indexOf(this.tagName.toLowerCase()) != -1) {
                    return this.value;
                }
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

                var autounit = function(key, val) {
                    if (/^0$/.test(val)) {
                        return val;
                    }
                    return keys.indexOf(key) >= 0 ? ("" + val).replace(/^\d+(\.\d+)?$/, function(match) {
                        return match + "px";
                    }) : val;
                }

                if (len == 1) {
                    if (_.isObject(opt)) {
                        for (key in opt) {
                            // css()
                            var val = opt[key];
                            val = autounit(key, val)
                            this.style[key] = val;
                            // autoprefixer.call(this, key, val);
                        }
                    }
                } else if (len == 2) {
                    // prop, val
                    this.style[opt] = args[1];
                    // autoprefixer.call(this, opt, arguments[1]);
                }
                return this;
            },
            width: function() {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len == 1) {
                    this.css({ width: args[0] })
                }
                return this.offsetWidth;
            },
            height: function() {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len == 1) {
                    this.css({ height: args[0] })
                }
                return this.offsetHeight;
            },
            pos: function(p) {
                var args = Array.prototype.slice.call(arguments),
                    len = args.length;
                if (len == 1) {
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
                        if (truncate && jQuery(elem).is(until)) {
                            break;
                        }
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
            // lastChild:function(elem){
            //     var args=slice.call(arguments),
            //     len=args.length;
            // },
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
                        if (_.size(ele) >= 1) {
                            list.push(ele);
                        }
                    }
                });
                return list.length == 1 ? list[0] : list;
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
                    len = args.length;
                if (this.length == 0) {
                    return this;
                } else if (len == 1 && _.isString(args[0])) { //getter
                    var results = [];
                    _.each(this, function(item) {
                        if (_.isElement(item)) {
                            results.push(item[t].apply(item, args));
                        }
                    });
                    return results; //为了链式语法，空值返回[]
                } else { //setter
                    _.each(this, function(item) {
                        if (_.isElement(item)) {
                            item[t].apply(item, args);
                        }
                    });
                    return this;
                }
            }
        });
        //扩展原型  函数  extend prototype
        _.extproto = function(obj) {
            _.each(Array.prototype.slice.call(arguments, 1), function(source) {
                if (source) {
                    try {
                        for (var prop in source) {
                            if (_.isObject(source[prop])) {
                                Object.defineProperty(obj, prop, source[prop]);
                            } else if (_.isFunction(source[prop])) {
                                // if (!obj.hasOwnProperty(prop)) {
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
                                if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
                                    obj[prop] = source[prop];
                                }
                            }
                        }

                    } catch (e) {
                        console.log(e)
                    }

                }
            });
            return obj;
        };

        //原型扩展 
        _.extproto(Object.prototype, _prototype.obj);
        _.extproto(Number.prototype, _prototype.num);
        _.extproto(String.prototype, _prototype.str);
        _.extproto(Date.prototype, _prototype.dat);
        _.extproto(Array.prototype, _prototype.arr);
        if (inBrowser) {
            _.extproto(Element.prototype, _prototype.ele);
        }


        // [Object, Number, String, Date, Element, Array].forEach(function(t) {
        //     var name = t.toString().replace(/function\s(\w+)\(\).+/, function(m, c) {
        //         return c.toLowerCase().slice(0, 3);
        //     });
        //     console.log(name)
        //     // _.extproto(t.prototype, _prototype[name]);
        // });


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
                if (!el.events) {
                    el.events = []
                }
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
                    if (el.events[i].type == type && el.events[i].listener == listener) {
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
        // var containerWidth = document.documentElement.clientWidth >= 680 ? 680 : document.documentElement.clientWidth;

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
                        for (x in obj) {
                            if (item[x] != obj[x]) {
                                flag = false;
                            }
                        }
                        return flag;
                    });
                },
                reset: function() {
                    storeEvents = [];
                },
                on: function(type, el, listener, once) {
                    var self = this;
                    // if (_.isArray(type)) {
                    //     type.forEach(function(t) {
                    //         self.on(t, el, listener, once)
                    //     });
                    //     return;
                    // }
                    if (!isSupportTouch && type == TAP) {
                        type = "click";
                    }

                    switch (type) {
                        case TAP:
                            var starHandler = function(ev) {
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
                            addEvent(_touchstart, el, starHandler);
                            addEvent(_touchend, el, endHandler);
                            break;
                        case LONGTAP: //长按
                            var _longtap;
                            var starHandler = function(ev) {
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
                            addEvent(_touchstart, el, starHandler);
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
                                // var pos=
                                var x = _.min(pos.x, range.right);
                                x = _.max(x, range.left);
                                var y = _.min(pos.y, range.bottom);
                                y = _.max(y, range.top);

                                return {
                                    left: x,
                                    top: y
                                }
                            }
                            var starHandler = function(ev) {
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
                                        if (type != "drag-y") el.css({ left: left + "px" });
                                        if (type != "drag-x") el.css({ top: top + "px" });
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
                            addEvent(_touchstart, el, starHandler);
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
                    // if (_.isArray(type)) {
                    //     type.forEach(function(t) {
                    //         self.off(t, el, listener)
                    //     });
                    //     return;
                    // }
                    if (TAP == type) {
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
                    if (options == false) {
                        self.offEvent();
                    }
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
                        if (el.nodeName.toLowerCase() == "input" && type == TAP) {
                            type = "click"
                        }
                        if (clear) {
                            self.clear({
                                el: el,
                                type: type
                            });
                        }
                        es.push({
                            type: type,
                            el: el,
                            listener: listener,
                            once: once
                        })
                    } else if (_.isArray(el)) {
                        el.forEach(function(t) {
                            _option(_.extend({}, opt, { el: t }));
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
                    for (var i = 0; i <= step; i++) {
                        token += this.text.charAt((this.pos + i) >= this.max ? this.max : (this.pos + i));
                    }
                }
                return token;
            },
            eof: function() {
                return this.peek() == '';
            },
            next: function(current) {
                if (current && current !== this.ch) {
                    error("Expected '" + current + "' instead of '" + this.ch + "'");
                }
                this.ch = this.text.charAt(this.pos++);
                if (this.ch == '\n') {
                    this.line++;
                    this.col = 0;
                } else {
                    this.col++;
                }
                if (this.debug) this.token = this.peek(10);
                return this.ch;
            },
            back: function() {
                this.ch = this.text.charAt(this.pos--);
                return this.ch;
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
                if ("{" == this.ch) {
                    while (this.next()) {
                        this._skipWhite();
                        if (this.ch == "}") {
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
                if ("[" == this.ch) {
                    while (this.next()) {
                        this._skipWhite();
                        if (this.ch == "]") {
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
                    if (this.ch == ":") {
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
                if ("\"\'".indexOf(starFlag) >= 0) {
                    while (this.next()) {
                        if (starFlag == this.ch) {
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
                        if (",}]".indexOf(this.ch) >= 0) {
                            return value = +value;
                        }
                        value += this.ch;
                    }
                    return value;
                }
            },
            _parseValue: function() {
                var value = this.ch;
                while (this.next()) {
                    if (",}]".indexOf(this.ch) >= 0) {
                        // this.next();
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
                            result: arg.length == 1 ? arg[0] : arg
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
                        for (var i = start; i <= end; i++) {
                            this.values.push(i);
                        }
                    } else {
                        this.index = args[1]
                    }
                }
                if (len == 3) {
                    this.text = args[2];
                }
                this.length = this.values.length;
            },
            next: function() {
                this.index = this.index >= this.values.length - 1 ? 0 : this.index + 1;
                return this.values[this.index];
            },
            prev: function() {
                this.index = this.index <= 0 ? this.values.length - 1 : this.index - 1;
                return this.values[this.index];
            },
            current: function() {
                if (this.index == -1) { this.index = 0; }
                return this.values[this.index];
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
            }
        }
        cycle.prototype.init.prototype = cycle.prototype;

        _.sliderCycle = function(options) {
            var min = options.min,
                max = options.max,
                step = options.step,
                value = options.value;
            var values = [],
                i = 0,
                t = min,
                index = 0;
            //判断小数位数
            // var n=step.toString().split(".")[1].length;
            var n = 0;
            step.toString().replace(/\d+(?:\.(\d+))?/, function(m, f) {
                if (f) {
                    n = f.length;
                }
            });

            while (t <= max) {
                values.push(t);
                if (t == value) {
                    index = i;
                }
                t = Number((t + step).toFixed(n));
                i++;
            }
            return _.cycle(values, index);

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

        //弧度
        _.radian = function(a) {
            return a * Math.PI / 180
        };
        //正玄
        _.sin = function(a) {
            return Math.sin(a * Math.PI / 180);
        };
        //余玄
        _.cos = function(a) {
            return Math.cos(a * Math.PI / 180);
        };
        //正切
        _.tan = function(a) {
            return Math.tan(a * Math.PI / 180);
        }
        _.atan = function(a) {
            return Math.atan(a * Math.PI / 180);
        }
        //获取斐波那契数列
        //第三个数开始，每个数都是前两个数之和
        _.fibonacci = function(n) {
            if (n == 1) return [0];
            if (n == 2) return [0, 1];
            var arr = [0, 1];
            for (var i = 0; i < n - 2; i++) {
                arr.push(arr[i] + arr[i + 1])
            }
            return arr
        }
        //点
        //直角坐标 xy Coordinate
        //极坐标Polar Coordinate
        //复合坐标系
        //原点x,y在直角坐标定位，用r ,a在极坐标系中作图。
        //输入：ox,oy,r,a
        //输出： r a   x y  o(x,y)
        var _point = _.point = function(opt, coordinate) {
            return new _point.prototype.init(opt, coordinate)
        }
        _point.prototype = {
            constructor: _point,
            init: function(opt, coordinate) {
                //默认坐标 ra 和xy
                this.coordinate = _.isUndefined(coordinate) ? "ra" : coordinate;
                var x = opt.x || 0,
                    y = opt.y || 0,
                    r = opt.r || 0;
                var a = _.isUndefined(opt.a) ? _.random(360) : opt.a;
                //极坐标原点 
                this.o = {
                    x: x,
                    y: y
                }
                this.r = r;
                this.a = a; //theta


                if (opt.path == "square") {
                    this.x = r * _.atan(a);
                    this.y = r * _.tan(a);

                    a = a % 360;

                    if (a <= 45 && a >= 0 || a >= 315 && a <= 360) {
                        this.x = r;
                    }
                    if (a >= 45 && a <= 135) {
                        this.y = r;
                    }
                    if (a >= 135 && a <= 225) {
                        this.x = -r
                    }
                    if (a >= 225 && a <= 315) {
                        this.y = -r
                    }

                    this.x += this.o.x;
                    this.y += this.o.y;

                } else { //circle
                    var p = this.xy(r, a, this.o);
                    this.x = p.x;
                    this.y = p.y;
                }
            },
            //极坐标转xy坐标
            xy: function(r, a, o) {
                return {
                    x: o.x + r * _.cos(a),
                    y: o.y + r * _.sin(a)
                }
            },
            //距离  勾股定律
            distance: function(p) {
                return Math.pow(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2), 1 / 2)
            },

            //中点
            middle: function(p, ratio) {
                var p = p || this.o;
                var ratio = _.isUndefined(ratio) ? 1 : ratio;

                if (this.coordinate == "xy") {
                    var x = p.x * ratio / (ratio + 1) + this.x * 1 / (ratio + 1) + this.o.x;
                    var y = p.y * ratio / (ratio + 1) + this.y * 1 / (ratio + 1) + this.o.y;
                    return {
                        x: x,
                        y: y
                    }
                }

                //位移原点o
                var x = (p.x - this.x) * ratio / (ratio + 1) + this.o.x
                var y = (p.y - this.y) * ratio / (ratio + 1) + this.o.y
                var opt = _.extendMe({}, this, {
                    x: x,
                    y: y
                });
                return _point(opt);
            },

            //镜像 镜像点
            mirror: function(p) {
                var p = p || this.o;
                if (this.coordinate == "xy") {
                    return {
                        x: 2 * p.x - this.x,
                        y: 2 * p.y - this.y
                    }
                }

                var opt = _.extendMe({}, this, {
                    x: 2 * (p.x - this.x) + this.o.x,
                    y: 2 * (p.y - this.y) + this.o.x
                });
                return _point(opt);
            },
            //平移
            translate: function(x, y) {
                if (this.coordinate == "xy") {
                    return {
                        x: this.x + x || 0,
                        y: this.y + y || 0
                    }
                }
                var opt = _.extendMe({}, this, {
                    x: this.o.x + x || 0,
                    y: this.o.y + y || 0
                })
                return _point(opt);
            },
            //旋转
            rotate: function(a) {
                if (this.coordinate == "xy") {
                    return this.xy(this.r, a, this.o);
                }
                var opt = _.extendMe({}, this, {
                    a: this.a + a,
                    x: this.o.x,
                    y: this.o.y
                })
                return _point(opt);
            },
            scale: function(e) {
                if (this.coordinate == "xy") {
                    return this.xy(this.r * e, 0, this.o)
                }
                var opt = _.extendMe({}, this, {
                    r: this.r * e
                })
                return _point(opt);
            },
            clone: function() {
                return _point({ x: this.o.x, y: this.o.y, r: this.r, a: this.a });
            }
        }
        _point.prototype.init.prototype = _point.prototype;



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
                var x = _.isUndefined(opt.x) ? this.canvas.width / 2 : opt.x;
                var y = _.isUndefined(opt.y) ? this.canvas.height / 2 : opt.y;
                var a = _.isUndefined(opt.a) ? 0 : opt.a;
                var vx = _.isUndefined(opt.vx) ? 1 : opt.vx;
                var vy = _.isUndefined(opt.vx) ? 1 : opt.vy;
                x += opt.offsetX || 0;
                y += opt.offsetY || 0;



                var opt = this.opt = _.extend({}, opt, {
                    width: opt.r,
                    height: opt.r,
                    //range
                    top: 0,
                    left: 0,
                    right: this.canvas.width,
                    bottom: this.canvas.height,
                    x: x,
                    y: y,
                    a: a,
                    vx: vx,
                    vy: vy
                });

                if (_.isArray(opt)) {
                    opt.forEach(function(t) {
                        self.setup(t);
                    })
                } else {
                    self.setup(opt);
                }
            },
            setup: function(opt) {
                var self = this;
                var opt = opt || this.opt;

                var shape = opt.shape;
                if (_.isString(shape)) {
                    shape = shape.split("|");
                }
                shape.forEach(function(t) {
                    self[t] && self[t](opt);
                })
            },
            //旋转
            rotate: function(speed) {
                this.opt.a += speed || this.opt.speed || 1;
                return this;
            },
            //反弹
            bounce: function() {
                if (this.opt.x < this.opt.left + this.opt.width) { //碰到左边的边界
                    this.opt.x = this.opt.width;
                    this.opt.vx = -this.opt.vx;
                } else if (this.opt.y < this.opt.top + this.opt.height) {
                    this.opt.y = this.opt.height;
                    this.opt.vy = -this.opt.vy;
                } else if (this.opt.x > this.opt.right - this.opt.width) {
                    this.opt.x = this.opt.right - this.opt.width;
                    this.opt.vx = -this.opt.vx;
                } else if (this.opt.y > this.opt.bottom - this.opt.height) {
                    this.opt.y = this.opt.bottom - this.opt.height;
                    this.opt.vy = -this.opt.vy;
                }
            },
            //移动
            move: function() {
                this.opt.x += this.opt.vx || 1;
                this.opt.y += this.opt.vy || 1;
                if (this.opt.bounce) {
                    this.bounce()
                }
                return this;
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
            translate: function(x, y) {
                var opt = _.extend({}, this.opt, {
                    x: this.opt.x + x,
                    y: this.opt.y + y,
                    offsetX: 0,
                    offsetY: 0
                });
                return this.draw.shape(opt);
            },
            regularVertices: function(opt) {
                var p = _.point(opt)
                var num = opt.num;
                //夹角
                var ia = 360 / num;
                var vs = [p];
                for (var i = 0; i < num; i++) {
                    vs.push(p = p.rotate(ia));
                }
                return vs;
            },
            regularPolygon: function(opt) {
                var vs = this.regularVertices(opt);
                this.draw.link(vs, opt);
            },
            spiral: function(opt) {
                var p = _.point(opt),
                    vs = [p],
                    turns = opt.turns,
                    r = opt.r;
                for (var i = 0; i < turns; i += 2) {
                    vs.push(p = p.translate(r * i, 0))
                    vs.push(p = p.translate(0, r * i))
                    vs.push(p = p.translate(-r * (i + 1), 0))
                    vs.push(p = p.translate(0, -r * (i + 1)))
                }
                this.draw.link(vs, opt);
            },
            //斐波那契数列 螺旋
            fibonacci: function(opt) {
                var num = opt.num;
                var fb = _.fibonacci(num);

                var clockwise = opt.clockwise;
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

                this.draw.render(_.extend({}, opt, { closed: false }))
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
            //顶点  极坐标,等角切分
            //当r相同时  半径变化比率rRation=1  为正多边形
            //1 ,.05，两个数循环。形成星形  ，凹多边形
            //渐渐变大或变小 ，形成 螺旋线 
            //不等角切分 等距r  形成矩形  (未处理) 
            vertices: function(opt) {
                var shape = opt.shape,
                    r = opt.r || 100,
                    a = opt.a || 0,
                    x = opt.x,
                    y = opt.y,
                    rRatio = opt.rRatio || 1,
                    aRatio = opt.aRatio || 1,
                    turns = opt.turns || 1,
                    num = opt.num || 3;
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
                            rn = i == 0 ? r : i == 1 ? r * rRatioCycle.val() : rn * rRatioCycle.next();
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
                    var p = _.point(_.extend({}, opt, {
                        a: an,
                        r: rn
                    }));
                    vs.push(p);
                }
                return vs;
            },
            //内接多边形 顶点
            invertices: function(vs) {
                var vs2 = [];
                var len = vs.length;

                if (len < 2 || vs[0].distance(vs[1]) < 10) {
                    return false;
                }
                vs.forEach(function(t, i) {
                    var p;
                    if (i == len - 1) {
                        p = t.middle(vs[0])
                    } else {
                        p = t.middle(vs[i + 1])
                    }
                    vs2.push(p);
                })
                return vs2;
            },
            text: function(opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                var text = opt.num || opt.text;
                var color=opt.color||"#000";

                ctx.fillStyle = color;
                ctx.font = r+"px Verdana";
                var measure=ctx.measureText(text);
                ctx.fillText(text, x - measure.width/2, y + r/2);
            },

            circle: function(opt) {
                var ctx = this.context;
                var x = opt.x,
                    y = opt.y,
                    r = opt.r;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2, true);
                ctx.closePath();
                this.draw.render(opt);
                var text = opt.text;
                if (!_.isUndefined(text)) {
                    ctx.fillStyle = "#000";
                    ctx.font = "12px Verdana";
                    ctx.fillText(text, x - 4, y + 5);

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
                //     opt.shape = _.extend({}, opt.shape, { r: r2 });
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
                var vs = this.vertices(opt);
                return this.draw.link(vs, opt);
            },
            //线条
            line: function(opt) {
                opt.num = 2;
                return this.polygon(opt);
            },
            //三角形
            triangle: function(opt) {
                opt.num = 3;
                return this.polygon(opt);
            },
            //正方形
            square: function(opt) {
                opt.num = 4;
                return this.polygon(opt);
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
                return this.polygon(opt);
            },
            //五角星
            star: function(opt) {
                opt.shape = "star"
                this.polygon(opt); //|| (3 - 4 * Math.pow(self.sin(18), 2)) //正五角星2.61803

                // var self = this;
                // var num = opt.num || 5; //num of edge
                // var a = opt.a; //offset
                // var ratio = opt.ratio || (3 - 4 * Math.pow(self.sin(18), 2)) //正五角星2.61803
                // var vs = [];
                // for (var i = 0; i < num; i++) {
                //     var p1 = self.point(_.extend({}, opt, {
                //         a: i * 360 / num + a
                //     }))
                //     vs.push(p1);
                //     var p2 = self.point(_.extend({}, opt, {
                //         a: i * 360 / num + a + 180 / num,
                //         r: opt.r / ratio
                //     }))
                //     vs.push(p2);
                // }
                // this.link(vs, opt)
                return this;
            },
            //对角线
            diagonal: function(opt) {
                var vs = this.vertices(opt);
                var vsGroup = [];
                var len = vs.length;
                for (var i = 0; i < len - 2; i++) {
                    for (var j = i + 2; j < len; j++) {
                        if (!(i == 0 && j == len - 1)) {
                            vsGroup.push([vs[i], vs[j]]);
                        }
                    }
                }
                this.draw.linkGroup(vsGroup, _.extend({}, opt, { showVertices: false }));
                return this.draw.link(vs, opt);
            },
            //斑马
            zebra: function(opt) {
                var vs = this.vertices(opt);
                var x = opt.x,
                    y = opt.y;
                var vsGroup = _.slice(vs, 2).map(function(t) {
                    return t.concat([{ x: x, y: y }])
                })
                this.draw.linkGroup(vsGroup, _.extend({}, opt, { fill: true, showVertices: false, showExcircle: false }));
                return this.draw.link(vs, opt);
            },
            //交叉线
            cross: function(opt) {
                var num = opt.num;
                var vsGroup = [];
                var opt = _.extend({}, opt, { num: opt.num * 2 });
                var vs = this.vertices(opt);
                for (var i = 0; i < num; i++) {
                    vsGroup.push([vs[i], vs[i + num]]);
                }
                return this.draw.linkGroup(vsGroup, opt);
            },
            //射线  等角射线
            ray: function(opt) {
                var vs = this.vertices(opt);
                var x = opt.x,
                    y = opt.y;
                var vsGroup = [];
                if (opt.fill) {
                    var num = opt.num;
                    for (var i = 0; i < num; i += 2) {
                        vsGroup.push([{ x: x, y: y }, vs[i], i == num - 1 ? vs[0] : vs[i + 1]])
                    }
                } else {
                    vsGroup = vs.map(function(v, i) {
                        return [{ x: x, y: y }, v];
                    })
                }
                return this.draw.linkGroup(vsGroup, opt);
            },
            //花瓣
            flower: function(opt) {
                var self = this;
                var vsGroup = [];
                var vs = this.vertices(opt);
                vsGroup.push(vs);
                var level = 0;
                (function _flower(vs) {
                    if (level > 4) {
                        return;
                    }
                    var r = opt.r / Math.pow(2, level++);
                    var vs2 = self.vertices(_.extend({}, opt, { r: r }));
                    vsGroup.push(vs2);
                    vs.map(function(t, i) {
                        var vs3 = [t, vs2[i == vs2.length - 1 ? 0 : i + 1]];
                        vsGroup.push(vs3);
                    });
                    _flower(vs2);
                })(vs);
                return self.draw.linkGroup(vsGroup, opt);
            },
            //太阳花
            sunflower: function(opt) {
                var interval = opt.interval || 2;
                var vsGroup = [];
                var vs = this.vertices(opt);
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
                var vsGroup = [];
                var vs = this.vertices(opt);
                vsGroup.push(vs);
                //内切三角形
                (function _intriangle(vs) {
                    var vs2 = self.invertices.call(self, vs);
                    if (vs2) {
                        vsGroup.push(vs2);
                        vs.map(function(t, i) {
                            var vs3 = [t, vs2[i], vs2[i == 0 ? vs2.length - 1 : i - 1]]
                            _intriangle(vs3)
                        });
                    }
                })(vs);
                return self.draw.linkGroup(vsGroup, opt);
            },
            //内切 多边形
            inpolygon: function(opt) {
                var self = this;
                var vsGroup = [];
                var vs = this.vertices(opt);
                vsGroup.push(vs);
                (function _inpolygon(vs) {
                    var vs2 = self.invertices.call(self, vs);
                    if (vs2) {
                        vsGroup.push(vs2);
                        _inpolygon(vs2)
                    }
                })(vs);
                return self.draw.linkGroup(vsGroup, opt);
            },

            //顶点镜像
            mirror: function(opt) {
                var vsGroup = [];
                var vs = this.vertices(opt);
                vsGroup.push(vs);
                vs.forEach(function(t) {
                    var vs2 = []
                    vs.forEach(function(t2) {
                        vs2.push(t2.mirror(t));
                    })
                    vsGroup.push(vs2);
                });
                return this.draw.linkGroup(vsGroup, opt);
            },
            //轴对称
            axialMirror: function(opt) {
                var self = this;
                var vsGroup = [];
                var vs = this.vertices(opt);
                vsGroup.push(vs);
                var a = opt.a,
                    num = opt.num,
                    r = opt.r;
                var an,
                    rn = 2 * r * _.cos(180 / num);
                vs.forEach(function(t, i) {
                    var p = _.point(_.extend({}, opt, {
                        a: t.a + 180 / num,
                        r: rn
                    }));
                    var vs2 = self.vertices(_.extend({}, opt, {
                        x: p.x,
                        y: p.y
                    }));
                    vsGroup.push(vs2);
                });
                return this.draw.linkGroup(vsGroup, opt);
            },
            //蜂巢
            comb: function(opt) {
                var self = this;
                var vsGroup = [];
                opt.num = 6;
                var vs = this.vertices(opt);
                vsGroup.push(vs);
                var a = opt.a,
                    num = opt.num,
                    r = opt.r;
                var _comb1 = function(n) {
                    var rn = 2 * n * r * _.cos(180 / num);
                    vs.forEach(function(t, i) {
                        var p = _.point(_.extend({}, opt, {
                            a: t.a + 180 / num,
                            r: rn
                        }));
                        var vs2 = self.vertices(_.extend({}, opt, {
                            x: p.x,
                            y: p.y
                        }));
                        vsGroup.push(vs2);
                    });

                };
                var _comb2 = function(n) {
                    var rn = 2 * n * r + r; //3 * r 
                    vs.forEach(function(t, i) {
                        var p = _.point(_.extend({}, opt, {
                            a: t.a,
                            r: rn
                        }));
                        var vs2 = self.vertices(_.extend({}, opt, {
                            x: p.x,
                            y: p.y
                        }));
                        vsGroup.push(vs2);
                    });
                };
                [1, 2, 3].forEach(function(n) {
                    _comb1(n);
                    _comb2(n);
                });


                return this.draw.linkGroup(vsGroup, opt);

            }
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

                var x = opt.shape.x,
                    y = opt.shape.y,
                    r = opt.shape.r,
                    color = opt.shape.color,
                    shape = opt.shape.shape || "circle";
                var colorful = opt.group.colorful;
                var speed = 3;
                if (opt.motion) {
                    speed = opt.motion.speed || 3;
                }
                // var identifier = opt.motion.identifier;


                var sr = r;
                var width = r,
                    height = r;

                if (opt.group.switch == "on") {
                    if (["mirror", "surround"].indexOf(opt.group.group) != -1) {
                        // sr += opt.sr
                        width = opt.group.sr + r;
                        height = opt.group.sr + r
                    }
                    // sr=_.min(sr,canvas.width/2-10)
                }

                // if(width>=this.canvas.width||height>=this.canvas.height){
                //     opt.motion.bounce=false;
                // }


                if (opt.motion && opt.motion.switch == "on") {
                    opt.group.animate = false;
                    if (_.isUndefined(opt.group.a)) opt.group.a = 0;
                }
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
                opt.group = _.extend({}, opt.group, {
                    speed: speed,
                    width: width,
                    height: height,
                    range: {
                        top: 0,
                        left: 0,
                        right: this.canvas.width,
                        bottom: this.canvas.height
                    },
                    colorArr: colorArr
                })



                this.opt = _.extend({}, opt);
                this.setup();
            },
            //图形
            shape: function(opt) {
                this.draw.shape(opt.shape)
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
                if (opt.group.switch == "on") {
                    this[opt.group.group](opt)
                } else {
                    this.shape(opt);
                }
            },
            //旋转
            rotate: function() {
                this.opt.group.a += this.opt.group.speed;
                return this;
            },
            //反弹
            bounce: function() {
                var g = this.opt.group
                if (g.x < g.range.left + g.width) { //碰到左边的边界
                    g.x = g.width;
                    g.vx = -g.vx;
                } else if (g.y < g.range.top + g.height) {
                    g.y = g.height;
                    g.vy = -g.vy;
                } else if (g.x > g.range.right - g.width) {
                    g.x = g.range.right - g.width;
                    g.vx = -g.vx;
                } else if (g.y > g.range.bottom - g.height) {
                    g.y = g.range.bottom - g.height;
                    g.vy = -g.vy;
                }
            },
            //移动
            move: function() {
                var g = this.opt.group;
                g.x += g.vx;
                g.y += g.vy;
                if (this.opt.motion.bounce) {
                    this.bounce()
                }
                return this;
            },

            //环形
            ring: function(opt) {
                this.shape(opt);
                var r2 = opt.shape.r * opt.shape.rRatio;
                opt.shape = _.extend({}, opt.shape, { r: r2 });
                this.shape(opt);
                // this.draw.shape(opt.shape);
                // this[shape] && this[shape](opt)


                // if (_.isObject(opt.group) && opt.group.group == "ring") {
                //     var shape = opt.shape.shape;
                //     this[shape] && this[shape](opt.shape)

                //     var r2 = opt.shape.r * opt.shape.rRatio;
                //     opt.shape = _.extend({}, opt.shape, { r: r2 });
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

                var sr = opt.group.sr; //环绕半径
                if (_.isUndefined(sr)) {
                    sr = r;
                    r = r / 3;
                }
                var clockwise = opt.group.clockwise; //顺时针逆时针
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
                        x: x + sr * _.sin(a),
                        y: y + sr * _.cos(a),
                        r: r
                    }
                    //颜色
                    if (opt.group.colorArr.length > index) {
                        opt2.color = opt.group.colorArr[index++];
                    }

                    opt.shape = _.extend({}, opt.shape, opt2);

                    self.shape(opt);
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
                    opt.shape = _.extend({}, opt.shape, self.color(opt), { r: r });
                    self.shape(opt);
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
                this.shape(opt);
                // var shape = opt.shape || "polygon";
                // this[shape](opt);
                opt.shape = _.extend({}, opt.shape, { shape: "circle", text: "" })
                this.shape(opt);

                // this.circle(opt);
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
                var clockwise = opt.group.clockwise;
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

                    opt.shape = _.extend({}, opt.shape); //, self.color(opt)
                    self.shape.call(self, opt);
                    opt.shape.y += 2 * r;
                    if (animate) {
                        setTimeout(_repeat, animationInterval);
                    } else {
                        _repeat()
                    }
                })();
                return self;
            },


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
        var _motion = _.motion = function(draw, opt) {
            return new _motion.prototype.init(draw, opt);
        }

        _motion.prototype = {
            constructor: _motion,
            init: function(draw, opt) {
                var self = this;
                this.draw = draw;
                this.mode = opt.motion.mode;
                this.link = opt.motion.link;
                this.speed = opt.motion.speed || 1;
                var num = opt.motion.num || 1;
                var colorful = opt.motion.colorful;

                if (opt.motion.switch == "on") {
                    opt.shape.animate = false
                }
                this.groups = [];
                for (var i = 0; i < num; i++) {
                    opt.id = i;
                    var t;
                    if (opt.group && opt.group.switch == "on") {
                        this.mode = _.camelCase(opt.motion.mode, "group");

                        opt.group = _.extend({}, opt.group, {
                            vx: (Math.random() * 2 - 1) * opt.motion.speed || 1,
                            vy: (Math.random() * 2 - 1) * opt.motion.speed || 1,
                            bounce: opt.motion.bounce
                        });
                        t = draw.group(opt);
                    } else {
                        opt.shape = _.extend({}, opt.shape, {
                            vx: (Math.random() * 2 - 1) * opt.motion.speed || 1,
                            vy: (Math.random() * 2 - 1) * opt.motion.speed || 1,
                            bounce: opt.motion.bounce
                        });
                        t = draw.shape(opt.shape);
                        t.color(colorful)
                    }
                    this.groups.push(t);
                };

                this.movie();
            },
            //旋转
            // rotate: function(draw, opt) {
            //     var self = this;
            //     (function _movie() {
            //         opt.shape.a += speed;
            //         draw.clear();
            //         draw.shape(opt.shape);
            //         self.id = requestAnimationFrame(_movie);
            //     })();
            // },
            movie: function() {
                var self = this;
                var vsGroup = [];
                var groups = self.groups;
                var len = groups.length;
                var mode = self.mode;
                self.draw.clear();

                groups.forEach(function(t, i) {
                    switch (mode) {
                        case "rotation":
                        case "rotationGroup": //旋转
                            t.rotate(self.speed).setup();
                            break;
                        case "move":
                        case "moveGroup": //移动
                            t.move().setup();
                            break;
                        default: //移动
                            t.move().setup();
                            break;
                    }
                    if (self.link) { //连接线


                        for (var j = i; j < len - 1; j++) {
                            var vs;
                            if (mode == "moveGroup") {
                                vs = [t.opt.group, groups[j + 1].opt.group];
                            } else {
                                vs = [t.opt, groups[j + 1].opt];
                            }

                            self.draw.link(vs);
                            // vsGroup.push(vs);

                            // if (t.meet(groups[j + 1])) {
                            //     console.log("反弹")
                            // }

                            //距离
                            // var d = self.distance.apply(self, vs);
                            // if (d < vs[0].r + vs[1].r) {
                            //     console.log("撞到了" + [i, j + 1]);
                            //     //反弹 能量相互
                            //     // var tmp = vs.slice(0);
                            //     // t.vx = tmp[1].vx * -1;
                            //     // t.vy = tmp[1].vy * -1;
                            //     // groups[j + 1].vx = tmp[0].vx * -1;
                            //     // groups[j + 1].vy = tmp[0].vy * -1;
                            // }
                        }
                    }
                });
                // self.link&&self.draw.linkGroup(vsGroup);
                self.draw.canvas.callback && self.draw.canvas.callback.call(self.draw.context, self.draw.context);

                if (inBrowser) {
                    self.id = requestAnimationFrame(self.movie.bind(self));
                } else {
                    self.id = setTimeout(self.movie.bind(self), 17)
                }


            },
            stop: function() {
                if (inBrowser) {
                    this.id && cancelAnimationFrame(this.id);
                } else {
                    this.id && clearTimeout(this.id);
                }
            }
        }
        _motion.prototype.init.prototype = _motion.prototype;


        // 解析draw.opt 文件
        var createOptCycle = _.createOptCycle = function(optJson) {
            var optCycle = {
                data: {},
                methods: {
                    autoNext: function(item, ev) {
                        // var k = this[0],
                        // x = this[1];
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
                        return val == true ? "是" : "否"
                    },
                    color: function(val) {
                        if (inBrowser)
                            return val + '<div class="colorblock" style="background-color:' + val + '"></div>';
                        return val;
                    }
                }
            };

            //开关
            var _switch = function(item, k) {
                var val;
                if (inBrowser) {
                    var bd = item.closest(".tab-body-item").query(".switchBody")
                    if (item.hasClass('on')) {
                        val = "off";
                        [item, bd].removeClass("on").addClass("off");
                    } else {
                        val = "on";
                        [item, bd].removeClass("off").addClass("on");
                    }
                    if (k == "motion") {
                        if (val == "on") {
                            _.show("#stopBtn");
                        } else {
                            _.hide("#stopBtn");
                        }
                    }
                } else {
                    val = this == "on" ? "off" : "on";
                }
                return val;
            };
            var _toggle = function(k, x) {
                optCycle.methods[_.camelCase("next", k, x)] = (function(item, ev) {
                    var k = this[0],
                        x = this[1];
                    var value;
                    if (optCycle.data[k][x]) {
                        value = optCycle.data[k][x].value = !optCycle.data[k][x].value;
                    }

                    if (inBrowser) {
                        item && item.html(optCycle.filters.toggle(value));
                        var iPos = _.pos(item);
                        var w = iPos.width;
                        var h = iPos.height;
                        var div2 = document.createElement("div")
                        var background = "rgba(0,0,0,0.1)";
                        div2.css({ width: w, height: h, top: 0, left: 0, position: "absolute", background: background });
                        item.appendChild(div2);
                        setTimeout(function() {
                            div2.remove();
                        }, 200)
                    }
                    return optCycle
                }).bind([k, x])
            };
            var _next = function(k, x) {
                optCycle.methods[_.camelCase("next", k, x)] = (function(item, ev) {
                    var k = this[0],
                        x = this[1];
                    var c = optCycle.data[k][x];
                    if (_.isString(c)) {
                        optCycle.data[k][x] = _switch.call(optCycle.data[k][x], item, k);
                    } else if (_.isObject(c)) {

                        if (inBrowser) {
                            var iPos = _.pos(item);
                            var ePos = _.pos(ev);
                            var w = iPos.width;
                            var h = iPos.height;
                            var offset = ePos.x - iPos.x;
                            var div2 = document.createElement("div");
                            var div = document.createElement("div");
                            var background = "rgba(0,0,0,0.1)"; // _.rgba().replace(/,[^,]*?\)/, ",0.1)"); //
                            if (offset > w / 2) {
                                c.next();
                                div2.css({ width: w / 2, height: h, top: 0, left: w / 2, position: "absolute", background: background });
                                div.addClass("rightArrow");
                                div.pos({ x: w - 20, y: (h - 20) / 2 });
                            } else {
                                c.prev();
                                div.addClass("leftArrow");
                                div.pos({ x: 20, y: (h - 20) / 2 });
                                div2.css({ width: w / 2, height: h, top: 0, left: 0, position: "absolute", background: background });
                            }
                            var val = c.val();
                            if (["color", "lineColor"].indexOf(x) >= 0) {
                                val = optCycle.filters.color(val);
                            }
                            item && item.html(_.isObject(val) ? val.text : val);
                            item.appendChild(div2);
                            item.appendChild(div);

                            setTimeout(function() {
                                div.remove();
                                div2.remove();
                            }, 200)

                            // console.log(val);

                        } else {
                            c.next();
                            console.log(c.val());
                        }
                    }
                }).bind([k, x]);
            };

            for (var k in optJson) {
                var o = optJson[k];
                if (_.isObject(o)) {
                    optCycle.data[k] = {};
                    for (var x in o) {
                        var val = o[x];
                        if (x == "switch") {
                            optCycle.data[k][x] = val;
                            _next(k, x);

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
                                        if (type == "color_rgba") {
                                            colorArr.push(_.rgba());
                                        } else if (type == "color_rgb") {

                                            colorArr.push(_.rgb());
                                        } else {
                                            colorArr.push(_.color());
                                        }
                                    }
                                    c = _.cycle(colorArr, 0);
                                    break;
                                case undefined:
                                    if (_.isBoolean(val)) {
                                        // optCycle.data[k][x] = val;
                                        c = _.cycle([{ key: true, text: "是" }, { key: false, text: "否" }], val ? 0 : 1);
                                        c.type = "toggle";
                                        c.value = val;
                                        _toggle(k, x, val);
                                    } else if (_.isObject(val)) {
                                        if (_.isBoolean(val.value)) {
                                            // optCycle.data[k][x] = val;

                                            c = _.cycle([{ key: true, text: "是" }, { key: false, text: "否" }], val.value ? 0 : 1)
                                            c.type = "toggle";
                                            c.value = val.value;
                                            _toggle(k, x, val);
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
                                _next(k, x);
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
                        opt[k] = {};
                        for (var x in o) {
                            var val = o[x];
                            // if (x == "random") {
                            //     for (var y in val) {
                            //         if (val[y]) {
                            //             optCycle.data[k][y].next(); //random()
                            //         }
                            //     }
                            // } else {

                            if (_.isBoolean(val)) {
                                opt[k][x] = val;
                            } else if (_.isObject(val)) {
                                if (_.isBoolean(val.value)) {
                                    opt[k][x] = val.value;
                                    if (val.auto) { //自动变值下一个
                                        // val.next && val.next();
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
                            // }
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
                            // if (x == "random") {
                            //     for (var y in val) {
                            //         var item = { key: y, value: val[y], text: y, method: _.camelCase("next", k, "Random", y) };
                            //         if (optCycle.data[k][y].text) {
                            //             item.text = optCycle.data[k][y].text;
                            //         }
                            //         if (_.isBoolean(val[y])) {
                            //             item.value = optCycle.filters.toggle(val[y]);
                            //         }
                            //         tab.random.push(item);
                            //     }
                            // } else 
                            if (x == "text") {
                                tab[x] = val;
                            } else if (x == "switch") {
                                tab[x] = val;
                                tab[x + "Method"] = _.camelCase("next", k, x);
                            } else if (x == "active") {
                                tab[x] = val;
                            } else {
                                var item = { key: x, value: val, text: x, method: _.camelCase("next", k, x), id: k + "_" + x };
                                if (_.isBoolean(val)) {
                                    item.filter = "toggle";
                                    item.value = optCycle.filters.toggle(val);
                                } else if (_.isNumber(val)) {
                                    item.filter = "string";
                                } else if (_.isObject(val)) {
                                    item = _.extendMe(item, val);
                                    if (_.isBoolean(val.value)) {
                                        item.value = optCycle.filters.toggle(val.value);
                                    } else {
                                        if (_.isObject(val.val())) {
                                            item.value = val.val().text ? val.val().text : val.val();
                                        } else {
                                            if (["color", "lineColor"].indexOf(item.key) >= 0) {
                                                item.value = optCycle.filters.color(val.val());
                                            } else {
                                                item.value = val.val();
                                            }
                                        }
                                    }
                                    // if (val.text) {
                                    //     item.text = val.text;
                                    // }
                                    // if (val.auto) {
                                    //     item.auto = val.auto;
                                    // }
                                    // if(val.type){
                                    //     item.type=val.type;
                                    // }
                                    // if(val.values){
                                    //     item.values=val.values
                                    // }

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
        //把基础图形组合起来，然后还可以动
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
                            if (el.nodeName.toLowerCase() == "canvas") {
                                this.canvas = el;
                            } else {
                                this.canvas = document.createElement("canvas");
                                el.appendChild(this.canvas);
                            }
                        } else if (options.canvasid) {
                            this.canvas = _.$("#" + options.canvasid);
                            if (this.canvas.length == 0) {
                                this.canvas = document.createElement("canvas");
                                this.canvas.id = options.canvasid;
                            }
                        } else {
                            this.canvas = document.createElement("canvas");
                        }

                        this.context = this.canvas.getContext("2d");
                    }
                }

                if (_.isObject(options)) {
                    this.options = options;
                    this.attr(options);
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
                        if (options[t.v])
                            bg[t.k] = options[t.v]
                    });
                    this.background(bg);
                    this.callback = options.callback;
                }
                return this;
            },
            //比率
            ratio: function(key) {
                var wraper = this.canvas.parent() || document.documentElement;
                var screen = {
                    w: wraper.clientWidth,
                    h: wraper.clientHeight
                }
                var w = screen.w,
                    h = screen.h;
                if (_.isString(key)) {
                    if (key.indexOf(":") >= 0) {
                        key.replace(/(\d+):(\d+)/, function(match, x, y) {
                            h = w * y / x;
                        });
                    } else {
                        h = w * parseFloat(key);
                    }
                } else if (_.isNumber(key)) {
                    h = w * key;
                }
                this.canvas.setAttribute('width', w);
                this.canvas.setAttribute('height', h);
                return this;

            },
            fullscreen: function() {
                return this.ratio("fullscreen");
            },

            attr: function(opt) {
                for (var key in opt) {
                    //比率
                    if ("ratio" == key) {
                        this.ratio(opt[key])
                    }
                    if (["width", "height"].indexOf(key) >= 0) {
                        this.canvas[key] = opt[key];
                    }
                }
                return this;
            },
            background: function(opt) {
                var self = this;
                var canvas = self.canvas;
                var ctx = self.context;
                var src = opt.src,
                    size = opt.size,
                    position = opt.position,
                    repeat = opt.repeat,
                    color = opt.color;


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
                            var zoom = _.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
                            var newImgWidth = imgWidth * zoom,
                                newImgHeight = imgHeight * zoom;
                            if (position == 'center') {
                                var x = zoom <= 1 ? (canvasWidth - newImgWidth) / 2 : -(canvasWidth - newImgWidth) / 2,
                                    y = zoom <= 1 ? (canvasHeight - newImgHeight) / 2 : -(canvasHeight - newImgHeight) / 2;
                                ctx.drawImage(img, x, y, newImgWidth, newImgHeight);
                            } else {
                                ctx.drawImage(img, 0, 0, newImgWidth, newImgHeight);
                            }
                            break;
                        case "contain": //等比例缩放 框内contain 
                            var zoom = _.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
                            var newImgWidth = imgWidth * zoom,
                                newImgHeight = imgHeight * zoom;
                            if (position == 'center') {
                                var x = (canvasWidth - newImgWidth) / 2,
                                    y = (canvasHeight - newImgHeight) / 2;
                                ctx.drawImage(img, x, y, newImgWidth, newImgHeight);
                            } else {
                                ctx.drawImage(img, 0, 0, newImgWidth, newImgHeight);
                            }

                            if (repeat == "repeat") {
                                _.zipImg({
                                    img: img,
                                    zoom: zoom,
                                    callback: function() {
                                        var bg = ctx.createPattern(this, 'repeat');
                                        self.setFillStyle(bg);
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                                        ctx.fill();
                                    }
                                });
                            }
                            break;
                        case "stretch": //stretch 拉伸铺满
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            break;
                        case "auto":
                            ctx.drawImage(img, 0, 0);
                            break;
                        default:
                            ctx.drawImage(img, 0, 0);
                            break;
                    }
                })
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
            fill: function(opt) {
                var ctx = this.context;
                if (opt) {
                    if (opt.randomColor) {
                        opt.color = _.rgba();
                    }
                    if (opt.fill) {
                        this.setFillStyle(opt.color);
                        ctx.fill();
                    }
                }
                return this
            },
            stroke: function(opt) {
                var ctx = this.context;
                if (opt) {
                    this.setLineWidth(opt.lineWidth);
                    if (opt.randomColor) {
                        opt.color = _.rgb();
                    }
                    if (_.isUndefined(opt.stroke) || opt.stroke) {
                        this.setStrokeStyle(opt.lineColor || opt.color);
                        ctx.stroke();
                    }
                } else {
                    ctx.stroke();
                }
                return this;
            },
            render: function(opt) {
                this.fill(opt).stroke(opt);
                return this
            },

            //图形闭合
            closePath: function(opt) {
                var ctx = this.context;
                if (opt) {
                    var closed = _.isUndefined(opt.closed) ? true : opt.closed;
                    if (closed) {
                        ctx.closePath();
                    }
                } else {
                    ctx.closePath();
                }
            },
            //新开画布
            beginPath: function(opt) {
                var ctx = this.context;
                if (opt) {
                    var begin = _.isUndefined(opt.begin) ? true : opt.begin;
                    if (begin) {
                        ctx.beginPath();
                    }
                } else {
                    ctx.beginPath();
                }
            },

            clear: function(color) {
                var canvas = this.canvas;
                var ctx = this.context;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // this.setFillStyle(color || this.options.background || "#ffffff");
                // ctx.fillRect(0, 0, canvas.width, canvas.height);
            },
            //中心点
            central: function() {
                var canvas = this.canvas;
                return {
                    x: canvas.width / 2,
                    y: canvas.height / 2
                }
            },
            //默认参数
            default: function(opt) {
                var canvas = this.canvas;
                if (opt) {

                    return _.extend({}, this.default(), opt);
                } else {
                    return {
                        x: canvas.width / 2,
                        y: canvas.height / 2,
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
                ].forEach(function(t) {
                    if (!_.isUndefined(opt[t.k]))
                        opt[t.v] = opt[t.k];
                });
                return opt;
            },
            //连线
            link: function(vs, opt) {
                var self = this;
                var ctx = this.context;
                this.beginPath(opt);
                vs.forEach(function(t, i) {
                    if (t) {
                        if (i == 0) {
                            ctx.moveTo(t.x, t.y);
                        } else {
                            ctx.lineTo(t.x, t.y);
                        }
                    }
                })
                self.closePath(opt);
                self.render(opt);

                if (opt) {
                    //显示外切圆
                    if (opt.showExcircle) {
                        opt.text = "";
                        self.shape().circle(opt);
                        // _.shape(this).circle(opt);
                    }
                    //显示半径
                    if (opt.showRadius) {
                        var x = opt.x,
                            y = opt.y;
                        ctx.beginPath();
                        vs.forEach(function(t) {
                            ctx.moveTo(x, y);
                            ctx.lineTo(t.x, t.y)
                        })
                        self.render(opt);
                    }

                    var _shape = self.shape();
                    var verticesColor = _.rgb();
                    //显示顶点
                    if (opt.showVertices || opt.identifierVertices) {
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
                    }
                    //显示圆心
                    if (opt.showCenter) {
                        _shape.circle({
                            r: 3,
                            x: opt.x,
                            y: opt.y,
                            color: verticesColor,
                            fill: true
                        });
                    }

                }
                return this;
            },
            linkGroup: function(vsGroup, opt) {
                var self = this;
                // console.log("图形个数：" + vsGroup.length)
                // var result = {
                //     num: vsGroup.length
                // }
                // self.callback && self.callback(result);
                if (opt && opt.animate) { //动画
                    vsGroup.forEach(function(t, i) {
                        setTimeout(function() {
                            self.link(t, opt)
                        }, 200 * i);
                    })
                } else {
                    vsGroup.forEach(function(t) {
                        self.link(t, opt)
                    })
                }
                return self;
            },
            //图形
            shape: function(opt) {
                opt = this.shortName(opt);
                return _.shape(this, opt);
            },
            //图形组合
            group: function(opt) {
                opt.group = this.shortName(opt.group);
                opt.group = this.default(opt.group);
                opt.shape = this.default(opt.shape);
                var t;
                if (opt.group && opt.group.switch == "on") {
                    t = _shapeGroup(this, opt);
                } else {
                    // t = _shape(this, opt.shape);
                    t = this.shape(opt.shape);
                }
                this.canvas.callback && this.canvas.callback.call(this.context, this.context);
                return t;
            },
            //运动
            motion: function(opt) {
                var self = this;
                opt.motion = this.shortName(opt.motion);
                return _motion(this, opt);
            },
            //star
            setup: function(opt) {
                this.motionCache && this.motionCache.stop();
                if (opt.motion && opt.motion.switch == "on") {
                    this.motionCache = this.motion(opt);
                } else {
                    this.group(opt);
                }
            },
            stop: function() {
                this.motionCache && this.motionCache.stop();
            },
            //路径
            path: function(opt) {
                var self = this;
                var opt = self.default(opt);
                // var x = opt.x,
                //     y = opt.y,
                //     r = opt.r,
                //     color = opt.color,
                //     shape = opt.shape || "circle";

                // self[shape](opt);
            },
            verticesGroup: function(opt) {
                var self = this;
                var path = self.vertices(opt.group); //path
                var vsGroup = []
                path.forEach(function(t) {
                    var vs = self.vertices(_.extend({}, opt.shape, { x: t.x, y: t.y }));
                    vsGroup.push(vs);
                })
                return vsGroup;
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
                for (var i = 0; i < step; i++) {
                    var p = _.point(_.extend(opt, {
                        r: interval,
                        a: direction
                    }))
                    vs.push(p)
                }
                return vs;
            },
            translateX: function(opt, tx) {

            },
            translateY: function(opt, ty) {

            },
            //相似图形 ， 变大小
            scale: function() {
                //context.scale(scalewidth,scaleheight);

            },

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
            //旁切圆
            escribedcircle: function(opt) {

            },
            //则该三角形内切圆圆心坐标：
            // [ax1+bx2+cx3] / [a+b+c]， [ay1+by2+cy3] / [a+b+c]
            //半径 r=s/p  s=p(p-a)(p-b)([-c])^1/2
            incircle: function(opt) {
                // var vs = this.vertices(opt);
                // var num=3,d=[],p=0;
                // for (var i = 0; i < num; i++) {
                //     d[i]=this.distance(vs[i],vs[i>=num?0:i+1]);
                //     p +=d[i];
                // }
                // p=p/2;
            },
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
                    if (typeof(this.w) == "undefined") {
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
                this.w.postMessage({ name: name, act: "open", cfg: _.extend({}, this.data, cfg) });
                console.log("task open: " + name);
                return this;
            },
            close: function(name) {
                this.w.postMessage({ name: name, act: "close" })
                console.log("task close: " + name);
                return this;
                // this.w.terminate();
            }
        }
        tasker.prototype.init.prototype = tasker.prototype;


        //页面滚动
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

                    // this=_.extend(this,opetions)
                    // self.root=document.doctype ? window.document.documentElement : document.body
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
                self.isRoot = ["HTMLHtmlElement", "HTMLBodyElement", 'htmldocument'].map(function(t) {
                    return t.toLowerCase();
                }).indexOf(_.type(self.el)) >= 0 ? true : false;

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
                return this.el.scrollTop == 0;
            },
            atBottom: function() { //到底
                if (this.isRoot) {
                    return this.el.scrollTop + this.el.clientHeight == this.el.offsetHeight;
                } else {
                    return this.el.scrollTop + this.el.clientHeight == this.el.scrollHeight;
                }
            },

            toTop: function(callback) {
                // if (this.isRoot) {
                //     window.scrollTo(0, 0);
                // } else {
                //     this.el.scrollTop = 0;
                // }
                this.el.scrollTop = 0;
                callback && callback.call(this.el);
            },
            toBottom: function(callback) {
                var self = this;
                // if (this.isRoot) {
                //     this.el.scrollTop = this.el.scrollHeight;
                //     // window.scrollTo(0, this.el.offsetHeight);
                //     // this.el.scrollTop = this.el.offsetHeight - this.el.clientHeight;
                //     // window.scrollTo(0, this.el.offsetHeight);

                //     // if (_.evnt.isSafari) {
                //     //     height -= 40;
                //     // }
                //     // var height = window.document.documentElement.offsetHeight

                //     //document.body.scrollTop = document.body.scrollHeight

                //     // var _toBottom = function() {
                //     //     self.timer && clearTimeout(self.timer);
                //     //     self.el.scrollTop = self.el.scrollHeight;
                //     //     self.timer = setTimeout(function() {
                //     //         _toBottom()
                //     //     }, 100)
                //     // }
                //     // _toBottom();

                // } else {
                //     this.el.scrollTop = this.el.scrollHeight - this.el.clientHeight;
                // }

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
                        // if (!distance && self.atTop.call(self)) { //这个判断不准确 safari弹出键盘中
                        //     self.onTop && self.onTop();
                        //     return;
                        // }
                        // if (self.isRoot) {
                        //     // window.scrollTo(0, -1 * step);
                        //     window.scrollBy(0, -1 * step);
                        // } else {
                        //     self.el.scrollTop -= step;
                        // }
                        self.el.scrollTop -= step;
                        break;
                    case "down":
                        // if (!distance && self.atBottom.call(self)) {
                        //     self.onBottom && self.onBottom();
                        //     return
                        // }
                        // if (self.isRoot) {
                        //     // window.scrollTo(0, step);
                        //     window.scrollBy(0, step);
                        //     //fixed按钮 灵魂出窍的问题，导致无法点击
                        //     // self.el.scrollTop=self.el.scrollTop;
                        //     // self.srollerTimer=setTimeout(function(){
                        //     //     self.el.scrollTop=self.el.scrollTop;
                        //     // },400)

                        // } else {
                        //     self.el.scrollTop += step;
                        // }
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

                // this.interval && clearInterval(this.interval);
            }
        }
        scroller.prototype.init.prototype = scroller.prototype;


        //路由
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

                    // if (_.isArray(options.config)) {
                    //     this.configs = options.config;
                    // } else if (_.isObject(options.config)) {
                    //     for (var page in options.config) {
                    //         this.push(options.config[page]);
                    //     }
                    // }

                    // this.pageAppend = options.pageAppend || function() {};
                    // this.defaultPage = this._find('name', options.defaultPage);
                }
                // this.container = _.$("#container");

                addEvent("hashchange", window, function() {
                    var u = self.parseUrl();
                    self._go(u.route);

                })




                // addEvent("hashchange", window, function() {
                //     var state = history.state || {};
                //     var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
                //     var page = self._find('url', url) || self.defaultPage;
                //     if (state.pageIndex <= self.pageIndex || self._findInStack(url)) {
                //         self._back(page);
                //     } else {
                //         self._go(page);
                //     }
                // })


                //hash改变触发
                // toucher({
                //     el: window,
                //     type: "hashchange",
                //     callback: function() {
                //         var u = self.parseUrl();

                //         self._go(u.route);
                //         // var state = history.state || {};
                //         // var url = location.hash.indexOf('#') === 0 ? location.hash : '#';


                //         // var page = self._find('url', url) || self.defaultPage;
                //         // if (state.pageIndex <= self.pageIndex || self._findInStack(url)) {
                //         //     self._back(page);
                //         // } else {
                //         //     self._go(page);
                //         // }
                //     }
                // });



                //浏览器后退触发
                // toucher({
                //     el: window,
                //     type: "popstate",
                //     callback: function() {
                //         var state = history.state || {};
                //         var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
                //         var page = self._find('url', url) || self.defaultPage;
                //         if (state.pageIndex <= self.pageIndex || self._findInStack(url)) {
                //             self._back(page);
                //         } else {
                //             self._go(page);
                //         }
                //     }
                // });


                // $(window).on('hashchange', function() {
                //     var state = history.state || {};
                //     var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
                //     var page = self._find('url', url) || self.defaultPage;
                //     if (state.pageIndex <= self.pageIndex || self._findInStack(url)) {
                //         self._back(page);
                //     } else {
                //         self._go(page);
                //     }
                // });

                // window.addEventListener('popstate', function(e) {
                //     if (history.state) {
                //         var state = e.state;
                //         console.log(state.url);
                //         //do something(state.url, state.title);
                //     }
                // }, false);

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
                // var config = this._find('name', to);
                // if (!config) {
                //     return;
                // }
                // location.hash = config.url;
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
            // _go: function(config) {
            //     if (config) {
            //         this.pageIndex++;

            //         history.replaceState && history.replaceState({ pageIndex: this.pageIndex }, '', location.href);

            //         // var html = _.$(config.template).html();
            //         // var $html = _.$(config.template).addClass('slideIn').addClass(config.name);
            //         // $(html).addClass('slideIn').addClass(config.name);
            //         // $html.on('animationend webkitAnimationEnd', function() {
            //         //     $html.removeClass('slideIn').addClass('js_show');
            //         // });

            //         // if (config.template) {
            //         //     var $html = _.$(config.template);
            //         //     if ($html) {
            //         //         $html.addClass('slideIn').addClass(config.name);
            //         //         this.container.append($html);
            //         //         this.pageAppend && this.pageAppend.call(this, $html);
            //         //         this.pageStack.push({
            //         //             config: config,
            //         //             dom: $html
            //         //         });
            //         //     }
            //         // }


            //         if (!config.isBind) {
            //             this._bind(config);
            //         }
            //     }
            //     return this;
            // },
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
                    // var html = $(config.template).html();
                    // var $html = $(html).addClass('js_show').addClass(config.name);

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
                // stack.dom.addClass('slideOut').on('animationend webkitAnimationEnd', function() {
                //     stack.dom.remove();
                // });

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
                if (_.isArray(val) || _.isObject(val)) {
                    // val = JSON.stringify(val);
                    val = _.stringify(val);
                }
                return val;
            },
            //数组第一个
            first: function(val) {
                if (_.isArray(val)) {
                    val = val[0];
                }
                return val;
            },
            last: function(val) {
                if (_.isArray(val)) {
                    val = val[val.length - 1];
                }
                return val;
            },
            pre: function(val) {
                return _.preHtml(val);
            },
            //取整 四舍五入
            int: function(val) {
                if (_.isNumber(Number(val))) {
                    return Math.round(Number(val));
                } else {
                    return val;
                }
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
                if (_.isNumber(Number(val))) {
                    return Math[t](Number(val));
                } else {
                    return val;
                }
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
                if (len > 0 && fs[len - 1] != "string") { fs.push("string"); }
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
                    if (filter.indexOf("$") == 0) { //filter map
                        filter = eval("data." + filter.replace("$", ""));
                    }
                    if ("$index" == name.toLowerCase()) {
                        return $index++;
                    } else if ("$length" == name.toLowerCase()) {
                        return $length;
                    } else if ("$this" == name.toLowerCase()) {
                        val = data;
                    } else if (reg_operation_symbol.test(name)) {
                        val = data.cmd(name)
                    } else {
                        val = _.getVal(data, name);
                    }
                } catch (e) {
                    console.log(e, data);
                }
                if (_.isUndefined(val)) {
                    val = "";
                }
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

            if (_.isEmpty(tpl) && _.isEmpty(groupTpl)) {
                return "";
            }

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
                if ((moreTpl || lazyTpl) && loopNumber >= $length) {
                    loopNumber = 3
                }

                var ps = [],
                    lastGroup = "",
                    currGroup = "";

                for (var i = 0; i < $length; i++) {
                    var item = data[i];

                    !_.isUndefined(groupTpl) && (function() { //分组模板
                        currGroup = parseTag.call(self, groupTpl, item);
                        if (currGroup != lastGroup) {
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
                str = ps.join("");
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
            if (_.hasAttr(this, name)) {
                id = this.attr(name);
                if (id == "this" || _.isEmpty(id)) {
                    //用于不需要数据数据 ，但有指令的区块
                    //这个区块dom内的html不需要重置,意味着之前通过dom操作获取的节点，在模板解析后还可以用。
                    // tpl = _.text(this).trim();
                    tpl = _.html(this).trim();
                } else {
                    tpl = getTpl(id)
                }
            }
            return tpl;
            // return {
            //     id: id,
            //     name: name,
            //     tpl: tpl,
            // }
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
            // tpl=self.tpl;
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
            // if (_.hasAttr(el, TEMPLATE)) { //有模板情况
            //     loop = "auto"; //模板标记无限循环次数  
            // } else if (_.hasAttr(el, GROUP)) {

            // } else {
            //     tpl = el.html();
            //     loop = "1"; //非模板不循环
            //     if (!reg_tpl_tag.test(tpl)) {
            //         parseDirective.call(self, el, data);
            //         return false;
            //     }
            // }

            // if(_.hasAttr(el),"if"){
            //     condition=el.attr("if");
            //     console.log(condition)
            // }


            if (_.hasAttr(el, SYNTAX)) {
                syntax = el.attr(SYNTAX);
            }
            if (_.hasAttr(el, NOLOOP)) { //数组不循环
                loop = "1";
            }
            if (_.hasAttr(el, LOOP)) {
                loop = el.attr(LOOP);
            }
            if (_.hasAttr(el, PAGESIZE)) { //分页
                loop = el.attr(PAGESIZE);
            }
            if (_.hasAttr(el, DATA)) { //指定数据子对象
                var child = el.attr(DATA);
                // if (_.contains(_.keys(data), child.split(".")[0])) {
                // if (_.keys(data).indexOf(child.split(".")[0]) != -1) {
                // if (Object.prototype.hasOwnProperty.call(data, child.split(".")[0])) {
                if (_.has(data, child)) {
                    data = eval("data." + child);
                }
            }
            if (_.isArray(data)) { //数组
                if (keyword && _.hasAttr(el, KEYWORD)) { //关键字查询
                    var name = el.attr(KEYWORD);
                    data = _.filter(data, function(item) {
                        var ks = name.split(",")
                        if (ks.length == 1) {
                            return _.has(_.getVal(item, name), keyword);
                        } else {
                            var flag = false;
                            ks.forEach(function(name) {
                                if (_.has(_.getVal(item, name), keyword)) {
                                    flag = true;
                                }
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

            var tplConfig = _.extend({}, self, {
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
                    if (method && _.isFunction(method)) {
                        method.call(self, this, ev);
                    }
                }
            };

            var dragHandler = function() {
                console.log("dragHandler");

            }
            StandardDirectives[ON] = onHandler;

            var type;
            _.each(StandardDirectives, function(fn, key) {
                if (key == DRAG) {
                    type = DRAG;
                } else {
                    type = TAP;
                }
                var el = _.$(key.brackets(elem));

                if (ON != key) {
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

                        if (newVal != oldVal) {
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
                        if (_.isEmpty(self.el)) {
                            return;
                        }
                        break;
                    case 1:
                        if (_.isArray(options)) {
                            options.forEach(function(t) {
                                template(t)
                            })
                            return;
                        } else if (_.isObject(options)) {
                            _.each(options, function(v, k) {
                                switch (k) {
                                    case "el":
                                        self.el = options.el;
                                        if (_.isString(self.el)) {
                                            self.selector = self.el;
                                            self.el = _.query(self.el);
                                        }
                                        //转化jquery =>Element
                                        if (_.isJQuery(self.el)) {
                                            if (self.el.length == 1) {
                                                self.el = _.autoid(self.el.get(0));
                                            } else {
                                                var eles = [];
                                                self.el.each(function(item, idex) {
                                                    // eles.push(_.autoid(self));
                                                    eles.push(_.autoid(item));
                                                });
                                                self.el = eles;
                                            }
                                        }
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
                                        //事件模块
                                        // self.toucher = toucher = toucher(self.el);
                                        break;
                                    case "data":
                                        self.data = options.data;

                                        if (_.isFunction(options.data)) {
                                            self.data = options.data();
                                        }

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
                                        self.methods = _.extend({}, customMethods, v);
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


                customFilters = _.extend({}, StandardFilters, self.filters);
                StandardDirectives = _.extend({}, StandardDirectives, self.directives);
                // self = _.extend({ methods: {} }, self)
                _.each(self.directives, function(fn, key) {
                    self.methods["_on_" + key] = fn;
                })
                options = _.extend({}, options, { el: self.el, methods: self.methods });
                //before render
                _.isFunction(self.before) && self.before.call(self, self.data);
                var el = self.el;
                if (self.act == "cloneBefore") {
                    var cloneEl = _.autoid(self.el.cloneNode(true), true);
                    self.el.parentNode.insertBefore(cloneEl, self.el);
                    options.act = "";
                    el = options.el = cloneEl;

                }
                if (self.act == "cloneAfter") {
                    var cloneEl = _.autoid(self.el.cloneNode(true), true);
                    self.el.parentNode.appendChild(cloneEl, self.el);
                    options.act = "";
                    el = options.el = cloneEl;
                }
                if (_.isElement(el)) {
                    self.parser.call(options, el);
                } else if (_.isArray(el) && _.size(el) > 0) {
                    el.each(function(item, index) {
                        // self.parser.call(options, item);
                        self.parser.call(_.extend({}, options, { el: item }), item);
                    });
                }
                //render ok
                // _.isFunction(self.callback) && self.callback.call(self, self.data);
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
                if (self.template || _.hasAttr(el, TEMPLATE) || _.hasAttr(el, GROUP)) {
                    parseEl.call(self);
                } else {
                    // parseEl.call(templateConfig); //self
                    //只解析[template][group]标签下的模板语言
                    var ts = el.query(TEMPLATE.brackets(), GROUP.brackets());
                    if (_.size(ts) > 0) {
                        ts.each(function(item, index) {
                            parseEl.call(_.extend({}, self, { el: item }));
                        });
                    }
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
        template.prototype = _.extend({}, template.prototype, _);
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