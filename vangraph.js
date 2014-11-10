//http://arborjs.org/docs/barnes-hut
// coordinates as on screen (zero point is in the top left corner)
// this is also true for defining the first and the last points
Vangraph = function(options) {

    var vangraph = {};

    vangraph.init = function(options) {

        // setting default values where it is appropriate
        options.offset.x = options.offset && options.offset.x ? options.offset.x : 0;
        options.offset.y = options.offset && options.offset.y ? options.offset.y : 0;
        options.size.x = options.size && options.size.x ? options.size.x : 800;
        options.size.y = options.size && options.size.y ? options.size.y : 600;


        // initializing properties with values
        vangraph.bodies = [];
        vangraph.springs = [];
        vangraph.lastUpdateTime = null;
        vangraph.framesPerSecond = 5;
        vangraph.area = new vangraph.Area(
            new vangraph.Point(
                options.offset.x,
                options.offset.y
            ),
            new vangraph.Point(
                options.offset.x + options.size.x,
                options.offset.y + options.size.y
            )
        );
        vangraph.quadrant = new vangraph.Quadrant(vangraph.area);
        vangraph.drawBody = options.drawBody;
        vangraph.drawSpring = options.drawSpring;
        vangraph.isRunning = false;
        vangraph.centripetal = 0.01;

        // providing API
        return {
            insertBody: vangraph.insertBody,
            insertSpring: vangraph.insertSpring,
            start: vangraph.start,
            resize: vangraph.resize
        };

    };
    vangraph.insertBody = function(configuration) {

        if (!("id" in configuration)) {
            throw new vangraph.Exception("Each body must have an identifier.");
        }

        for (var i = 0; i < vangraph.bodies.length; i++) {
            if (vangraph.bodies[i].exists(configuration.id)) {
                vangraph.bodies[i].change(configuration);
                return;
            }
        }

        var mass = ("mass" in configuration) ? configuration.mass : 1;

        var point;
        if ("x" in configuration && "y" in configuration) {
            point = new vangraph.Point(configuration.x, configuration.y);
        } else {
            vangraph.quadrant.makeRandomPointInside(function(randomPoint) {
                point = randomPoint;
            });
        }

        var motion = point.makeZeroMotion();

        var force = new vangraph.Force(0, 0);

        var body = new vangraph.Body(configuration.id, mass, point, motion, force);

        body.attach(vangraph.springs);

        vangraph.bodies.push(body);

    };
    vangraph.insertSpring = function(configuration) {

        if (!("id1" in configuration && "id2" in configuration)) {
            throw new vangraph.Exception("A spring must have two body identifiers: id1 and id2.", {configuration: configuration});
        }

        var spring = new vangraph.Spring(
                configuration.id1,
                configuration.id2,
                "lengthAtRest" in configuration ? configuration.lengthAtRest : 50.0,
                "stiffness" in configuration ? configuration.stiffness : 0.00001
                );

        spring.attach(vangraph.bodies);

        vangraph.springs.push(spring);

    };
    vangraph.applyCentripetalForce = function(time) {
        
        vangraph.area.useCentralPoint(function(centralPoint) {

            centralPoint.useCoordinates(function(centralX, centralY) {

                var i = vangraph.bodies.length;
                while (i--) {

                    vangraph.bodies[i].useMassAndPosition(function(bodyMass, bodyX, bodyY) {

                         var squaredMass = bodyMass * bodyMass;
                         var centripetalX = (bodyX - centralX) * vangraph.centripetal * squaredMass;
                         var centripetalY =  (bodyY - centralY) * vangraph.centripetal * squaredMass;

                         var centripetalForce = new vangraph.Force(centripetalX * time, centripetalY * time);

                         vangraph.bodies[i].applyForce(centripetalForce);

                     });

                }

            });

        });
        
    };
    vangraph.start = function() {
        
        if (vangraph.isRunning) {
            return;
        }
        
        vangraph.isRunning = true;
        
        var periodInMilliseconds = Math.floor(1 / vangraph.framesPerSecond * 1000);
        var time = periodInMilliseconds / 1000 ;
        
        var currentBodyNumber = 0;
        var bodyCount = vangraph.bodies.length;
        
        var currentSpringNumber = 0;
        var springCount = vangraph.springs.length;

        var driver = function(energy) {

            if (energy > 0.06) {
                
                setTimeout(function() {
                    
                    vangraph.createNextFrame(time, driver);
                    
                    // draw bodies
                    var i = vangraph.bodies.length;
                    while (i--) {
                        vangraph.bodies[i].draw(time, vangraph.drawBody);
                    }
                
                    // draw strings
                    var i = vangraph.springs.length;
                    while (i--) {
                        vangraph.springs[i].draw(time, vangraph.drawSpring);
                    }

//                    // draw bodies
//                    var i = 100;
//                    while (i--) {
//                        vangraph.bodies[currentBodyNumber].draw(time, vangraph.drawBody);
//                        currentBodyNumber++;
//                        if (currentBodyNumber === bodyCount) {
//                            currentBodyNumber = 0;
//                        }
//                    }
//                
//                    // draw strings
//                    var i = 100;
//                    while (i--) {
//                        vangraph.springs[currentSpringNumber].draw(time, vangraph.drawSpring);
//                        currentSpringNumber++;
//                        if (currentSpringNumber === springCount) {
//                            currentSpringNumber = 0;
//                        }
//                    }
                    
                }, periodInMilliseconds);
                
            } else {
                
                vangraph.isRunning = false;
                
            }
            
        }

        vangraph.createNextFrame(time, driver);
        
    };
    vangraph.createNextFrame = function(time, callback) {
console.log('createNextFrame');
        // repulsion
        vangraph.quadrant.clear();

        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.quadrant.place(vangraph.bodies[i]);
        }


        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.quadrant.applyRepulsiveForce(vangraph.bodies[i], time);
        }

        // attraction
        var i = vangraph.springs.length;
        while (i--) {
            vangraph.springs[i].applyAttractiveForce(time);
        }

        // centripetal shift
        vangraph.applyCentripetalForce(time);

        // friction
        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.bodies[i].applyFrictionForce(time);
        }

        // move bodies
        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.bodies[i].move();
        }

        // access total energy
        var totalEnergy = 0;
        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.bodies[i].useKineticEnergy(function(energy) {

                totalEnergy += energy;

            });
        }

        callback(totalEnergy);
        
    };
    vangraph.resize = function(offset, size) {
        
        vangraph.area = new vangraph.Area(
            new vangraph.Point(
                offset.x,
                offset.y
            ),
            new vangraph.Point(
                offset.x + size.x,
                offset.y + size.y
            )
        );

        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.area.makeRandomPointInside(function(point) {
                point.useCoordinates(function(x, y) {
                    
                    vangraph.bodies[i].change({
                        x: x,
                        y: y
                    });
                    
                });
            });

        }
        
        vangraph.start();
        
    };

    vangraph.Exception = function(message, data) {

        if (typeof message === "undefined") {
            message = "An exception of the Vangraph module has been raised.";
        }

        if (typeof data === "undefined") {
            data = {};
        }

        console.log(message);
        console.log(data);

        return {
            message: message,
            data: data
        };

    };

    vangraph.Motion = function(x1, y1, x2, y2) {

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

    };
    vangraph.Motion.prototype.speedLimit = 5;
    vangraph.Motion.prototype.proceed = function(acceleration, point) {

        var me = this;

        acceleration.useVector(function(accelerationX, accelerationY) {

            var velocityX = me.x2 - me.x1;
            var velocityY = me.y2 - me.y1;
            
            var velocity = Math.sqrt(velocityX*velocityX + velocityY*velocityY);
            
            if (velocity > vangraph.Motion.prototype.speedLimit) {
                var velosityReduction =  vangraph.Motion.prototype.speedLimit / velocity;
                velocityX = velocityX * velosityReduction;
                velocityY = velocityY * velosityReduction;
                
            }
            
            var dx = velocityX + accelerationX;
            var dy = velocityY + accelerationY;
            
            var nextX = me.x2 + dx;
            var nextY = me.y2 + dy;

            me.x1 = me.x2;
            me.y1 = me.y2;

            me.x2 = nextX;
            me.y2 = nextY;

            point.move(me.x2, me.y2);
            
            vangraph.area.contains(point, function(contains) {
                
                if (!contains) {
                    
                    var x = me.x2;
                    me.x2 = me.x1;
                    me.x1 = x;
                    var y = me.y2;
                    me.y2 = me.y1;
                    me.y1 = y;
                    point.move(me.x2, me.y2);
                    
                }
                
            });

        });

    };
    vangraph.Motion.prototype.useExpectedIncrement = function(acceleration, callback) {

        var me = this;

        acceleration.useVector(function(accelerationX, accelerationY) {

            var velocityX = me.x2 - me.x1;
            var velocityY = me.y2 - me.y1;

            var incrementX = velocityX + accelerationX;
            var incrementY = velocityY + accelerationY;

            callback(incrementX, incrementY);

        });

    };
    vangraph.Motion.prototype.useVelocityMagnitude = function(callback) {
        
        var me = this;
        
        var velocityX = me.x2 - me.x1;
        var velocityY = me.y2 - me.y1;
        
        var magnitude = Math.sqrt(velocityX*velocityX + velocityY*velocityY);
        
        callback(magnitude);
        
    };

    vangraph.Acceleration = function(mass, force) {

        // Newton's second law: The acceleration of a body is directly proportional to, and in the same direction as, the net force acting on the body, and inversely proportional to its mass.

        var me = this;
        me.x = 0;
        me.y = 0;

        force.useVector(function(forceX, forceY) {

            me.x = (me.x - forceX) / mass;
            me.y = (me.y - forceY) / mass;

        });

    };
    vangraph.Acceleration.prototype.useVector = function(callback) {

        callback(this.x, this.y);

    };

    vangraph.Force = function(x, y) {

        this.x = x;
        this.y = y;

    };
    vangraph.Force.prototype.useVector = function(callback) {

        callback(this.x, this.y);

    };
    vangraph.Force.prototype.add = function(force) {

        var me = this;

        force.useVector(function(x, y) {

            me.x += x;

            me.y += y;

        });

    };

    vangraph.Point = function(x, y) {

        this.x = x;
        this.y = y;

    };
    vangraph.Point.prototype.useCoordinates = function(callback) {

        callback(this.x, this.y);

    };
    vangraph.Point.prototype.move = function(x, y) {

        this.x = x;
        this.y = y;

    };
    vangraph.Point.prototype.useDistance = function(point, callback) {

        var me = this;

        point.useCoordinates(function(x, y) {

            var dx = me.x - x;
            var dy = me.y - y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            callback(distance);

        });

    };
    vangraph.Point.prototype.makeZeroMotion = function() {

        return new vangraph.Motion(this.x, this.y, this.x, this.y);

    };

    vangraph.Area = function(firstPoint, lastPoint) {

        this.firstPoint = firstPoint;
        this.lastPoint = lastPoint;

    };
    vangraph.Area.prototype.useCentralPoint = function(callback) {

        var me = this;

        me.firstPoint.useCoordinates(function(x1, y1) {

            me.lastPoint.useCoordinates(function(x2, y2) {

                var dx = x2 - x1;
                var dy = y2 - y1;

                var centralPoint = new vangraph.Point(
                        x1 + dx / 2,
                        y1 + dy / 2
                        );

                callback(centralPoint);

            });

        });

    };
    vangraph.Area.prototype.contains = function(point, callback) {

        var me = this;

        me.firstPoint.useCoordinates(function(x1, y1) {

            me.lastPoint.useCoordinates(function(x2, y2) {

                point.useCoordinates(function(x, y) {

                    var contains = x1 <= x && x <= x2 && y1 <= y && y <= y2;

                    callback(contains);

                });

            });

        });

    };
    vangraph.Area.prototype.splitInFourParts = function(callback) {

        var me = this;

        me.firstPoint.useCoordinates(function(x1, y1) {

            me.lastPoint.useCoordinates(function(x2, y2) {

                var dx = x2 - x1;
                var dy = y2 - y1;

                var halfX = x1 + dx / 2;
                var halfY = y1 + dy / 2;

                callback({
                    northwest: new vangraph.Area(
                            new vangraph.Point(x1, y1),
                            new vangraph.Point(halfX, halfY)
                            ),
                    northeast: new vangraph.Area(
                            new vangraph.Point(halfX + 1, y1),
                            new vangraph.Point(x2, halfY)
                            ),
                    southwest: new vangraph.Area(
                            new vangraph.Point(x1, halfY + 1),
                            new vangraph.Point(halfX, y2)
                            ),
                    southeast: new vangraph.Area(
                            new vangraph.Point(halfX + 1, halfY + 1),
                            new vangraph.Point(x2, y2)
                            )
                });

            });

        });

    };
    vangraph.Area.prototype.makeRandomPointInside = function(callback) {

        var me = this;

        me.firstPoint.useCoordinates(function(x1, y1) {

            me.lastPoint.useCoordinates(function(x2, y2) {

                var randomPoint = new vangraph.Point(
                        (Math.random() * (x2 - x1 + 1)) + x1,
                        (Math.random() * (y2 - y1 + 1)) + y1
                        );

                callback(randomPoint);

            });

        });

    };
    vangraph.Area.prototype.useSize = function(callback) {

        var me = this;

        me.firstPoint.useCoordinates(function(x1, y1) {

            me.lastPoint.useCoordinates(function(x2, y2) {

                var dx = x2 - x1;
                var dy = y2 - y1;

                var size = dx * dy;

                callback(size);

            });

        });

    };

    vangraph.Body = function(id, mass, point, motion, force) {

        if (mass == 0 || mass < 0) {
            throw new vangraph.Exception("A body must have a positive mass value");
        }

        this.id = id;
        this.mass = mass;
        this.point = point;
        this.motion = motion;
        this.force = force;
        this.constrained = false;

    };
    vangraph.Body.prototype.usePoint = function(callback) {

        callback(this.point);

    };
    vangraph.Body.prototype.useMassAndPosition = function(callback) {

        var me = this;

        me.point.useCoordinates(function(x, y) {

            callback(me.mass, x, y);

        });

    };
    vangraph.Body.prototype.useIdAndPosition = function(callback) {

        var me = this;

        me.point.useCoordinates(function(x, y) {

            callback(me.id, x, y);

        });

    };
    vangraph.Body.prototype.exists = function(id) {

        return this.id === id;

    };
    vangraph.Body.prototype.attach = function(springs) {
        
//        var me = this;
//
//        var i = springs.length;
//        while (i--) {
//            
//            springs[i].isAttached(function(isAttached) {
//                
//                if (isAttached) {
//                    me.mass = me.mass + 1;
//                }
//                
//            });
//
//        }
//        
//        console.log(me.mass);

    };
    vangraph.Body.prototype.change = function(configuration) {


        var me = this;
        
        me.constrained = !!configuration.constrained;
        
        if (me.constrained) {

            me.motion = me.point.makeZeroMotion();
            me.force = new vangraph.Force(0,0);

        } 
        
        if (typeof configuration.x !== "undefined" && typeof configuration.y !== "undefined") {

            me.point.move(configuration.x, configuration.y);
            me.motion = me.point.makeZeroMotion();

        }

    };
    vangraph.Body.prototype.move = function() {

        // Newton's first law: When viewed in an inertial reference frame, an object either is at rest or moves at a constant velocity, unless acted upon by an external force.

        var me = this;

        if (me.constrained) {
            return;
        }

        var acceleration = new vangraph.Acceleration(me.mass, me.force);

        me.force = new vangraph.Force(0, 0);

        me.motion.proceed(acceleration, me.point, function(previousX, previousY, currentX, currentY) {

            vangraph.moveBody(me.id, previousX, previousY, currentX, currentY);

        });

    };
    vangraph.Body.prototype.applyForce = function(force) {

        this.force.add(force);

    };
    vangraph.Body.prototype.applyFrictionForce = function(time) {

        var me = this, friction = 0.1;

        var acceleration = new vangraph.Acceleration(me.mass, me.force);

        me.motion.useExpectedIncrement(acceleration, function(incrementX, incrementY) {

            var directionX = incrementX !== 0 ? incrementX / Math.abs(incrementX) : 1;
            var directionY = incrementY !== 0 ? incrementY / Math.abs(incrementY) : 1;

            var normalForceZ = me.mass * 10;

            var frictionX = directionX * normalForceZ * friction * time; // ????????????
            var frictionY = directionY * normalForceZ * friction * time;

            if (Math.abs(frictionX) > Math.abs(incrementX)) {
                
                frictionX = incrementX;
                
            }

            if (Math.abs(frictionY) > Math.abs(incrementY)) {
                
                frictionY = incrementY;
                
            }

            var frictionForce = new vangraph.Force(frictionX, frictionY);

            me.applyForce(frictionForce);

        });

    };
    vangraph.Body.prototype.useKineticEnergy = function(callback) {
        
        var me = this;
        
        me.motion.useVelocityMagnitude(function(velocityMagnitude) {
            
            var kineticEnergy = me.mass * velocityMagnitude * velocityMagnitude;
            
            callback(kineticEnergy);
            
        });
        
    };
    vangraph.Body.prototype.draw = function(time, callback) {
        
        var me = this;

        me.point.useCoordinates(function(x, y) {

            callback(me.id, x, y, time);

        });
        
    }

    vangraph.Quadrant = function(area) {

        var me = this;
        me.area = area;
        me.quadrants = null;
        me.body = null;
        me.totalMass = 0;
        me.area.useCentralPoint(function(centralPoint) {
            me.centerOfMass = centralPoint;
        });

    };
    vangraph.Quadrant.prototype.threshold = 0.5;
    vangraph.Quadrant.prototype.repulsion = 25;
    vangraph.Quadrant.prototype.clear = function(body) {

        var me = this;
        me.quadrants = null;
        me.body = null;
        me.totalMass = 0;

    };
    vangraph.Quadrant.prototype.place = function(body) {

        var me = this;

        body.usePoint(function(point) {

            me.area.contains(point, function(contains) {

                if (!contains) {
                    return;
                }

                // update total mass and the center of mass of this quadrant
                body.useMassAndPosition(function(bodyMass, bodyX, bodyY) {

                    var mass = me.totalMass + bodyMass;

                    me.centerOfMass.useCoordinates(function(quadrantX, quadrantY) {

                        // move the center of mass of this quadrant
                        me.centerOfMass.move(
                                (bodyX * bodyMass + quadrantX * me.totalMass) / mass,
                                (bodyY * bodyMass + quadrantY * me.totalMass) / mass
                                );

                        // increase total mass of all bodies inside this quadrant
                        me.totalMass = mass;

                    });

                });

                // find quardant for the body
                if (me.body === null && me.quadrants === null) {

                    // attach the first body to the quadrant
                    me.body = body;

                } else {

                    if (me.body !== null && me.quadrants === null) {


                        // create 4 child quadrants
                        me.area.splitInFourParts(function(areas) {

                            me.quadrants = [
                                new vangraph.Quadrant(areas.northwest),
                                new vangraph.Quadrant(areas.northeast),
                                new vangraph.Quadrant(areas.southwest),
                                new vangraph.Quadrant(areas.southeast)
                            ];

                        });

                        // move the first quadrant body into a child quadrant
                        var i = me.quadrants.length;
                        while (i--) {
                            me.quadrants[i].place(me.body);
                        }

                        me.body = null;

                    }

                    // place a subsequent body into a child quadrant
                    var k = me.quadrants.length;
                    while (k--) {
                        me.quadrants[k].place(body);
                    }

                }

            });

        });

    };
    vangraph.Quadrant.prototype.makeRandomPointInside = function(callback) {

        this.area.makeRandomPointInside(callback);

    };
    vangraph.Quadrant.prototype.calculateRatio = function(body) {

        var me = this, ratio;

        me.area.useSize(function(quadrantSize) {

            body.usePoint(function(bodyPoint) {

                me.centerOfMass.useDistance(bodyPoint, function(distance) {

                    ratio = Math.sqrt(quadrantSize) / distance;

                });

            });

        });

        return ratio;

    };
    vangraph.Quadrant.prototype.createForce = function(body, time) {

        var me = this, force;

        body.useMassAndPosition(function(bodyMass, bodyX, bodyY) {

            me.centerOfMass.useCoordinates(function(quadrantX, quadrantY) {

                if (bodyX === quadrantX && bodyY === quadrantY) {

                    force = new vangraph.Force(0, 0);

                } else {

                    var dx = quadrantX - bodyX;
                    var dy = quadrantY - bodyY;

                    var distance = Math.sqrt(dx * dx + dy * dy);

                    var quotient = me.repulsion * me.totalMass / (distance * distance);

                    force = new vangraph.Force(dx * quotient * time, dy * quotient * time);

                }

            });

        });

        return force;

    };
    vangraph.Quadrant.prototype.applyRepulsiveForce = function(body, time) {

        var me = this, force;

        if (this.body !== null && this.body !== body) {
            // 

            force = me.createForce(body, time);
            body.applyForce(force);

        } else {

            var ratio = me.calculateRatio(body);

            if (ratio > me.threshold) {
                // 

                if (me.quadrants !== null) {

                    var i = me.quadrants.length;
                    while (i--) {

                        me.quadrants[i].applyRepulsiveForce(body, time);

                    }

                }

            } else {

                // treat the quad as a single body
                force = me.createForce(body, time);
                body.applyForce(force);

            }


        }

    };

    vangraph.Spring = function(id1, id2, lengthAtRest, stiffness) {

        this.id1 = id1;
        this.id2 = id2;
        this.lengthAtRest = lengthAtRest;
        this.stiffness = stiffness;

        this.body1 = null;
        this.body2 = null;

    };
    vangraph.Spring.prototype.attach = function(bodies) {

        var i = bodies.length;
        while (i--) {

            if (this.body1 === null && this.id1 !== null && bodies[i].exists(this.id1)) {

                this.body1 = bodies[i];

            }

            if (this.body2 === null && this.id2 !== null && bodies[i].exists(this.id2)) {

                this.body2 = bodies[i];

            }

            if (this.body1 !== null && this.body2 !== null) {

                break;

            }

        }

    };
    vangraph.Spring.prototype.applyAttractiveForce = function(time) {

        var me = this;

        if (me.body1 === null || me.body2 === null) {
            return;
        }

        me.body1.useMassAndPosition(function(mass1, x1, y1) {

            me.body2.useMassAndPosition(function(mass2, x2, y2) {

                var dx1 = x2 - x1;
                var dy1 = y2 - y1;

                var dx2 = -dx1;
                var dy2 = -dy1;

                var distance = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                var quotient = (me.lengthAtRest - distance) * me.stiffness;

                var force1 = new vangraph.Force(dx1 * quotient  * time, dy1 * quotient * time);
                var force2 = new vangraph.Force(dx2 * quotient * time, dy2 * quotient * time);

                me.body1.applyForce(force1);
                me.body2.applyForce(force2);

            });

        });

    };
    vangraph.Spring.prototype.draw = function(time, callback) {

        var me = this;
        
        if (me.body1 === null || me.body2 === null) {
            return;
        }

        me.body1.useIdAndPosition(function(id1, x1, y1) {

            me.body2.useIdAndPosition(function(id2, x2, y2) {

                callback(id1, x1, y1, id2, x2, y2, time);

            });

        });

    };
    vangraph.Spring.prototype.isAttached = function(id, callback) {
        
        var isAttached = (id === this.id1 || id === this.id2);
        
        callback(isAttached);
        
    }

    return vangraph.init(options);

};

