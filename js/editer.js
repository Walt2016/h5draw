var draw = _.draw({
    canvasid: "myCanvas",
    fullscreen: true
});

var _editer = function() {
    //顶点
    var _vertex = function(start, end, sides) {
        var x1 = end.x - start.x,
            y1 = end.y - start.y,
            angle = 0;
        var points = [];
        for (var i = 0; i < sides; i++) {
            angle = 2 * Math.PI / sides * i;
            var sin = Math.sin(angle),
                cos = Math.cos(angle),
                newX = x1 * cos - y1 * sin,
                newY = y1 * cos + x1 * sin;
            points.push({
                x: Math.round(start.x + newX),
                y: Math.round(start.y + newY)
            });
        }
        return points;
    }
    var _mid = function _mid(p1, p2) {
        return {
            x: p1.x + (p2.x - p1.x) / 2,
            y: p1.y + (p2.y - p1.y) / 2
        };
    };
    var _dist = function(p1, p2) {
        return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y))
    }

    //相对位置信息
    var _pos = function(e) {
        var offset = {
            top: 0,
            left: 0
        }
        if (canvas && canvas.getBoundingClientRect) {
            offset = canvas.getBoundingClientRect()
        }
        var pos = _.pos(e)
        return {
            x: pos.x - offset.left,
            y: pos.y - offset.top
        }
    }

    var canvas,
        config = {},
        activeShape = {},
        drawing = false,
        current = [],
        points = [],
        activePointIndex = -1,
        currPos = {},
        data = {
            color: ["#333"].concat(_.color.circle(7)), //, "#fff"
            fill: [{ text: "否", name: "false" }, { text: "是", name: "true" }],
            shape: [{
                name: "cursor",
                text: "选择器"
            }, {
                name: "noose",
                text: "套索"
            }, {
                name: "line",
                text: "直线"
            }, {
                name: "polyline",
                text: "折线"
            }, {
                name: "circle",
                text: "圆形"
            }, {
                name: "triangle",
                text: "三角形"
            }, {
                name: "rectangle",
                text: "矩形"
            }, {
                name: "pentagon",
                text: "五边形"
            }]
        };

    var _setConfig = function(t, val) {
        if (t === "fill") {
            config[t] = val === "true";
        } else {
            config[t] = val
        }
    }
    var params = [];
    for (var t in data) {
        (function(t) {
            params[params.length] = {
                el: ".panel ." + t,
                data: data[t],
                callback: function(item) {
                    this.el.$(".item").first().addClass("active")
                    _setConfig(t, item[0].name || item[0])
                },
                events: function(item, ev) {
                    item.$(".item").removeClass("active");
                    ev.target.addClass("active");
                    _setConfig(t, ev.target.attr("name"))
                }
            }
        })(t);
    };
    console.log(params)
    tpler(params);

    function Editer(draw) {
        if (!(this instanceof Editer)) return new Editer(draw);
        canvas = draw.canvas;
        this.ctx = draw.context;
        this.width = draw.width;
        this.height = draw.height;
        this.group = [];

        var es = {
            mousedown: this.start,
            touchstart: this.start,
            mousemove: this.move,
            touchmove: this.move,
            mouseup: this.end,
            touchend: this.end
        }
        for (var key in es) {
            canvas.addEventListener(key, es[key].bind(this))
        }
        this._background()
        // 删除图形
        var self = this
        document.body.onkeydown = function(e) {
            if (e.keyCode == 8 || e.keyCode == 46) {
                for (var i = 0, len = self.group.length; i < len; i++) {
                    if (self.group[i] === activeShape) {
                        self.group.splice(i--, 1);
                        self._background();
                        self._renderGroup();
                        break;
                    }
                }
            }
        };
    }
    return _.createClass(Editer, {
        //背景
        _background: function(pos) {
            var ctx = this.ctx;
            var interval = 30
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.save()
            ctx.lineWidth = 0.5;
            draw._grid(interval, 'rgba(0,0,0,0.4)');
            ctx.restore();
        },
        //引导线
        _guidewires: function(p) {
            var ctx = this.ctx;
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,230,0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x + 0.5, 0);
            ctx.lineTo(p.x + 0.5, this.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, p.y + 0.5);
            ctx.lineTo(this.width, p.y + 0.5);
            ctx.stroke();
            ctx.restore();
        },
        _isPointInPath: function(t, p, i, pos) {
            var ctx = this.ctx;
            if (pos && ctx.isPointInPath(pos.x, pos.y)) { //选中控制点
                // console.log(pos)
                ctx.fillStyle = '#333';
                ctx.arc(p.x, p.y, 7, 0, Math.PI * 2, false);
                ctx.fill();
                activeShape = t
                // activePoint=t.points[i]
                activePointIndex = i; //9999
                console.log(i)
            }
        },
        //控制点
        _points: function(t, pos) {
            var ctx = this.ctx;
            var self = this;
            ctx.save();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#999';
            t.points.forEach(function(p, i) {
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2, false);
                self._isPointInPath(t, p, i, pos);
                ctx.stroke();
                ctx.fill();

                ctx.fillStyle = "#000";
                ctx.font = "12px Verdana";
                var measure = ctx.measureText("" + i);
                ctx.fillText(i, p.x - measure.width / 2, p.y + 6);
            });
            ctx.restore();
        },
        //中心点
        _center: function(t, pos) {
            var ctx = this.ctx;
            ctx.save();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#F00";
            ctx.fillStyle = "#011";
            ctx.beginPath();
            ctx.arc(t.center.x, t.center.y, 5, 0, Math.PI * 2, false);
            this._isPointInPath(t, t.center, 9999, pos);
            ctx.stroke();
            ctx.fill();
            ctx.restore();
        },
        _render: function(t, pos) {
            //图形
            switch (t.shape) {
                // case "noose":
                //     if (drawing && config.shape !== "cursor") {
                //         this._link(current, config.color, true, config.fill)
                //     } else {
                //         this._link(t.points, t.color, true, t.fill);
                //     }
                //     break;
                case "polyline":
                case "line":
                    this._link(t.points, t.color, false, t.fill);
                    break;
                case "circle":
                    this._circle(t.points, t.color, t.fill)
                    break;
                default:
                    this._link(t.points, t.color, true, t.fill);
                    break;
            }
            //控制点 
            this._points(t, pos);
            //中心点
            this._center(t, pos);
        },
        //显示图形组合
        _renderGroup: function(pos) {
            var ctx = this.ctx;
            var self = this;
            this.group.forEach(function(t) {
                ctx.fillStyle = t.color;
                ctx.strokeStyle = t.color;
                self._render(t, pos);
            })
        },
        //当前记录   创建节点
        _createPoints: function(p) {
            var ctx = this.ctx;
            switch (config.shape) {
                case "line":
                    points[1] = p
                    break;
                case "circle":
                    points[1] = p
                    break;
                case "triangle":
                    points = _vertex(current[0], p, 3)
                    break;
                case "rectangle":
                    points = _vertex(current[0], p, 4)
                    break;
                case "pentagon":
                    points = _vertex(current[0], p, 5)
                    break;
                default:
                    var dist = _dist(points[points.length - 1], p)
                    if (dist > 30) {
                        points[points.length] = p
                    }
                    current[current.length] = p
                    break;
            }
            activeShape.points = points;
            this._calcCenter();
            if (config.shape === "noose") {
                this._link(current, config.color, true, config.fill)
                this._points(activeShape);
                this._center(activeShape);
            } else {
                this._render(activeShape);
            }

            // this._render(activeShape);

            ctx.restore();
        },
        //根据控制点计算 中心点
        _calcCenter: function() {
            var x = 0,
                y = 0,
                len = activeShape.points.length;
            activeShape.points.forEach(function(t) {
                x += t.x;
                y += t.y
            })

            activeShape.center = {
                x: x / len << 0,
                y: y / len << 0,
            }
        },
        //根据中心点位移计算 控制点
        _calcPoints: function(p) {
            var offset = {
                x: p.x - activeShape.center.x,
                y: p.y - activeShape.center.y,
            }
            activeShape.points = activeShape.points.map(function(t) {
                return {
                    x: t.x + offset.x,
                    y: t.y + offset.y,
                }
            })
            activeShape.center = p
        },
        _link: function(ps, color, closePath, fill) {
            var ctx = this.ctx;
            ctx.save()
            ctx.beginPath();
            ctx.strokeStyle = color;
            ps.forEach(function(p, i) {
                ctx[i === 0 ? "moveTo" : "lineTo"](p.x, p.y);
            })
            closePath && ctx.closePath();
            ctx.stroke();

            if (fill) {
                ctx.fillStyle = color;
                ctx.fill()
            }

            //     // var midPoint = _mid(current[i], current[i + 1]);
            //     // ctx.quadraticCurveTo(current[i].x, current[i].y, midPoint.x, midPoint.y);
        },
        _circle: function(ps, color, fill) {
            var ctx = this.ctx;
            var p = _mid(ps[0], ps[1]);
            var dist = _dist(ps[0], ps[1]) / 2;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, dist, 0, Math.PI * 2, false);
            ctx.stroke();
            if (fill) {
                ctx.fillStyle = color;
                ctx.fill()
            }
            ctx.restore();
        },

        start: function(e) {
            var p = _pos(e);
            drawing = true
            current = [p];
            points = [p];
            this._background.call(this, p)
            this._renderGroup.call(this, p)
            if (config.shape !== "cursor") {
                activeShape = _.extend({},
                    config, {
                        points: points
                    });
            }
        },
        move: function(e) {
            var p = _pos(e);
            this._background.call(this, p)
            this._renderGroup.call(this, p)
            if (drawing) { //画 
                if (config.shape !== "cursor") {
                    this._createPoints.call(this, p);
                    this._guidewires.call(this, p);
                } else {
                    this._drag.call(this, p);
                }
            }
        },
        end: function(e) {
            var p = _pos(e);
            drawing = false;
            if (config.shape !== "cursor") { //增加图形
                this.group[this.group.length] = activeShape
            } else {
                this._drag.call(this, p);
            }
            this._background.call(this, p)
            this._renderGroup.call(this, p)
            currPos = p;
            // console.log(points)
            console.log("end", this.group)
        },
        //拖动
        _drag: function(p) {
            if (config.shape === "cursor") {
                if (activePointIndex === 9999) { //拖动中心点
                    this._calcPoints.call(this, p)
                    // activeShape.center = p
                } else if (activePointIndex >= 0) { //拖动控制点
                    activeShape.points[activePointIndex] = p
                    this._calcCenter.call(this)
                }
            }
        }
    })

}();
_editer(draw);