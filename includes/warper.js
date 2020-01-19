
 (function(){

var ImgWarper = ImgWarper || {};

ImgWarper.Warper = function(img, multiplier, optGridSize, optAlpha) {
  this.alpha = optAlpha || 3;
  this.gridSize = multiplier || 1;
  this.multiplier = multiplier || 1;
    var that = this;
    // this is source canvas 
    // that.cvs = ctx.canvas;
    // that._ctx = ctx;
    // and this is source imageData
    
    that.canvas = document.createElement('canvas');
    that.ctx = that.canvas.getContext("2d");
    
    that.canvas.width = img.width * this.multiplier;
    that.canvas.height =img.height * this.multiplier;
    
    that.ctx.drawImage(img, 0, 0, that.canvas.width, that.canvas.height);
    var imgData = that.ctx.getImageData(0, 0, that.canvas.width, that.canvas.height);


    that.width = that.canvas.width;
    that.height = that.canvas.height;
    that.imgData = imgData.data;
    that.bilinearInterpolation = 
      new ImgWarper.BilinearInterpolation(that.width, that.height, that.canvas);
  
    that.ctx.setTransform(1, 0, 0, 1, 0, 0);
    that.ctx.clearRect(0, 0, img.width, img.height);
    that.ctx.putImageData(imgData, 0, 0, 0, 0, that.canvas.width, that.canvas.height);
    console.log('warper created');
  
    that.grid = [];
    for (var i = 0; i < that.width ; i += that.gridSize) {
      for (var j = 0; j < that.height ; j += that.gridSize) {
        a = new ImgWarper.Point(i,j);
        b = new ImgWarper.Point(i + that.gridSize, j);
        c = new ImgWarper.Point(i + that.gridSize, j + that.gridSize);
        d = new ImgWarper.Point(i, j + that.gridSize);
        that.grid.push([a, b, c, d]);
      }
    }
    return that;
}

ImgWarper.Warper.prototype.warp = function(fromPoints, toPoints) {
  var that = this;
  fromPoints = fromPoints.map(function(p){ 
    return new ImgWarper.Point(p.x * that.multiplier, p.y * that.multiplier);
   });
   toPoints = toPoints.map(function(p){ 
    return new ImgWarper.Point(p.x * that.multiplier, p.y * that.multiplier);
   });
  var deformation = 
    new ImgWarper.AffineDeformation(toPoints, fromPoints, this.alpha);
  var transformedGrid = [];
  for (var i = 0; i < this.grid.length; ++i) {
    transformedGrid[i] = [
        deformation.pointMover(this.grid[i][0]),
        deformation.pointMover(this.grid[i][1]),
        deformation.pointMover(this.grid[i][2]),
        deformation.pointMover(this.grid[i][3])];
  }
  var newImg = this.bilinearInterpolation
    .generate(this.imgData, this.grid, transformedGrid);
  this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.ctx.putImageData(newImg, 0, 0, 0, 0, this.canvas.width, this.canvas.height);

  // this._ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
  // this._ctx.drawImage(this.canvas, 0, 0, this.cvs.width, this.cvs.height);
  return this.canvas;
}

ImgWarper.Warper.prototype.drawGrid = function(fromPoints, toPoints) {
  // Forward warping.
  var deformation = 
    new ImgWarper.AffineDeformation(fromPoints, toPoints, this.alpha);
  var context = this.canvas.getContext("2d");
  for (var i = 0; i < this.grid.length; ++i) {
    context.beginPath();
    var point = deformation.pointMover(this.grid[i][0]);
    context.moveTo(point.x, point.y);
    for (var j = 1; j < 4; ++j) {
      point = deformation.pointMover(this.grid[i][j]);
      context.lineTo(point.x, point.y);
    }
    context.strokeStyle = 'rgba(170, 170, 170, 0.5)';
    context.stroke();
  }
}

ImgWarper.AffineDeformation = function(fromPoints, toPoints, alpha) {
  this.w = null;
  this.pRelative = null;
  this.qRelative = null;
  this.A = null;
  if (fromPoints.length != toPoints.length) {
    console.error('Points are not of same length.'); 
    return;
  }
  this.n = fromPoints.length;  
  this.fromPoints = fromPoints;
  this.toPoints = toPoints;
  this.alpha = alpha;
};

ImgWarper.AffineDeformation.prototype.pointMover = function (point){
  if (null == this.pRelative || this.pRelative.length < this.n) {
    this.pRelative = new Array(this.n); 
  }
  if (null == this.qRelative || this.qRelative.length < this.n) {
    this.qRelative = new Array(this.n); 
  }
  if (null == this.w || this.w.length < this.n) {
    this.w = new Array(this.n);
  }
  if (null == this.A || this.A.length < this.n) {
    this.A = new Array(this.n); 
  }

  for (var i = 0; i < this.n; ++i) {
    var t = this.fromPoints[i].subtract(point);
    this.w[i] = Math.pow(t.x * t.x + t.y * t.y, -this.alpha);
  }

  var pAverage = ImgWarper.Point.weightedAverage(this.fromPoints, this.w);
  var qAverage = ImgWarper.Point.weightedAverage(this.toPoints, this.w);

  for (var i = 0; i < this.n; ++i) {
    this.pRelative[i] = this.fromPoints[i].subtract(pAverage);
    this.qRelative[i] = this.toPoints[i].subtract(qAverage);
  }

  var B = new ImgWarper.Matrix22(0, 0, 0, 0);

  for (var i = 0; i < this.n; ++i) {
    B.addM(this.pRelative[i].wXtX(this.w[i]));
  }

  B = B.inverse();
  for (var j = 0; j < this.n; ++j) {
    this.A[j] = point.subtract(pAverage).multiply(B)
      .dotP(this.pRelative[j]) * this.w[j];
  }

  var r = qAverage; //r is an point 
  for (var j = 0; j < this.n; ++j) {
    r = r.add(this.qRelative[j].multiply_d(this.A[j]));
  }
  return r;
};


/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/

ImgWarper.BilinearInterpolation = function(width, height, canvas){
  this.width = width;
  this.height = height;
  this.ctx = canvas.getContext("2d");
  this.imgTargetData = this.ctx.createImageData(this.width, this.height);
};

ImgWarper.BilinearInterpolation.prototype.generate = 
    function(source, fromGrid, toGrid) {
  this.imgData = source;
  for (var i = 0; i < toGrid.length; ++i) {
    this.fill(toGrid[i], fromGrid[i]);
  }
  return this.imgTargetData;
};

ImgWarper.BilinearInterpolation.prototype.fill = 
    function(sourcePoints, fillingPoints) {
  var i, j;
  var srcX, srcY;
  var x0 = fillingPoints[0].x;
  var x1 = fillingPoints[2].x;
  var y0 = fillingPoints[0].y;
  var y1 = fillingPoints[2].y;
  x0 = Math.max(x0, 0); 
  y0 = Math.max(y0, 0); 
  x1 = Math.min(x1, this.width - 1);
  y1 = Math.min(y1, this.height - 1);

  var xl, xr, topX, topY, bottomX, bottomY;
  var yl, yr, rgb, index;
  for (i = x0; i <= x1; ++i) {
    xl = (i - x0) / (x1 - x0);
    xr = 1 - xl;
    topX = xr * sourcePoints[0].x + xl * sourcePoints[1].x;
    topY = xr * sourcePoints[0].y + xl * sourcePoints[1].y;
    bottomX = xr * sourcePoints[3].x + xl * sourcePoints[2].x;
    bottomY = xr * sourcePoints[3].y + xl * sourcePoints[2].y;
    for (j = y0; j <= y1; ++j) {
      yl = (j - y0) / (y1 - y0);
      yr = 1 - yl;
      srcX = topX * yr + bottomX * yl;
      srcY = topY * yr + bottomY * yl;
      index = ((j * this.width) + i) * 4;
      if (srcX < 0 || srcX > this.width - 1 ||
          srcY < 0 || srcY > this.height - 1) {
        this.imgTargetData.data[index] = 255;
        this.imgTargetData.data[index + 1] = 255;
        this.imgTargetData.data[index + 2] = 255;
        this.imgTargetData.data[index + 3] = 0;
        continue;
      }
      var srcX1 = Math.floor(srcX);
      var srcY1 = Math.floor(srcY);
      var base = ((srcY1 * this.width) + srcX1) * 4;
      //rgb = this.nnquery(srcX, srcY);
      this.imgTargetData.data[index] = this.imgData[base];
      this.imgTargetData.data[index + 1] = this.imgData[base + 1];
      this.imgTargetData.data[index + 2] = this.imgData[base + 2];
      this.imgTargetData.data[index + 3] = this.imgData[base + 3];
    }
  }
};

ImgWarper.BilinearInterpolation.prototype.nnquery = function(x, y) {
  var x1 = Math.floor(x);
  var y1 = Math.floor(y);
  var base = ((y1 * this.width) + x1) * 4;
  return [
    this.imgData[base],
    this.imgData[base + 1],
    this.imgData[base + 2],
    this.imgData[base + 3]];
};

ImgWarper.BilinearInterpolation.prototype.query = function(x, y) {
  var x1,x2,y1,y2;
  x1 = Math.floor(x); x2 = Math.ceil(x);
  y1 = Math.floor(y); y2 = Math.ceil(y);

  var c = [0, 0, 0, 0];   // get new RGB

  var base11 = ((y1 * this.width) + x1) * 4;
  var base12 = ((y2 * this.width) + x1) * 4;
  var base21 = ((y1 * this.width) + x2) * 4;
  var base22 = ((y2 * this.width) + x2) * 4;
  // 4 channels: RGBA
  for (var i = 0; i < 4; ++i) {
    t11 = this.imgData[base11 + i];
    t12 = this.imgData[base12 + i];
    t21 = this.imgData[base21 + i];
    t22 = this.imgData[base22 + i];
    t = (t11 * (x2 - x) * (y2 - y) + 
        t21 * (x - x1) * (y2 - y) + 
        t12 * (x2 - x) * (y - y1) + 
        t22 * (x - x1) * (y - y1)) / ((x2 - x1) * (y2 - y1));
    c[i] = parseInt(t);
  }
  return c;
};


/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/

ImgWarper.Matrix22 = function(N11, N12, N21, N22) {
  this.M11 = N11;
  this.M12 = N12;
  this.M21 = N21;
  this.M22 = N22;
};

ImgWarper.Matrix22.prototype.adjugate = function () {
  return new ImgWarper.Matrix22(
      this.M22, -this.M12, 
      -this.M21, this.M11);
};

ImgWarper.Matrix22.prototype.determinant = function () {
  return this.M11 * this.M22 - this.M12 * this.M21;
};

ImgWarper.Matrix22.prototype.multiply = function (m) {
  this.M11 *= m;
  this.M12 *= m;
  this.M21 *= m;
  this.M22 *= m;
  return this;
};

ImgWarper.Matrix22.prototype.addM = function(o) {
  this.M11 += o.M11;
  this.M12 += o.M12;
  this.M21 += o.M21;
  this.M22 += o.M22;
};

ImgWarper.Matrix22.prototype.inverse = function () {
  return this.adjugate().multiply(1.0 / this.determinant());
};

/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/
/*/ ----------------------------------------------------------- /*/

ImgWarper.Point = function (x, y) {
  this.x = x;
  this.y = y;
};

ImgWarper.Point.prototype.add = function (o) {
  return new ImgWarper.Point(this.x + o.x, this.y + o.y);
};

ImgWarper.Point.prototype.subtract = function (o) {
  return new ImgWarper.Point(this.x - o.x, this.y - o.y);
};

// w * [x; y] * [x, y]
ImgWarper.Point.prototype.wXtX = function (w) {
  return (new ImgWarper.Matrix22(
        this.x * this.x * w, this.x * this.y * w,
        this.y * this.x * w, this.y * this.y * w
        ));
};

// Dot product
ImgWarper.Point.prototype.dotP = function (o) {
  return this.x * o.x + this.y * o.y;
};

ImgWarper.Point.prototype.multiply = function (o) {
  return new ImgWarper.Point(
      this.x * o.M11 + this.y * o.M21, this.x * o.M12 + this.y * o.M22);
};

ImgWarper.Point.prototype.multiply_d = function (o) {
  return new ImgWarper.Point(this.x * o, this.y * o);
};

ImgWarper.Point.weightedAverage = function (p, w) {
  var i;
  var sx = 0,
      sy = 0,
      sw = 0;

  for (i = 0; i < p.length; i++) {
    sx += p[i].x * w[i];
    sy += p[i].y * w[i];
    sw += w[i];
  }
  return new ImgWarper.Point(sx / sw, sy / sw);
};

ImgWarper.Point.prototype.InfintyNormDistanceTo = function (o) {
  return Math.max(Math.abs(this.x - o.x), Math.abs(this.y - o.y));
}

window.ImgWarper = ImgWarper;
return ImgWarper;
})();
