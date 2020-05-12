function kSelect(nums, k) {
    let pivot = nums[Math.floor(Math.random() * nums.length)]
    let low = nums.filter(num=>num < pivot);

    if (low.length +1 == k) {
        return pivot;
    }

    if (low.length >= k) {
        return kSelect(low, k);
    } else {
        let high = nums.filter(num=>num >=pivot);
        return kSelect(high, k - low.length);
    }
}

function median(nums) {
    let k = Math.floor(nums.length / 2);
    if (nums.length % 2) {
        return kSelect(nums, k);
    } else {
        return (kSelect(nums, k - 1) + kSelect(nums, k)) / 2;
    }
}


function boxMuller() {
    let u1 = Math.random() 
    let u2 = Math.random()
    let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    return [z0, z1];
} 

class Circle{
    static uidCounter = 0;

    constructor(x, y, dx, dy, radius, opacity, isMouse = false) {
        this.x = x
        this.y = y
        this.dx = dx
        this.dy = dy
        this.radius = radius
        this.opacity = opacity
        this.isMouse = isMouse

        this.uid = Circle.uidCounter++;
    }
    
    draw(ctx) {
        ctx.fillStyle = `rgba(235, 220, 152, ${this.opacity})`;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
    }

    tick(dt, maxX, maxY) {
        if (!this.isMouse) {
            this.x += this.dx * dt;
            this.y += this.dy * dt;
        }
        if (this.x + this.radius > maxX) {
            this.x = maxX - this.radius;
            this.dx = -this.dx;
        }
        if (this.y + this.radius > maxY) {
            this.y = maxY - this.radius;
            this.dy = -this.dy;
        }
        if (this.x - this.radius < 0) {
            this.x = this.radius
            this.dx = -this.dx;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius
            this.dy = -this.dy;
        }
    }
}

class KDTree {
    constructor(circles, splitThreshold, maxDepth) {
        this.isLeaf = maxDepth == 0 || circles.length <= splitThreshold;
        if (this.isLeaf) {
            this.circles = circles;
            return;
        }
        
        let xs = circles.map(c=>c.x);
        let ys = circles.map(c=>c.y);

        let rangeX = Math.max(...xs) - Math.min(...xs);
        let rangeY = Math.max(...ys) - Math.min(...ys);

        this.splitByX = rangeX > rangeY;

        if (this.splitByX) {
            this.splitPoint = median(xs);
            this.low = new KDTree(circles.filter(c=>c.x < this.splitPoint), splitThreshold, maxDepth - 1);
            this.high = new KDTree(circles.filter(c=>c.x >= this.splitPoint), splitThreshold, maxDepth - 1);
        } else {
            this.splitPoint = median(ys); 
            this.low = new KDTree(circles.filter(c=>c.y < this.splitPoint), splitThreshold, maxDepth - 1);
            this.high = new KDTree(circles.filter(c=>c.y >= this.splitPoint), splitThreshold, maxDepth - 1);
        }
    }

    query(x, y, radius) {
        if(this.isLeaf) {
            return this.circles.filter(c=>Math.pow(c.x-x, 2) + Math.pow(c.y-y, 2) <= Math.pow(radius, 2));
        }

        let results = [];
        if(this.splitByX) {
            if (x - radius < this.splitPoint) {
                results.push(...this.low.query(x,y,radius))
            }
            if (x + radius >= this.splitPoint) {
                results.push(...this.high.query(x,y,radius))
            }
        } else {
            if (y - radius < this.splitPoint) {
                results.push(...this.low.query(x,y,radius))
            }
            if (y + radius >= this.splitPoint) {
                results.push(...this.high.query(x,y,radius))
            }
        }
        return results;
    }
}

class Line{
    constructor(c1, c2) {
        this.c1 = c1;
        this.c2 = c2;
    }

    draw(ctx) {
        let d2 = Math.pow(this.c2.x - this.c1.x, 2) + Math.pow(this.c2.y - this.c1.y, 2);
        
        let opacity = Math.max(0, -d2/10000 + 1)

        ctx.strokeStyle = `rgba(240, 240, 240, ${opacity})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(this.c1.x, this.c1.y);
        ctx.lineTo(this.c2.x, this.c2.y);
        ctx.stroke();
    }
}

function connectCircles(circles, kdtree) {
    let radius = 100;
    let lines = [];
    circles.forEach(circle=> {
        let neighbors = kdtree.query(circle.x, circle.y, radius);
        neighbors.forEach(neighbor=>{
            if(neighbor.uid > circle.uid) lines.push(new Line(circle, neighbor))
        });
    })
    return lines;
}

function distance(c1, c2) {
    return Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2));
}

function* computeCollisions(kdtree, circles) {
    for (let circle of circles) {
      const candidates = kdtree.query(circle.x, circle.y, circle.radius + 15);
      const colliders = candidates.filter(
        (candidate) =>
          distance(circle, candidate) < circle.radius + candidate.radius &&
          circle.uid < candidate.uid
      );
  
      for (let collider of colliders) {
        yield [circle, collider];
      }
    }
  }

function computeElasticCollision(x1, y1, dx1, dy1, x2, y2, dx2, dy2) {
    // recompute velocities
    
    let dx1f =
      (dx2 * Math.pow(x1 - x2, 2) +
        (-((dy1 - dy2) * (x1 - x2)) + dx1 * (y1 - y2)) * (y1 - y2)) /
      (Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    let dy1f =
      (dy1 * Math.pow(x1 - x2, 2) +
        (-((dx1 - dx2) * (x1 - x2)) + dy2 * (y1 - y2)) * (y1 - y2)) /
      (Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    let dx2f =
      (dx1 * Math.pow(x1 - x2, 2) +
        ((dy1 - dy2) * (x1 - x2) + dx2 * (y1 - y2)) * (y1 - y2)) /
      (Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    let dy2f =
      (dy2 * Math.pow(x1 - x2, 2) +
        ((dx1 - dx2) * (x1 - x2) + dy1 * (y1 - y2)) * (y1 - y2)) /
      (Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  
    return [dx1f, dy1f, dx2f, dy2f];
  }
  
function separate(circle1, circle2) {
    const l = distance(circle1, circle2)

    const ux = (circle1.x - circle2.x) / l * (circle1.radius + circle2.radius - l) / 2
    const uy = (circle1.y - circle2.y) / l * (circle1.radius + circle2.radius - l) / 2

    circle1.x += ux;
    circle1.y += uy;

    circle2.x -= ux;
    circle2.y -= uy;
}

function randomBall(maxX, maxY) {
    let x = Math.random() * maxX;
    let y = Math.random() * maxY;
    
    let [dx, dy] = boxMuller();
    dx *= 20;
    dy *= 20;

    let radius = Math.random() * 10 + 5

    let opacity = Math.pow(Math.random(), 1.3) + 0.05;


    return new Circle(x,y, dx, dy, radius, opacity);
}

class Box {
    constructor(circles, maxX, maxY) {
        this.circles = circles;
        this.maxX = maxX;
        this.maxY = maxY;

        this.lines = [];

    }
    draw(ctx) {
        ctx.fillStyle = "rgb(43, 37, 79)";
        ctx.fillRect(0, 0, this.maxX, this.maxY);
        this.circles.forEach(circle=>circle.draw(ctx))
        this.lines.forEach(line=>line.draw(ctx))
    }

    tick(dt) {
        this.kdtree = new KDTree(this.circles, 3, 10);

        let itr = computeCollisions(this.kdtree, this.circles)
        for (let {value, done} = itr.next(); !done; {value, done} = itr.next()) {
            const [circle1, circle2] = value;
            [circle1.dx, circle1.dy, circle2.dx, circle2.dy] = computeElasticCollision(
                circle1.x, circle1.y, circle1.dx, circle1.dy, circle2.x, circle2.y, circle2.dx, circle2.dy);
            separate(circle1, circle2);
        }
        this.circles.forEach(circle=>circle.tick(dt, this.maxX, this.maxY));
        this.lines = connectCircles(this.circles, this.kdtree);
    }
}

let ctx = null;

let box = null;

function onResize() {
    let width = $(window).width();
    let height = $(window).height();
    $("canvas").width(width);
    $("canvas").height(height);
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    if (box) {
        box.maxX = width;
        box.maxY = height;
    }   
}

$(window).resize(onResize)

let lastT = 0;

function animate(t) {
    let dt = lastT ? (t - lastT)/1000 : 1/60;
    lastT = t;

    box.tick(Math.min(dt, 1));
    box.draw(ctx);
    requestAnimationFrame(animate);
}

let count = 200;

$('canvas').mouseenter(function(e) {
    let x = e.clientX;
    let y = e.clientY;
    
    box.circles[count] = new Circle(x,y,0,0,0,0,true);
})

$('canvas').mousemove(function(e) {
    let x = e.clientX
    let y = e.clientY
    box.circles[count].x = x
    box.circles[count].y = y
})

$('canvas').mouseleave(function() {
    box.circles.splice(count, 1)
})


$(function() {
    let width = $(window).width();
    let height = $(window).height();
    
    ctx = $('canvas')[0].getContext('2d');
    onResize();

    let circles = [];
    

    for (let i = 0; i < count; i++) {
        circles.push(randomBall(width, height));
    }


    box = new Box(circles, width, height);
    animate();

});