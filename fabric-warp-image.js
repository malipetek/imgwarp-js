
fabric.WarpImage = fabric.util.createClass(fabric.Image, {
  type: 'warper',
  _warp_mode: 0,
  _warp_handles: [],
  _warp_handle_radius: 6,
  _warp_resolution_multiplier: 2,
  _fixed_warp_points: 4,
  _warp_handle_styles: { strokeWidth: 3, fill: '#fff', stroke: '#666', hasControls: false, hasBorders: false, perPixelTargetFind: true },
  _percentageW: function (p) {
    return (p / 100) * this.getScaledWidth();
  },
  _percentageH: function (p) {
    return (p / 100) * this.getScaledHeight();
  },
  _wPercentage: function (px) {
    return (px / this.getScaledWidth()) * 100;
  },
  _hPercentage: function (px) {
    return (px / this.getScaledHeight()) * 100;
  },
  move_warp_handle: function (handle, leftP, topP) {
    // handle._target_warp_point.x = (handle.left - (this.left - this._warp_handle_radius)) / this.scaleX;
    // handle._target_warp_point.y = (handle.top - (this.top - this._warp_handle_radius)) / this.scaleY;

    handle._target_warp_point.x = (this._percentageW(leftP) / this.scaleX);
    handle._target_warp_point.y = (this._percentageH(topP) / this.scaleY);
    handle._target_leftP = leftP;
    handle._target_topP = topP;
    this.dirty = true;
    this.canvas.renderAll();
  },
  add_warp_handle: function (leftP, topP) {
    var that = this;
    var c = new fabric.Circle(Object.assign(this._warp_handle_styles, { radius: this._warp_handle_radius, visible: that._warp_mode }));
    this._warp_handles.push(c);
  
    c._initial_warp_point = new ImgWarper.Point(this._percentageW(leftP) / this.scaleX, this._percentageH(topP) / this.scaleY);
    c._target_warp_point = new ImgWarper.Point(this._percentageW(leftP) / this.scaleX, this._percentageH(topP) / this.scaleY);
   
    c._initial_leftP = leftP;
    c._initial_topP = topP;

    c._target_leftP = leftP;
    c._target_topP = topP;

    c.leftP = leftP;
    c.topP = topP;

    this._position_warp_handle(c);
    if (this._warp_handles.length > 3) {
      console.log('dirtied');
      this.dirty = true;
    }
    c.dirty = true;

    // this.canvas is undefined if it is not added to canvas yet
    if(this.canvas){
      this.canvas.add(c);
    }

    c.on('moved', function (e) {
      // 'this' is warp circle, not image. Image is 'that'

      var pos = fabric.util.rotatePoint(new fabric.Point(this.left + that._warp_handle_radius, this.top + that._warp_handle_radius), that._getLeftTopCoords(), -fabric.util.degreesToRadians(that.angle));
      var x = pos.x - that.left;
      var y = pos.y - that.top;

      var xp = (x / that.getScaledWidth()) * 100;
      var yp = (y / that.getScaledHeight()) * 100;

      c._target_leftP = that._wPercentage(this.left - that.left) / this.scaleX;
      c._target_topP =  that._hPercentage(this.top - that.top) / this.scaleY;
      that.move_warp_handle(this, xp, yp);
    });
    c.on('mouseover', function (e) {
      this.set('fill', '#333');
      this.canvas.renderAll();
    });
    c.on('mouseout', function (e) {
      this.set('fill', '#fff');
      this.canvas.renderAll();
    });
    c.on('mouseup', function (e) {
      if (e.e.shiftKey && that._warp_mode) {
        e.e.preventDefault();
        var i = that._warp_handles.indexOf(e.target);
        if (i > 3) {
          that._warp_handles.splice(i, 1);
          that.canvas.remove(e.target);
          that.dirty = true;
          that.canvas.renderAll();
        }
      }
    });
    return c;
  },
  _position_warp_handle: function (handle, left, top) {
    
    var leftP = handle.leftP;
    var topP = handle.topP;

    handle._initial_warp_point.x = this._percentageW(leftP) / this.scaleX;
    handle._initial_warp_point.y = this._percentageW(topP) / this.scaleY;

    /**/
    var left = this._percentageW(leftP);
    var top = this._percentageH(topP);

    // left = left - this.left;
    // top =  top - this.top;

    left -= this._warp_handle_radius;
    top -= this._warp_handle_radius;
    // rotation origin  
    // if(this.centeredRotation){
    //   // this._setOriginToCenter(); 
    // }
    ro = this._getLeftTopCoords();
    ro.x -= this._warp_handle_radius;
    ro.y -= this._warp_handle_radius;

    // console.log(ro);
    // this._resetOrigin();

    var pos = fabric.util.rotatePoint(new fabric.Point(left, top), ro, fabric.util.degreesToRadians(this.angle));

    /**/
    handle.left = pos.x;
    handle.top = pos.y;

    var left = handle._target_warp_point.x;
    var top = handle._target_warp_point.y;

    left = this.left + (left * this.scaleX);
    top = this.top + (top * this.scaleY);
        
    left -= this._warp_handle_radius;
    top -= this._warp_handle_radius;
    // rotation origin  
    // if(this.centeredRotation){
    //   // this._setOriginToCenter(); 
    // }
    ro = this._getLeftTopCoords();
    ro.x -= this._warp_handle_radius;
    ro.y -= this._warp_handle_radius;

    // console.log(ro);
    // this._resetOrigin();

    var pos = fabric.util.rotatePoint(new fabric.Point(left, top), ro, fabric.util.degreesToRadians(this.angle));

    handle.set({ left: pos.x, top: pos.y });
    handle.setCoords();
  },
  get(key){
    if(key == 'warp_map'){
      return this._warp_handles.map(function(h){ 
        return {
          x: [h._initial_leftP, h._target_leftP],
          y: [h._initial_topP, h._target_topP]
        };
      });
    }else{
      return this[key];
    }
  },
  set(key, value){
    if(key == 'warp_map'){
      var map_valid = value.every && value.length > 2 && value.every(function(e){
        return e.x && e.y && e.x.length > 1 && e.y.length > 1;
      });
      if(map_valid){
        var that = this;
        this._warp_handles.forEach(function(h){
          that.canvas.remove(h);
        });
        value.forEach(function(ft){
          var h = that.add_warp_handle( ft.x[0], ft.y[0] );
          that.move_warp_handle( h, ft.x[1], ft.y[1] );
        });
      }else{
        console.warn('warp_map should a array with minimum length 3 and formatted like following: [{ x: { from: Number, to: Number } }]');
      }
    }else{
        if (typeof key === 'object') {
      this._setObject(key);
    }
    else {
      if (typeof value === 'function' && key !== 'clipTo') {
        this._set(key, value(this.get(key)));
      }
      else {
        this._set(key, value);
      }
    }
  }
  return this;
  },
  setElement: function (image,  options){
    var that = this;
    this.callSuper('setElement', image, options);
    this.setCoords();
    this.dirty = true;
    this.set({width: image.width, height: image.height});

    this.imgWarper = new ImgWarper.Warper(image, this._warp_resolution_multiplier)
    this._warp_handles.forEach(function(h){
      h._target_warp_point.x = that._percentageW(h._target_leftP);
      h._target_warp_point.y = that._percentageH(h._target_topP);
      h._initial_warp_point.x = that._percentageW(h._initial_leftP);
      h._initial_warp_point.y = that._percentageH(h._initial_topP);

      that._position_warp_handle(h);
    });
    console.log('set', arguments);
  },
  initialize: function (image, options) {
    var that = this;
    this.callSuper('initialize', image, options);
    this._object = this;
    this._object.ownCaching = true;
    this._object.needsItsOwnCache = () => true;
    this._object.shouldCache = () => true;
    options = options || {};
    this._fixed_warp_points = options.fixedPoints;

    // console.log('warper', arguments, this);
    this.imgWarper = new ImgWarper.Warper(image, this._warp_resolution_multiplier);
        
        this.add_warp_handle(0, 0);
        this.add_warp_handle(0, 100);
        this.add_warp_handle(100, 0);
        this.add_warp_handle(100, 100);
        
        if(this._fixed_warp_points > 4) {
          this.add_warp_handle(50, 50);
        }
        if(this._fixed_warp_points> 5){
          this.add_warp_handle(0, 50);
          this.add_warp_handle(100, 50);
          this.add_warp_handle(50, 0);
          this.add_warp_handle(50, 100);
        }
    this.on({
      'added': function () {
        this._warp_handles.forEach(function(c){
          that.canvas.add(c);
          that.canvas.renderAll();    
        });
      },
      'mousedblclick': function (e) {
        if (!this._warp_mode) {
          this._warp_mode = 1;
          // console.log('warping mode on');
          this.canvas.discardActiveObject();
          this.selectable = false;
          this._warp_handles.forEach(h => h.set('visible', true));
          // this.canvas.setActiveObject(this._warp_handles[0]);
          this.canvas.renderAll();
          window.t = this;
        } else {
          //  console.log('warping mode off');
          this._warp_mode = 0;
          this.selectable = true;
          this.canvas.setActiveObject(this);
          this._warp_handles.forEach(h => h.set('visible', false));
          this.canvas.renderAll();
        }
      },
      'mouseup': function (e) {
        if (e.e.ctrlKey && this._warp_mode) {
          var pos = fabric.util.rotatePoint(new fabric.Point(e.pointer.x, e.pointer.y), this._getLeftTopCoords(), -fabric.util.degreesToRadians(this.angle));

          var x = pos.x - this.left;
          var y = pos.y - this.top;

          var xp = (x / this.getScaledWidth()) * 100;
          var yp = (y / this.getScaledHeight()) * 100;

          this.add_warp_handle(xp, yp);
        }
      },
      "moved": function (e) {
        var that = this;
        this._warp_handles.forEach(h => {
          //repositioning
          that._position_warp_handle(h);
        })
      },
      "scaled": function (e) {
        var that = this;
        this._warp_handles.forEach(h => {
          //repositioning
          that._position_warp_handle(h);
        })
      },
      "rotated": function (e) {
        var that = this;
        this._warp_handles.forEach(h => {
          //repositioning
          that._position_warp_handle(h);
        })
      }
    })

  },
  _render: function (ctx) {
    var that = this;
    var w = this.width, h = this.height, sW = w * this._filterScalingX, sH = h * this._filterScalingY,
      x = -w / 2, y = -h / 2;

    that.oriPoints = that._warp_handles.map(h => { return h._initial_warp_point; });
    that.dstPoints = that._warp_handles.map(h => { return h._target_warp_point; });


    var warped_image = that.imgWarper.warp(that.oriPoints, that.dstPoints);
    ctx.clearRect(-(w / 2), -(h / 2), w, h);
    ctx.drawImage(warped_image,
      this.cropX * this._filterScalingX,
      this.cropY * this._filterScalingY,
      sW * this._warp_resolution_multiplier,
      sH * this._warp_resolution_multiplier,
      x, y, w, h);
      console.log('drawing', w, h);
    that.drawCacheOnCanvas(that.canvas.contextCache);
    
  }
});