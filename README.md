# h5draw
几何画图（h5）：开向几何世界的神奇校车出发了


|--|--|
|![image](https://github.com/Walt2016/h5draw/blob/master/pic/group.gif)|![image](https://github.com/Walt2016/h5draw/blob/master/pic/sierpinski.gif)| 
|![image](https://github.com/Walt2016/h5draw/blob/master/pic/diagonal.gif)|![image](https://github.com/Walt2016/h5draw/blob/master/pic/firework.gif)|
|![image](https://github.com/Walt2016/h5draw/blob/master/pic/spiral.gif)|![image](https://github.com/Walt2016/h5draw/blob/master/pic/spiralpolygon.gif)|


代码示例：
```
<canvas id="myCanvas"></canvas>
<script src="js/tpler.js"></script>
<script>
   var draw = _.draw({
        canvasid: "myCanvas",
        fullscreen: true
    });
    var opt={
        shape:{
            shape:"polygon",
            num:3,
            r:10,
            fill:true,
            a:0
        },
        group:{
            group:"polygon",
            num:7,
            r:30,
            colorful:"circle",
            rotation:true
        },
        motion:{
            motion:"rotate",
            speed:0.1
        }
    }
    draw.setup(opt)
</script>

```

DEMO：

[slider](https://walt2016.github.io/h5draw/slider.html)

[track](https://walt2016.github.io/h5draw/track.html)

[emitter](https://walt2016.github.io/h5draw/emitter.html)

[fractal](https://walt2016.github.io/h5draw/fractal.html)

[index](https://walt2016.github.io/h5draw/index.html)



交流互动：

几何画图qq群272831512
