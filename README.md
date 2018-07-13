# h5draw
几何画图（h5）：开向几何世界的神奇校车出发了

![image](https://github.com/Walt2016/h5draw/blob/master/pic/fractal.gif)![image](https://github.com/Walt2016/h5draw/blob/master/pic/slider.gif)
![image](https://github.com/Walt2016/h5draw/blob/master/pic/track.gif)![image](https://github.com/Walt2016/h5draw/blob/master/pic/emitter.gif)
![image](https://github.com/Walt2016/h5draw/blob/master/pic/custom.gif)![image](https://github.com/Walt2016/h5draw/blob/master/pic/custom2.gif)


# DEMO：

[图形组合](https://walt2016.github.io/h5draw/slider.html)

[图形路径](https://walt2016.github.io/h5draw/track.html)

[一种发射粒子](https://walt2016.github.io/h5draw/emitter.html)

[一种植物分形](https://walt2016.github.io/h5draw/fractal.html)

[图形自定义](https://walt2016.github.io/h5draw/index.html)

[简单图形编辑器](https://walt2016.github.io/h5draw/editer.html)

# 代码示例：
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





# 交流互动：

几何画图qq群272831512
