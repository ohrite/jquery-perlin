var perlin = {};

(function($){
	perlin = $.extend(perlin, {
		lower: Math.floor(Math.random(new Date().getSeconds()) * 9000) + 1000,
		middle: Math.floor(Math.random(new Date().getSeconds()) * 900000) + 100000,
		high: Math.floor(Math.random(new Date().getSeconds()) * 1000000000) + 1000000000,
		seed: function(){
			// summary
			// Seed the random numbers.
			perlin.lower = Math.floor(Math.random(new Date().getSeconds()) * 9000) + 1000;
			perlin.middle = Math.floor(Math.random(new Date().getSeconds()) * 900000) + 100000;
			perlin.high = Math.floor(Math.random(new Date().getSeconds()) * 1000000000) + 1000000000;
		},
		interpolate: function(a, b, x) {
			// summary
			// Interpolate the given points.
			var f = (1 - Math.cos(x * 3.1415927)) * 0.5;
			return (a * (1 - f)) + (b * f);
		},
		d1: {
			// 	summary
			// A one-dimensional Perlin noise generator.
			rnd: function(x){
				// summary
				// Make some pseudorandom noise off a single parameter.
				x = (x << 13) ^ x;
				return 1.0 - ((x * (x * x * perlin.lower + perlin.middle) + perlin.high) & 0x7fffffff) / 1073741824.0;
			},
			smooth: function(x){
				// summary
				// Make smoothed noise.
				return (perlin.d1.rnd(x) / 2) + (perlin.d1.rnd(x - 1) / 4) + (perlin.d1.rnd(x + 1) / 4);
			},
			interpolate: function(x){
				// summary
				// Generate interpolated noise for the given point.
				var intx;

				intx = Math.floor(x);

				return perlin.interpolate(perlin.d1.smooth(intx), perlin.d1.smooth(intx + 1), x - intx);
			},
			noise: function(x, octaves, persistence){
				// summary
				// Make 1D perlin noise.
				var total = 0, p;

				for (var i = 0; i < octaves; i++){
					total += perlin.d1.interpolate(x * Math.pow(2, i)) * Math.pow(persistence, i);
				}

				return total;
			}
		},
		d2: {
			// summary
			// A two-dimensional Perlin noise generator.
			rnd: function(x, y){
				// summary
				// Make some pseudorandom noise.
				return perlin.d1.rnd(x + y * 57);
			},
			smooth: function (x, y){
				// summary
				// Smooth the output from the noise function across a given pixel.
				var corners, sides, middle;

				corners = (
					perlin.d2.rnd(x - 1, y - 1) +
					perlin.d2.rnd(x + 1, y - 1) +
					perlin.d2.rnd(x - 1, y + 1) +
					perlin.d2.rnd(x + 1, y + 1)
				) / 16;

				sides = (
					perlin.d2.rnd(x - 1, y) +
					perlin.d2.rnd(x + 1, y) +
					perlin.d2.rnd(x, y - 1) +
					perlin.d2.rnd(x, y + 1)
				) / 8;

				middle = perlin.d2.rnd(x, y) / 4;

				return corners + sides + middle;
			},
			interpolate: function(x, y){
				// summary
				// Interpolate the smoothed noise.
				var intx, inty;

				intx = Math.floor(x);
				inty = Math.floor(y);

				return perlin.interpolate(
					perlin.interpolate(
						perlin.d2.smooth(intx, inty),
						perlin.d2.smooth(intx + 1, inty),
						x - intx
					),
					perlin.interpolate(
						perlin.d2.smooth(intx, inty + 1),
						perlin.d2.smooth(intx + 1, inty + 1),
						x - intx
					),
					y - inty
				);
			},
			noise: function(x, y, octaves, persistence){
				// summary
				// Generate 2D Perlin noise.
				var total = 0;

				// iterate the octaves
				for (var i = 0; i < octaves; i++){
					total += perlin.d2.interpolate(x * Math.pow(2, i), y * Math.pow(2, i)) * Math.pow(persistence, i);
				}

				return total;
			}
		}
	});
	
	$.fn.perlin = function(settings){
		// summary
		// Declare a jQuery perlin extension function.
		// parameters
		// octaves: number of iterations
		// persistence: falloff multiplier
		// frequency: rate of movement
		var self;
		
		// build a settings object
		settings = $.extend({
			octaves: 1,
			persistence: 0.4,
			frequency: 100,
			density: 0.02
		}, settings);
		
		self = this;
		
		if (!self.perlin_controller) {
			self.perlin_controller = {
				interval: null,
				start: function(){
					var canvas, context, width, height, endx, endy, runs = 0;
					
					// resolve the DOM object for api access
					canvas = self[0];

					// make sure we're pointed at a canvas
					if (canvas.nodeName != 'CANVAS' || !(canvas.getContext)){
						throw new Exception("Cannot bind to non-canvas element");
					}

					// calculate the width and height
					width = self.width();
					height = self.height();
					endx = width * settings.density;
					endy = height * settings.density;

					// snap the width and height
					canvas.width = width;
					canvas.height = height;

					// get the context and seed the perlin generator
					context = canvas.getContext('2d');
					perlin.seed();

					function draw(){
						// summary
						// Internal drawing function.
						var offset, outcome;

						// calculate some heavy numbers
						offset = runs * settings.density;

						// clear the screen and set a stroke style
						context.clearRect(0, 0, width, height);
						context.fillStyle = 'rgba(100,100,100,0.1)';
						context.strokeStyle = 'rgba(0,0,0,0.2)';

						// iterate through the rows
						for (var x = 0; x <= endx + 1; x++){
							// start a new vertical line for each column
							context.beginPath();

							// iterate through the columns
							for (var y = 1; y < endy; y++){
								// get some smooth noise
								outcome = 0.5 - perlin.d2.smooth(x + runs, endy/2.4 - y);

								// if the outcome is imaginary, dump it
								if (outcome < 0) {continue;}

								// translate the point and draw a suitable arc in the right direction
								context.arc((x / settings.density) - (runs % (1 / settings.density)), (y / settings.density), outcome * 20, 0, Math.PI * outcome, (outcome % 2) > 1 ? true : false);
							}

							// stroke the path
							context.fill();
							context.stroke();
						}

						// FIXME: random drift pushes the data out of the way
						// best to keep it short, anyway; about 4 minutes
						if (runs++ % 2000 === 0) {
							perlin.seed();
						}
					}

					// set and begin running the interval draw
					clearInterval(self.perlin_controller.interval);
					self.perlin_controller.interval = setInterval(draw, settings.frequency);
				},
				stop: function(){
					if (self.perlin_controller.interval !== null) {
						clearInterval(self.perlin_controller.interval);
						self.perlin_controller.interval = null;
					}
 				}
			};
		}
		
		return self.perlin_controller;
	};
})(jQuery);