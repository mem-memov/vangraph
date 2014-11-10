Vangraph = function(options) {

    var vangraph = {};
    
    vangraph.init = function(options) {

        vangraph.bodies = [];
        vangraph.bodyMap = {};
        
        vangraph.x = options.x;
        vangraph.y = options.y;
        vangraph.width = options.width;
        vangraph.height = options.height;
        
        vangraph.attractiveForce = new vangraph.AttractiveForce();
        vangraph.repulsiveForce = new vangraph.RepulsiveForce();
        vangraph.centripetalForce = new vangraph.CentripetalForce();
        vangraph.frictionForce = new vangraph.FrictionForce();
        
        return {
            insertBody: vangraph.insertBody,
            insertSpring: vangraph.insertSpring,
            getPositions: vangraph.getPositions,
            applyForces: vangraph.applyForces,
            resize: vangraph.resize,
            hasBody: vangraph.hasBody,
            hasSpring: vangraph.hasSpring
        };
        
    };
    vangraph.insertBody = function(configuration) {

        if (!("id" in configuration)) {
            throw new vangraph.Exception("Each body must have an identifier.");
        }
        
        var id = configuration.id;
        
        if (vangraph.bodyMap[id]) {
            vangraph.bodyMap[id].change(configuration);
            return;
        }
        
        var mass = ("mass" in configuration) ? configuration.mass : 1;
        var x = ("x" in configuration) ? configuration.x : Math.random()*vangraph.width;
        var y = ("y" in configuration) ? configuration.y : Math.random()*vangraph.height;

        var body = new vangraph.Body(id, mass, x, y);
        
        vangraph.bodyMap[id] = body;

        vangraph.bodies.push(body);

    };
    vangraph.insertSpring = function(configuration) {
        
        if (!("id1" in configuration && "id2" in configuration)) {
            throw new vangraph.Exception("A spring must have two body identifiers: id1 and id2.", {configuration: configuration});
        }
        
        var id1 = configuration.id1;
        var id2 = configuration.id2;
        var stiffness = ("stiffness" in configuration) ? configuration.stiffness : 0.0001;
        var lengthAtRest = ("lengthAtRest" in configuration) ? configuration.lengthAtRest : 50.0;
        
        vangraph.attractiveForce.addSpring(id1, id2, stiffness, lengthAtRest);
        
    };
    vangraph.applyForces = function(time) {
        
        // repulsion
        vangraph.repulsiveForce.apply(time, vangraph.bodies, vangraph.width, vangraph.height);

        // attraction
        vangraph.attractiveForce.apply(time, vangraph.bodyMap);

        // centripetal shift
        vangraph.centripetalForce.apply(time, vangraph.bodies, vangraph.width/2, vangraph.height/2);

        // move bodies
        var positiveEnergy = 0;
        var i = vangraph.bodies.length;
        while (i--) {
            positiveEnergy += vangraph.bodies[i].move();
        }

        // friction
        vangraph.frictionForce.apply(time, vangraph.bodies);
        
        // move bodies
        var negativeEnergy = 0;
        
        var i = vangraph.bodies.length;
        while (i--) {
            negativeEnergy += vangraph.bodies[i].move();
        }
        
        var totalKineticEnergy = positiveEnergy - negativeEnergy;

        return totalKineticEnergy;
        
    };
    vangraph.resize = function(offset, size) {
        
    };
    vangraph.hasBody = function(id) {
        return !!vangraph.bodyMap[id];
    }
    vangraph.hasSpring = function(id1, id2) {
        return vangraph.attractiveForce.findIndexByIds(id1, id2) !== null;
    }
    vangraph.getPositions = function(map, ids, xValues, yValues) {
        
        var i = vangraph.bodies.length;
        while (i--) {
            vangraph.bodies[i].stackPosition(map, ids, xValues, yValues);
        }
        
    }

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

    vangraph.Body = function(id, mass, x, y) {
 
        this.id = id;
 
        // preventing freezing of some bobies with random values
        this.previousX = x + Math.random(10)-5;
        this.previousY = y + Math.random(10)-5;
        
        this.currentX = x;
        this.currentY = y;
        
        this.incrementX = 0;
        this.incrementY = 0;
        
        this.mass = mass;
        this.kineticEnergy = 0;
        
        this.isMotionless = false;

    };
    vangraph.Body.prototype.speedLimit = 20;
    vangraph.Body.prototype.accelerate = function(forceX, forceY) {

        if (this.isMotionless) {
            return;
        }

        this.incrementX += forceX / this.mass;
        this.incrementY += forceY / this.mass; 

    };
    vangraph.Body.prototype.move = function() {

        if (this.isMotionless) {
            return;
        }
        
        var velocityX = this.currentX - this.previousX + this.incrementX;
        var velocityY = this.currentY - this.previousY + this.incrementY;
        
        var velocityMagnitude = Math.sqrt(velocityX*velocityX + velocityY*velocityY);

        if (velocityMagnitude > this.speedLimit) {
            
            var velosityReduction =  this.speedLimit / velocityMagnitude;
            velocityMagnitude = this.speedLimit; 
            velocityX = velocityX * velosityReduction;
            velocityY = velocityY * velosityReduction;

        }
        
        this.kineticEnergy = this.mass * velocityMagnitude * velocityMagnitude;
        
        var nextX = this.currentX + velocityX;
        var nextY = this.currentY + velocityY;

        // bounce back
        if (nextX < 0 || nextX > vangraph.width) {
            nextX = this.currentX - velocityX;
        }
        if (nextY < 0 || nextY > vangraph.height) {
            nextY = this.currentY - velocityY;
        }

        
        this.previousX = this.currentX;
        this.previousY = this.currentY;

        this.currentX = nextX;
        this.currentY = nextY;
            
        this.incrementX = 0;
        this.incrementY = 0;
        
        return this.kineticEnergy;

    };
    vangraph.Body.prototype.change = function(configuration) {

        // Drag And Drop

        if ('constrained' in configuration) {

            if (configuration.constrained) {

                if ('x' in configuration && 'y' in configuration) {

                    if (configuration.x < 0) configuration.x = 0;
                    if (configuration.x > vangraph.width) configuration.x = vangraph.width;
                    if (configuration.y < 0) configuration.y = 0;
                    if (configuration.y > vangraph.height) configuration.y = vangraph.height;

                    this.currentX = configuration.x;
                    this.currentY = configuration.y;

                }
                
                this.previousX = this.currentX;
                this.previousY = this.currentY;

                this.incrementX = 0;
                this.incrementY = 0;

                this.isMotionless = true;
                
            } else {
                
                this.isMotionless = false;
                
            }

        } 

    };
    vangraph.Body.prototype.locateX = function() {
        
        return this.currentX;
        
    };
    vangraph.Body.prototype.locateY = function() {
        
        return this.currentY;
        
    };
    vangraph.Body.prototype.measureMass = function() {
        
        return this.mass;
        
    };
    vangraph.Body.prototype.stackPosition = function(map, ids, xValues, yValues) {
        
        map[this.id] = ids.length;
        ids.push(this.id);
        xValues.push(this.currentX);
        yValues.push(this.currentY);
        
    };
    vangraph.Body.prototype.detectCourseX = function() {
        
        return this.currentX - this.previousX;
        
    };
    vangraph.Body.prototype.detectCourseY = function() {
        
        return this.currentY - this.previousY;
        
    };
    
    vangraph.AttractiveForce = function() {
        
        this.id1Row = [];
        this.id2Row = [];
        this.stiffnessRow = [];
        this.lengthAtRestRow = [];
        
    };
    vangraph.AttractiveForce.prototype.addSpring = function(id1, id2, stiffness, lengthAtRest) {

        var i = this.findIndexByIds(id1, id2);
        
        if (i !== null) {
            this.stiffnessRow[i] = stiffness;
            this.lengthAtRestRow[i] = lengthAtRest;
            return;
        }

        var i = this.id1Row.length;
        
        this.id1Row[i] = id1;
        this.id2Row[i] = id2;
        this.stiffnessRow[i] = stiffness;
        this.lengthAtRestRow[i] = lengthAtRest;
        
    };
    vangraph.AttractiveForce.prototype.removeSpring = function(id1, id2) {
        
        var i = this.findIndexByIds(id1, id2);
        
        if (i === null) {
            return;
        }
        
        delete(this.stiffnessRow[i]);
        delete(this.lengthAtRestRow[i]);
        
    };
    vangraph.AttractiveForce.prototype.findIndexByIds = function(id1, id2) {
        
        var i = this.id1Row.length;
        while(i--) {
            
            if (this.id1Row[i] !== id1 && this.id2Row[i] !== id2) {
                continue;
            }
            
            if (this.id2Row[i] !== id1 && this.id1Row[i] !== id2) {
                continue;
            }
            
            return i;
            
        }
        
        return null;
        
    };
    vangraph.AttractiveForce.prototype.apply = function(time, bodyMap) {
        
        var i = this.id1Row.length;
        var body1, body2, stiffness, lengthAtRest;
        
        while (i--) {
            
            if (!bodyMap[this.id1Row[i]]) {
                continue;
            }
            
            if (!bodyMap[this.id2Row[i]]) {
                continue;
            }
            
            body1 = bodyMap[this.id1Row[i]];
            body2 = bodyMap[this.id2Row[i]];
            stiffness = this.stiffnessRow[i];
            lengthAtRest = this.lengthAtRestRow[i];
            
            this.generate(body1, body2, stiffness, lengthAtRest, time);
            
        }
        
    };
    vangraph.AttractiveForce.prototype.generate = function(body1, body2, stiffness, lengthAtRest, time) {
        
        var x1 = body1.locateX();
        var y1 = body1.locateY();
        
        var x2 = body2.locateX();
        var y2 = body2.locateY();
        
        var dx = x2 - x1;
        var dy = y2 - y1;

        var distance = Math.sqrt(dx * dx + dy * dy);
        var quotient = (distance - lengthAtRest) * stiffness;

        var forceX = dx * quotient  * time;
        var forceY = dy * quotient * time;

        body1.accelerate(forceX, forceY);
        body2.accelerate(-forceX, -forceY);
        
    };
    
    vangraph.RepulsiveForce = function() {
        
        this.clear();
        
    }
    vangraph.RepulsiveForce.prototype.threshold = 0.5;
    vangraph.RepulsiveForce.prototype.repulsion = 50;
    vangraph.RepulsiveForce.prototype.clear = function() {
        
        this.topBorders = [];
        this.bottomBorders = [];
        this.leftBorders = [];
        this.rightBorders = [];
        this.masses = [];
        this.centerOfMassXPositions = [];
        this.centerOfMassYPositions = [];
        this.bodies = [];
        this.parentIndexes = [];
        this.childIndexes = [];
        
    };
    vangraph.RepulsiveForce.prototype.placeBodies = function(bodies, width, height) {
        
        if (bodies.length === 0) {
            return;
        }

        var body, i, iMax = bodies.length;

        // root quadrant
        body = bodies[0];

        this.addQuadrant(
            0,
            height,
            0,
            width,
            body.measureMass(),
            body.locateX(),
            body.locateY(),
            body,
            null,
            null
        );
        
        // continue with other bodies
        for (i=1; i<iMax; i++) {

            this.placeBodyIntoQuadrant(bodies[i], 0);
            
        }

    };
    vangraph.RepulsiveForce.prototype.apply = function(time, bodies, width, height) {
        
        this.clear();
        this.placeBodies(bodies, width, height);
        
        var i, iMax = bodies.length;
        
        for (i=1; i<iMax; i++) {
            
            this.applyOnBody(bodies[i], 0, time);
            
        }
        

        
    };
    vangraph.RepulsiveForce.prototype.applyOnBody = function(body, quadrant, time) {

        var quadrantBody = this.bodies[quadrant];
        
        if (quadrantBody !== null && quadrantBody !== body) {
            // 

            this.generateForce(body, quadrant, time);

        } else {
            
            var ratio = this.calculateRatio(quadrant, body);

            if (ratio > this.threshold) {
                
                if (this.childIndexes[quadrant] !== null) {

                    var q = 4;
                    while (q--) {
                        this.applyOnBody(body, this.childIndexes[quadrant][q], time);
                    }
                    
                }
                
            } else {

                this.generateForce(body, quadrant, time);
                
            }
            
        }
        
    };
    vangraph.RepulsiveForce.prototype.generateForce = function(body, quadrant, time) {
        
        var bodyX = body.locateX();
        var bodyY = body.locateY();
        var quadrantX = this.centerOfMassXPositions[quadrant];
        var quadrantY = this.centerOfMassYPositions[quadrant];

        if (bodyX === quadrantX && bodyY === quadrantY) {
            return;
        }
        
        var dx = bodyX - quadrantX;
        var dy = bodyY - quadrantY;

        var distance = Math.sqrt(dx * dx + dy * dy);

        var quotient = this.repulsion * this.masses[quadrant] / (distance * distance);

        var forceX = dx * quotient * time;
        var forceY = dy * quotient * time;

        body.accelerate(forceX, forceY);
        
    };
    vangraph.RepulsiveForce.prototype.calculateRatio = function(quadrant, body) {

        var ratio, quadrantSize, distance, dx, dy;

        quadrantSize = (this.bottomBorders[quadrant] - this.topBorders[quadrant]) * (this.rightBorders[quadrant] - this.leftBorders[quadrant]);

        dx = body.locateX() - this.centerOfMassXPositions[quadrant];
        dy = body.locateY() - this.centerOfMassYPositions[quadrant];

        distance = Math.sqrt(dx * dx + dy * dy)

        ratio = Math.sqrt(quadrantSize) / distance;

        return ratio;

    };
    vangraph.RepulsiveForce.prototype.locateCenterX = function(left, right) {
        
        return left + (right - left) / 2;
        
    };
    vangraph.RepulsiveForce.prototype.locateCenterY = function(top, bottom) {
        
        return top + (bottom - top) / 2;
        
    };
    vangraph.RepulsiveForce.prototype.isInsideQuadrant = function(quadrant, x, y) {
        
        return x >= this.leftBorders[quadrant] && x <= this.rightBorders[quadrant] && y >= this.topBorders[quadrant] && y <= this.bottomBorders[quadrant];
        
    };
    vangraph.RepulsiveForce.prototype.splitQuadrant = function(quadrant) {

        var top = this.topBorders[quadrant];
        var bottom = this.bottomBorders[quadrant];
        var left = this.leftBorders[quadrant];
        var right = this.rightBorders[quadrant];
        
        var halfX = this.locateCenterX(left, right);
        var halfY = this.locateCenterY(top, bottom);
        
        var northwest = this.addQuadrant(
            top,
            halfY,
            left,
            halfX,
            0,
            this.locateCenterX(left, halfX),
            this.locateCenterY(top, halfY),
            null,
            quadrant,
            null
        );
        
        var northeast = this.addQuadrant(
            top,
            halfY,
            halfX,
            right,
            0,
            this.locateCenterX(halfX, right),
            this.locateCenterY(top, halfY),
            null,
            quadrant,
            null
        );
        
        var southwest = this.addQuadrant(
            halfY,
            bottom,
            left,
            halfX,
            0,
            this.locateCenterX(left, halfX),
            this.locateCenterY(halfY, bottom),
            null,
            quadrant,
            null
        );
        
        var southeast = this.addQuadrant(
            halfY,
            bottom,
            halfX,
            right,
            0,
            this.locateCenterX(halfX, right),
            this.locateCenterY(halfY, bottom),
            null,
            quadrant,
            null
        );

        this.childIndexes[quadrant] = [northwest, northeast, southwest, southeast];
        
    };
    vangraph.RepulsiveForce.prototype.addQuadrant = function(top, bottom, left, right, mass, centerOfMassX, centerOfMassY, body, parentIndex, childIndexes) {
        
        var quadrant = this.topBorders.length;

        this.topBorders.push(top);
        this.bottomBorders.push(bottom);
        this.leftBorders.push(left);
        this.rightBorders.push(right);
        this.masses.push(mass);
        this.centerOfMassXPositions.push(centerOfMassX);
        this.centerOfMassYPositions.push(centerOfMassY);
        this.bodies.push(body);
        this.parentIndexes.push(parentIndex);
        this.childIndexes.push(childIndexes);
        
        return quadrant;
        
    };
    vangraph.RepulsiveForce.prototype.placeBodyIntoQuadrant = function(body, quadrant) {

        var bodyX, bodyY, bodyMass, k, q, child,
                massWithBody, massWithoutBody, movedBody
        ;
        
        bodyX = body.locateX();
        bodyY = body.locateY();
        bodyMass = body.measureMass();

        if (this.isInsideQuadrant(quadrant, bodyX, bodyY)) {

            // update total mass and the center of mass of this quadrant
            massWithoutBody = this.masses[quadrant];
            if (massWithoutBody === 0) {
                this.masses[quadrant] = bodyMass;
                this.centerOfMassXPositions[quadrant] = bodyX;
                this.centerOfMassYPositions[quadrant] = bodyY;
            } else {
                massWithBody = massWithoutBody + bodyMass;
                this.masses[quadrant] = massWithBody;
                this.centerOfMassXPositions[quadrant] = (bodyX * bodyMass + this.centerOfMassXPositions[quadrant] * massWithoutBody) / massWithBody;
                this.centerOfMassYPositions[quadrant] = (bodyY * bodyMass + this.centerOfMassYPositions[quadrant] * massWithoutBody) / massWithBody;
            }
            // find quardant for the body
             if (this.bodies[quadrant] === null && this.childIndexes[quadrant] === null) {

                 // attach the first body to the quadrant
                 this.bodies[quadrant] = body;

             } else {

                if (this.bodies[quadrant] !== null && this.childIndexes[quadrant] === null) {

                    // create 4 child quadrants
                    this.splitQuadrant(quadrant);

                    // move the parent quadrant body into a child quadrant
                    movedBody = this.bodies[quadrant];
                    q = 4;
                    while (q--) {
                        child = this.childIndexes[quadrant][q];
                        this.placeBodyIntoQuadrant(movedBody, child);
                    }
                    this.bodies[quadrant] = null;

                }
                 
                // place a subsequent body into a child quadrant
                q = 4;
                while (q--) {
                    child = this.childIndexes[quadrant][q];
                    this.placeBodyIntoQuadrant(body, child);
                }

             }

        }

    }

    vangraph.FrictionForce = function() {
        
    }
    vangraph.FrictionForce.prototype.friction = 0.9;
    vangraph.FrictionForce.prototype.apply = function(time, bodies) {
        
        var i = bodies.length;
        while (i--) {
            
            this.generateForce(time, bodies[i]);
            
        }
        
    };
    vangraph.FrictionForce.prototype.generateForce = function(time, body) {
        
        var incrementX = body.detectCourseX();
        var incrementY = body.detectCourseY();

        var directionX = incrementX !== 0 ? incrementX / Math.abs(incrementX) : 1;
        var directionY = incrementY !== 0 ? incrementY / Math.abs(incrementY) : 1;
        var mass = body.measureMass();

        var normalForceZ = mass * 10;

        var forceX = -directionX * normalForceZ * this.friction * time; 
        var forceY = -directionY * normalForceZ * this.friction * time;

        if (Math.abs(forceX*mass) > Math.abs(incrementX)) {

            forceX = -incrementX*mass;

        }

        if (Math.abs(forceY*mass) > Math.abs(incrementY)) {

            forceY = -incrementY*mass; 

        }

        body.accelerate(forceX, forceY);
        
    };
    
    vangraph.CentripetalForce = function() {
        
    };
    vangraph.CentripetalForce.prototype.centripetal = 0.01;
    vangraph.CentripetalForce.prototype.apply = function(time, bodies, centralX, centralY) {
        
        var i = bodies.length;
        while (i--) {
            
            this.generateForce(time, bodies[i], centralX, centralY);
            
        }
        
    };
    vangraph.CentripetalForce.prototype.generateForce = function(time, body, centralX, centralY) {
        
        var bodyX = body.locateX();
        var bodyY = body.locateY();
        var bodyMass = body.measureMass();
        
        var squaredMass = bodyMass * bodyMass;
        var centripetalX = (centralX - bodyX) * this.centripetal * squaredMass;
        var centripetalY =  (centralY - bodyY) * this.centripetal * squaredMass;

        var forceX = centripetalX * time;
        var forceY = centripetalY * time;

        body.accelerate(forceX, forceY);
        
    }
    
    return vangraph.init(options);

};
