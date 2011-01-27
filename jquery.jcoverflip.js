/*
 * jCoverflip - Present your featured content elegantly.
 * Version: 1.1.0
 * Copyright 2010 New Signature
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the 
 * GNU General Public License as published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.  
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * You can contact New Signature by electronic mail at labs@newsignature.com 
 * or- by U.S. Postal Service at 1100 H St. NW, Suite 940, Washington, DC 20005.
 */
( function( $ ){
//
// Helpers
//
var undefined; // safeguards against anyone who wants to change the value of undefined in the global space

var nofn = function(){};

var proxy = function( context, fn ){
		return function( ){
			if( $.isFunction( fn ) ){
				return fn.apply( context, arguments );
			} else {
				return context[ fn ].apply( context, arguments );
			}
		};
	};



/**
 * Get an array of keys for an object
 */
var objectKeys = function( obj ){
	var r = [];
	
	for( var k in obj ){
		r.push(k);
	}
	
	return r;
};




/**
 * jQuery Plugin Factory
 *
 * A simple framework for creating jQuery plugins that have several 'methods'.
 * The result will be a plugin that you can initialize like this:
 *    $('#foo').myplugin(param1, param2).show();
 *
 * Then you can call methods 'toggle' and 'bar' with you plugin like this:
 *    $('#foo').myplugin('toggle', param1).myplugin('bar', param1, parma2).fadeIn();
 *
 * The methods can alos act as getters and return values:
 *    var v = $('#foo').myplugin('current');
 *
 * 1) Most of the work is in creating the methods which is just an object of functions.
 * 2) Any function name that starts with an underscore will not be exposed to the public.
 * 3) When the plugin initializes, it will call the method named '_init'.
 * 4) The 'this' object is for the each instance of the plugin.
 * 5) To get the element that the plugin is for, use this.element to get it.
 *
 * @param $ - the jQuery instance to add the plugin to
 * @param name - the name to call the plugin with
 * @param methods - an object of functions to add as methods
 *   Any method name that starts with an underscore will be private, it will not be exposed.
 *   The method named '_init' will be called when initializing.
 * @param getters - an array of methods that return values
 */
function jQueryPluginFactory( $, name, methods, getters ){
  getters = getters instanceof Array ? getters : [];
  var getters_obj = {};
  for(var i=0; i<getters.length; i++){
    getters_obj[getters[i]] = true;
  }

 
  // Create the object
  var Plugin = function(element){
    this.element = element;
  };
  Plugin.prototype = methods;
 
  // Assign the plugin
  $.fn[name] = function(){
    var args = arguments;
    var returnValue = this;
   
    this.each(function() {
      var $this = $(this);
      var plugin = $this.data('plugin-'+name);
      // Init the plugin if first time
      if( !plugin ){
        plugin = new Plugin($this);
        $this.data('plugin-'+name, plugin);
        if(plugin._init){
          plugin._init.apply(plugin, args);
        }
       
      // call a method
      } else if(typeof args[0] == 'string' && args[0].charAt(0) != '_' && typeof plugin[args[0]] == 'function'){
        var methodArgs = Array.prototype.slice.call(args, 1);
        var r = plugin[args[0]].apply(plugin, methodArgs);
        // set the return value if method is a getter
        if( args[0] in getters_obj ){
          returnValue = r;
        }
      }
     
    });
   
    return returnValue; // returning the jQuery object
  };
}; 





//
// Animation queue
//
animationqueue = { };

/**
 * Animation Queue
 * 
 * The AnimationQueue holds list of AnimationSets that each perform a set of animations. The sets
 * run in ordering when the AnimationQueue is animating. As well, the running time is distributed 
 * across all the sets when the AnimationQueue is animating.
 *
 * As well, the AnimationQueue can be stopped and started again at any time. AnimationSets can be 
 * removed when stopped when they are not needed anymore.
 *
 */
animationqueue.AnimationQueue = function(){
	this.sets = [];
	
	this.isRunning = false;
	this.current = 0;
	
	this.totalTime = 0;
	this.elapsedTime = 0;
	this.startTime = 1;
	this.poll = null;
};

animationqueue.AnimationQueue.prototype = {
	/**
	 * Add an AnimationSet to the end of the queue.
	 *
	 * @param animationSet
	 *   The AnimationSet object to add to the end of the queue.
	 */
	queue: function( animationSet ){
		this.sets.push( animationSet );
	},
	
	/**
	 * Start the animation.
	 *
	 * @param time
	 *   The total running time of the animation in milliseconds.
	 */
	start: function( time, callback ){
		this.totalTime = time;
		this.elapsedTime = 0;
		this.isRunning = true;
		
		callback = $.isFunction( callback )? callback : nofn;
		
		// calculate the how to divide the time between the sets
		// Each set gets 1 part of the time except for the first which can get less if "paused."
		var timeShare = 1; // total number of parts to divide the time by
		var firstTimeShare = 1; // the part for the first item
		if( this.sets.length > 0 ){
			timeShare = this.sets.length;
			firstTimeShare = this.sets[ 0 ].totalTime > 0? Math.max( 0, Math.min( 1, 1-(this.sets[ 0 ].elapsedTime / this.sets[ 0 ].totalTime) ) ): 1;
			//timeShare += firstTimeShare;
		} 
		var startTime = (new Date( )).getTime( );
		
		if( this.sets.length > 0 ){
			this.sets[ 0 ].start( firstTimeShare/timeShare*this.totalTime );
		}
		
		
		(function( self, totalTime, timeShare ){ 
			function poll( ){
				self.elapsedTime = (new Date( )).getTime( ) - startTime;
				
				if( self.sets.length && !self.sets[ 0 ].isRunning ){
					self.sets.shift( );
					if( self.sets.length ){
						self.sets[ 0 ].start( totalTime/timeShare );
					}
				}
				
				if( self.elapsedTime >= self.totalTime && self.sets.length == 0 ){
					callback( self.elapsedTime  );
					self.stop( );
				}
			}
			self.poll = setInterval( poll, 16 );
		} )( this, this.totalTime, timeShare );
	},
	
	/**
	 * Stop the animation.
	 */
	stop: function( ){
		if( this.isRunning ){
			this.isRunning = false;
			
			var i = this.sets.length;
			while( i-- ){
				this.sets[ i ].stop( );
			}
			
			clearInterval( this.poll );
		}
	},
	
	/**
	 * Remove an AnimationSet from the queue.
	 *
	 * @param animationSet
	 *   The AnimationSet to remove from the queue.
	 */
	remove: function( animationSet ){
		var i = this.sets.length;
		while( i-- ){
			if( this.sets[ i ] == animationSet ){
				var newSets = this.sets.slice( 0, i );
				this.animationSet =  newSets.push( this.sets.slice( i + 1 ) );
			}
		}
	},
	
	/**
	 * Get an array of all the AnimationSets in order. The array is not live, but the AnimationSets are.
	 *
	 * @return array of AnimationSets
	 */
	get: function( ){
		return this.sets.slice( 0 ); // .slice is to clone the array but not the objects
	}
};



/**
 *
 *
 *
 */
animationqueue.AnimationSet = function(){
	this.steps = [ ];
	this.isStepsSorted = true;
	this.currentStep = -1;
	this.animations = [ ];
	
	this.isRunning = false;
	this.totalTime = 0;
	this.elapsedTime = 0;
	
	this.poll = null;
	
	this.data = { };
};

animationqueue.AnimationSet.prototype = {
	/**
	 * Add an AnimationStep or Animation for this set.
	 *
	 * @param anim
	 *   The AnimationStep or Animation to add.
	 */
	add: function( anim ){
		if( anim instanceof animationqueue.AnimationStep ){
			this.steps.push( anim );
			this.isStepsSorted = false;
			++this.currentStep;
			
		} else if( anim instanceof animationqueue.Animation ){
			this.animations.push( anim );
		}
	},
	
	/**
	 * Start the set's animation.
	 *
	 * @param time
	 *   The total running time of the animation.
	 */
	start: function( time ){
		
		// Scale the previous elapsedTime to the new time
		this.elapsedTime = this.totalTime == 0? 0: this.elapsedTime/this.totalTime*time;
		this.totalTime = time;
		
		// prepare this to run
		if( !this.isStepsSorted ){
			// Reverse sort
			this.steps.sort( function( a, b ){
				return b.moment - a.moment;
			} );
			this.isStepsSorted = true;
		}
		
		this.isRunning = true;
		
		// Start the time up here right before any of the animation starts
		this.startTime = (new Date()).getTime() - this.elapsedTime;
		// Start up the animations
		var i = this.animations.length;
		while( i-- ){
			this.animations[ i ].start( this.totalTime );
		}
		
		// The polling function: this will run the steps at the right time and 
		// check for when the animations are finished.
		var self = this;
		var animationsIndex = this.animations.length-1;
		function poll( timeSince ){
			self.elapsedTime = (new Date()).getTime() - self.startTime;
			// Run any steps that should be run
			while( self.currentStep >= 0 && self.steps[ self.currentStep ].getTime( self.totalTime ) <= self.elapsedTime ){
				self.steps[ self.currentStep ].doIt( );
				--self.currentStep;
			}
			
			// Check if all the animations are finished
			if( self.elapsedTime >= self.totalTime && self.currentStep < 0){
				while( animationsIndex >= 0 && !self.animations[ animationsIndex ].isRunning ){
					--animationsIndex;
				}
				
				if( animationsIndex < 0 ){
					// finished
					self.reset( self.elapsedTime );
					
				}
			}
		}
		
		this.poll = setInterval( poll, 16 );
		
	},
	
	/**
	 * Stop the animation.
	 */
	stop: function( ){
		if( this.isRunning ){
			this.isRunning = false;
			if( this.poll ){
				clearInterval( this.poll );
			}
			var i = this.animations.length;
			while( i-- ){
				this.animations[ i ].stop( );
			}
		}
	},
	/**
	 * Set meta data for the set.
	 *
	 * @param key
	 *   The key for the meta data.
	 *
	 * @param data
	 *   The data.
	 */
	setData: function( key, data ){
		this.data[ key ] = data;
	},
	
	/**
	 * Get meta data for the set.
	 *
	 * @param key
	 *   The key used to save the meta data.
	 * 
	 * @return The value of the meta data
	 */
	getData: function( key ){
		return this.data[ key ];
	},
	
	/**
	 * Resets the set to beginning.
	 */
	reset: function( ){
		this.stop( );
		this.elapsedTime = 0;
		this.currentStep = this.steps.length-1;
	}
};







/**
 * A single step to occur during a set's animation.
 *
 * This is useful for handling one off things during a set's animation such 
 * as switch the z-index.
 *
 * @param $element
 *   The jQuery object for the element(s) to update their CSS
 * 
 * @param cssParams
 *   A key/value object of style properties. @see http://docs.jquery.com/CSS/css#properties
 *
 * @param moment
 *   A number from 0 to 1 for when as a percentage of the set's running time the 
 *   step should happen.
 */
animationqueue.AnimationStep = function( $element, cssParams, moment ){
	this.$element = $element;
	this.cssParams = cssParams;
	this.moment = Math.min( 1, Math.max( 0, moment ) );
};

animationqueue.AnimationStep.prototype = {
	
	/** 
	 * Get the time of execution
	 *
	 * @param totalTime
	 *   The total of time for the set this belongs to in milliseconds.
	 *
	 * @return The time in milliseconds this step needs to execute.
	 */
	getTime: function( totalTime ){
		return this.moment * totalTime;
	},
	
	/**
	 * Does the step action.
	 */
	doIt: function( ){
		this.$element.css( this.cssParams );
	}
};




/**
 * A single animation object for a jQuery object.
 *
 * @param $element
 *   The jQuery object for the element(s) to animate
 *
 * @param animateParams
 *   The object of CSS values to animate. @see http://docs.jquery.com/Effects/animate
 */
animationqueue.Animation = function( $element,  animateParams ){
	this.$element = $element;
	this.animateParams = $.isArray(animateParams) ? animateParams : [ animateParams ];
	this.isRunning = false;
};

animationqueue.Animation.prototype = {
	/**
	 * Start the animation.
	 *
	 * @param time
	 *   The running time of the animation (and the step) in milliseconds.
	 */
	start: function( time ){
		this.$element.stop( );
		
		if( time === 0 ){
			for( var i=0; i<this.animateParams.length; ++i ){
				this.$element.css( this.animateParams[i] );
			}
			self.isRunning = false;
		} else {
			
			// calculate the duration of each animation param
			if( this.animateParams.length > 1 ){
				var totalDur = 0; // total duration calculated
				var withoutDur = 0; // the number without a duration set
				var i=this.animateParams.length;
				while( i-- != 0 ){
					var dur = this.animateParams[i].animationDuration;
					if( !isNaN( dur ) && dur >= 0 ){
						totalDur += dur;
					} else {
						++withoutDur;
						delete this.animateParams[i].animationDuration;
					}
				}
				var emptyDurVal = 0;
				// case for when the total duration is less than 1, and there are animations that can fill in the gap
				if( withoutDur && totalDur < 1 ){
					emptyDurVal = (1-totalDur) / withoutDur; // the duration for those without value set
					totalDur = 1;
				}
				
				i=this.animateParams.length;
				// set the duration for each
				while( i-- != 0 ){
					if( !isNaN(this.animateParams[i].animationDuration) ){
						this.animateParams[i].animationDuration = this.animateParams[i].animationDuration / totalDur;
					} else {
						this.animateParams[i].animationDuration = emptyDurVal;
					}
				}
			
			// This is for the likely case that there is only one, to save time
			} else {
				this.animateParams[0].animationDuration = 1;
			}
			
			
			this.isRunning = true;
			for( var i=0; i<this.animateParams.length-1; ++i ){
				this.$element.animate( this.animateParams[i], time*this.animateParams[i].animationDuration );
			}
			this.$element.animate( this.animateParams[i], time*this.animateParams[i].animationDuration, proxy( this, function( ){ 
				this.isRunning = false; 
			} ) );
		}
	},
	
	/**
	 * Stop the animation.
	 */
	stop: function( ){
		this.$element.stop( );
		this.isRunning = false;
	}
};

























//
// The widget
//
//












// Static methods
$.jcoverflip = {
	/**
	 * Used for wrapping the animation for an element for returned by beforeCss, afterCss and 
	 * currentCss options.
	 *
	 * @param element
	 *   The jQuery element to run the animation on.
	 *
	 * @param animate
	 *   An object with CSS keys and values to animate to.
	 *
	 * @param steps
	 *   An object with keys from 0 to 1 (0 to 100%) for how far along in the animation (0: start,
	 *   0.5: half way through, 1: end) with the value being an object of CSS keys and values to change.
	 *   This is for discrete values that need to change such as z-index.
	 *
	 */
	animationElement: function( element, animate, steps ){ 
		return { element: element, animate: animate, steps: steps };
	},
	
	/**
	 * Find the item element and index number that the element is associated.
	 *
	 * @param element
	 *   The element that either is the item element or descendant element of the item element.
	 *
	 * @return 
	 *   null - if no item element is found
	 *   { element: <the item element>, index: <the item index> }
	 * 
	 */
	getItemFromElement: function( element ){
		element = $( element );
		var item = element.hasClass( 'ui-jcoverflip--item' )? element : element.parents( '.ui-jcoverflip--item' );
		
		if( item.size( ) == 0 ){
			return null;
		} else {
			return { element: item, index: item.data( 'jcoverflip__index' ) };
		}
	}
};



// The widget
var methods = {
	_init: function( args ){
		this.options = $.extend( defaults, args || {} );

		// init some internal values
		this.animationQueue = new animationqueue.AnimationQueue( );
		this.isInit = false; // used for setting up the CSS
		
		// Used to queue up overlapping goTo() calls since they come in async
		this.goToPoll = { id: null };
		this.goToQueue = [ ];
		
		
		// Setup the elements
		var items = this.items( );
		
		// add classes
		this.element.addClass( 'ui-jcoverflip' );
		items.addClass( 'ui-jcoverflip--item' );
		
		// Get the title for each item
		var i = items.size( );
		while( i-- ){
			var el = items.eq( i );
			
			// Tell the item what its index is
			el.data( 'jcoverflip__index', i );
			
			// Create the titles for the coverflow items
			var title = this.options.titles.create( el );
			title.css( { display: 'none' } ).addClass( 'ui-jcoverflip--title' ).appendTo( this.element );
			
			el.data( 'jcoverflip__titleElement', title );
		}
		
		// Bind the click action for when the user clicks on the item to change the current
		this.element.click( proxy( this, this._clickItem ) );
		
		// Setup wrap around
		if( this.options.wrapItemsAround ){
			this.options.wrapCenter = this.options.wrapCenter === undefined? this.options.current : this.options.wrapCenter;
		}
		
		// setup the positioning of the elements, pass 0 for time, pass true to flag to init
		this._goTo( this.options.current, 0, true );
		
		// Add any addition controls (such as a scroll bar)
		this.options.controls.create( this.element, this.length() );
	},
	
	
	
	/**
	 * The click event for an item. If the item is not current,
	 * then it calls the current() and stops the event.
	 */
	_clickItem: function( event ){
		if( this.options.disabled == true ){
				return;
			}
		
		var item = $.jcoverflip.getItemFromElement( event.target );
		
		if( item !== null && item.index != this.current( ) ){
			this.current( item.index, event );
			event.preventDefault();
			return false;
		}
		return true;
	},
	
	
	/**
	 * Parses the parameters for next and previous methods. Any of the parameters are optional.
	 */
	_nextAndPrevParameters: function( by, wrapAround, callback, originalEvent ){
		
		
		// originalEvent is an object
		if( typeof by == 'object' ){
			originalEvent = by;
		} else if( typeof wrapAround == 'object' ){
			originalEvent = wrapAround;
		} else if( typeof callback == 'object' ){
			originalEvent = callback;
		} else if( typeof originalEvent == 'object' ){
			originalEvent = originalEvent;
		} else {
			originalEvent = { };
		}
		
		// callback is a function
		if( $.isFunction( by ) ){
			callback = by;
		} else if( $.isFunction( wrapAround ) ){
			callback = wrapAround;
		} else if( $.isFunction( callback ) ){
			callback = callback;
		} else {
			callback = nofn;
		}
		
		// wrapAround is boolean
		if( typeof( by ) == 'boolean' ) {
			wrapAround = by;
		} else if( typeof( wrapAround ) == 'boolean' ){
			wrapAround = wrapAround;
		} else {
			wrapAround = true;
		}
		
		// by is a number
		by = isNaN( parseInt( by ) )? 1 : parseInt( by );
		
		return { by: by, wrapAround: wrapAround, callback: callback, originalEvent: originalEvent };
	},
	
	
	/**
	 * Step to the right from the current.
	 *
	 * @param by
	 *   (optional) An integer to step to the right by. Defaults to 1.
	 *
	 * @param wrapAround
	 *   (optional) A boolean flag to wrap around if moving past the end. Defaults to true.
	 *
	 * @return
	 *   New current number
	 */
	next: function( by, wrapAround, callback, originalEvent ){
		if( this.options.disabled == true ){
				return;
			}
		
		var params = this._nextAndPrevParameters( by, wrapAround, callback, originalEvent );
		
		return this._nextAux( params.by, params.wrapAround, params.callback, params.originalEvent, 'next' );
	},
	
	
	
	_nextAux: function( by, wrapAround, callback, originalEvent, eventType ){
		by = by === undefined && isNaN( by ) ? 1 : parseInt( by );
		wrapAround = wrapAround !== false;
		
		var current = this.current( );
		var oldCurrent = current;
		var length = this.length( );
		
		if( wrapAround ){
			current = (current + by) % length;
			// If "current + by" is negative, then the result of "%" is between -(length-1) and -1.
			// Add the length, if negative, to bring the index back to a valid number
			current = current < 0 ? current + length : current; 
		} else {
			current = Math.min( length-1, Math.max( 0, current + by ) );
		}
		
		if( current != this.current( ) ){
			this.current( current, originalEvent );
		}
		
		if( eventType && oldCurrent != current ){
			var event = $.Event( originalEvent );
			event.type = this.widgetEventPrefix + eventType;
			callback.call( this.element, event, { from: oldCurrent, to: current } );
			this._trigger( eventType, originalEvent, { from: oldCurrent, to: current } );
		}
		
		return current;
	},
	
	
	
	/**
	 * Step to the left from the current.
	 *
	 * @param by
	 *   (optional) An integer to step to the left by. Defaults to 1.
	 *
	 * @param wrapAround
	 *   (optional) A boolean flag to wrap around if moving past the end. Defaults to true.
	 *
	 * @return
	 *   New current number
	 *
	 */
	previous: function( by, wrapAround, callback, originalEvent ){
		if( this.options.disabled == true ){
				return;
			}
		
		var params = this._nextAndPrevParameters( by, wrapAround, callback, originalEvent );
		
		return this._nextAux( -1*params.by, params.wrapAround, params.callback, params.originalEvent, 'previous' );
	},
	
	
	
	/**
	 * Go all the way to the left.
	 */
	first: function( callback, originalEvent ){
		if( this.options.disabled == true ){
				return;
			}
		
		if( typeof callback == 'object' ){
			originalEvent = callback
		} else if( typeof originalEvent == 'object' ){
			originalEvent = originalEvent;
		} else {
			originalEvent = { };
		}
		
		callback = $.isFunction( callback ) ? callback : nofn;
		
		var from = this.current( );
		var to = this.current( 0, originalEvent );
		if( from != to ){
			var event = $.Event( originalEvent );
			event.type = this.widgetEventPrefix + 'first';
			callback.call( this.element, event, { from: from, to: to } );
			this._trigger( 'first', originalEvent, { from: from, to: to } ); 
		}
	},
	
	
	
	/**
	 * Go all the way to the right.
	 */
	last: function( callback, originalEvent ){
		if( this.options.disabled == true ){
				return;
			}
		
		if( typeof callback == 'object' ){
			originalEvent = callback
		} else if( typeof originalEvent == 'object' ){
			originalEvent = originalEvent;
		} else {
			originalEvent = { };
		}
		
		callback = $.isFunction( callback ) ? callback : nofn;
		
		var from = this.current( );
		var to = this.current( this.length( ) - 1, originalEvent );
		if( from != to ){
		var event = $.Event( originalEvent );
			event.type = this.widgetEventPrefix + 'last';
			callback.call( this.element, event, { from: from, to: to } );
			this._trigger( 'last', originalEvent, { from: from, to: to } ); 
		}
	},
	
	
	
	/**
	 * Gets or sets the current item.
	 * 
	 * @param originalEvent (optional)
	 *   Pass an event object along to be assigned to the originalEvent for the event object passed
	 *   along with the triggered events of start, stop and change.
	 */
	current: function( newCurrent, originalEvent ){
		
		if( newCurrent !== undefined && !isNaN( newCurrent ) && !this.options.disabled && newCurrent != this.options.current ){
			this._goTo( newCurrent, undefined, false, originalEvent );
		}
		
		return this.options.current;
	},
	
	
	
	destroy: function( ){
		if( this.options.disabled == true ){
				return;
			}
		
		// let others clean up first
		this._trigger( 'destroy', {} );
		
		// container element
		this.element.removeClass( 'ui-jcoverflip' );
		
		
		// titles
		var items = this.items( );
		var titleEl;
		var i = items.length;
		while( i-- ){
			titleEl = items.eq( i ).data( 'jcoverflip__titleElement' );
			this.options.titles.destroy( titleEl );
		}
		
		
		// items
		// aggressively remove all inline styles
			items
				.removeClass( 'ui-jcoverflip--item' )
				.find( '*' ).add( items.get( ) )
				.each( function( ){
					this.removeAttribute( 'style' );
					
				} );
		
		
		// controls
		this.options.controls.destroy( this.element );
		
		
		// default action
		$.widget.prototype.destroy.apply( this, arguments );
	},
	
	
	enable: function( ){
		this.options.disabled  = false;
		this._trigger( 'enable', {} );
	},
		
	
	disable: function( ){
		this.options.disabled = true;
		this._trigger( 'disable', {} );
	},
	
	
	option: function( name, value ){
		
		// getter
		if( typeof value == 'undefined' ){
			return $.widget.prototype.option.apply( this, arguments );
		}
		
		// setter
		
		// current
		if( name == 'current' ){
			return this.current( value );
		}
		
		// TODO: dynamic changing of the options: items, titles, controls
		// items, titles, controls
		if( name in { 'items': '', 'titles': '', 'controls': '' } ){
			return this.options.items;
		}
		
		// beforeCss, afterCss, currentCss
		if( name in { 'beforeCss': '', 'afterCss': '', 'currentCss': '' } ){
			this.options[ name ] = value;
			// force update positioning
			this._goTo( this.current( ), 0, true );
		}
		
		// time
		if( name == 'time' && isNaN( parseInt( value ) ) && parseInt( value ) < 0 ){
			return this.options.time;
		}
		
		// Default action
		return $.widget.prototype.option.apply( this, arguments );
	},
	
	
	
	/**
	 * Go to a particular coverflow item.
	 *
	 * @param index
	 *   The item index.
	 *
	 * @param time
	 *   Optional. The time to do the animation to the new item in.
	 *
	 */
	_goTo: function( index, time, force, originalEvent ){
			if( this.options.disabled == true ){
				return;
			}
			
			force = !!force;
			originalEvent = originalEvent == undefined? { } : originalEvent;
			
			// Get the time to run
			time = time === undefined? this.options.time: parseInt( time );
			
			// Setup current and oldCurrent
			var oldCurrent = this.options.current;
			var current = Math.floor( Math.max( 0, Math.min( index, this.length( )-1 ) ) );
			this.options.current = current;
			
			
			// Start working on the animation queue
			// 1. Stop the current animation
			// 2. Remove sets that are moving away from the current item
			// 3. Add needed sets to move towards the current item
			// 4. Start the animation queue
			this.animationQueue.stop( );
			
			// Clear out any sets that are moving away from the current item
			var animationSets = this.animationQueue.get( );
			var i = animationSets.length;
			while( i-- ){
				var to = animationSets[ i ].getData( 'to' );
				var goingToTheRight =  animationSets[ i ].getData( 'goingToTheRight' );
				var rightOfCurrent = to > current;
				if( rightOfCurrent != goingToTheRight ){
					this.animationQueue.remove( animationSets[ i ] );
				}
			}
			
			animationSets = this.animationQueue.get( ); // update it since we may have changed the it by removing sets above
			// How many steps from the old current item to the new current item
			var stepsToCurrent = animationSets.length > 0? animationSets.pop( ).getData( 'to' ) : oldCurrent;
			var goingToTheRight = stepsToCurrent < current; // direction of movement
			stepsToCurrent += goingToTheRight? 1: -1; // advance to the next since we don't need to animate to our current position
			
			
			// Special case for the first run
			if( force ){
				stepsToCurrent = current;
			}
			
			var fromOffset = this.getOffset(oldCurrent),
			    lastToOffset = fromOffset,
				goingRight = fromOffset[ current ] > 0,
				numberOfSteps = Math.abs(fromOffset[ current ]),
			    items = this.items( ),
			    startFrom = goingRight? current - numberOfSteps : current + numberOfSteps,
			    minOffset = this.options.wrapItemsAround ? -1*this.options.wrapCenter : 1-items.length,
			    maxOffset = this.options.wrapItemsAround ? items.length-1-this.options.wrapCenter : items.length-1;
			
			// Special case the first time this is created
			if( force && numberOfSteps==0 ){
				numberOfSteps = 1;
				startFrom += goingRight? -1: 1;
			}
			
			// The main animation setup loop
			// Loops for the number of places the items have to move
			for( var step=1; step <= numberOfSteps; ++step ){
				var stepIndex = startFrom + (goingRight? step: -1*step);
				var toOffset = this.getOffset( stepIndex );
				
				// Create a set
				var animationSet = new animationqueue.AnimationSet( );
				this.animationQueue.queue( animationSet );
				animationSet.setData( 'goingToTheRight', goingRight );
				animationSet.setData( 'to', stepIndex );
				
				
				var ii=items.length;
				while( ii--!=0 ) {
					var el = items.eq(ii);
					
					// current
					if( toOffset[ii]==0 ){
						var css = this.options.currentCss( el, this.element, step == numberOfSteps );
						
					// from start to end
					} else if( lastToOffset[ii]==minOffset && toOffset[ii]==maxOffset ){
						if( this.options.startToEndCss ){
							var css = this.options.startToEndCss( el, this.element, toOffset[ii]-1, -1*lastToOffset[ii]-1 );
						} else {
							var css = this.options.afterCss( el, this.element, toOffset[ii]-1 );
						}
					// from end to start
					} else if( lastToOffset[ii]==maxOffset && toOffset[ii]==minOffset ){
						if( this.options.endToStartCss ){
							var css = this.options.endToStartCss( el, this.element, -1*toOffset[ii]-1, lastToOffset[ii]-1 );
						} else {
							var css = this.options.beforeCss( el, this.element, -1*toOffset[ii]-1 );
						}
					// after
					} else if( toOffset[ii]>0 ){
						var css = this.options.afterCss( el, this.element, toOffset[ii]-1 );
						
					// before
					} else if( toOffset[ii]<0 ){
						var css = this.options.beforeCss( el, this.element, -1*toOffset[ii]-1 );
					}
					
					// Push all the animation info onto the animation queue
					var j = css.length;
					while( j-- ){
						var cssI = css[ j ];
						animationSet.add( new animationqueue.Animation( cssI.element, cssI.animate ) ); 
						for( var step in cssI.steps ){
							animationSet.add( new animationqueue.AnimationStep( cssI.element, cssI.steps[ step ], parseFloat( step ) ) );
						}
					}
				}
				
				// for determining if the item moved from start to end and vice-versa
				lastToOffset = toOffset;
				
			}
			
			// hide/show the title
			var titleElement = items.eq( current ).data( 'jcoverflip__titleElement' );
			if( titleElement ){
				this.options.titleAnimateIn( titleElement, time, goingToTheRight );
			}
			
			if( current != oldCurrent ){ // prevent the case where current and oldCurrent are the same
				
				var titleElement = items.eq( oldCurrent ).data( 'jcoverflip__titleElement' );
				
				if( titleElement ){
					this.options.titleAnimateOut( titleElement, time, goingToTheRight );
				}
			}
			
			if( !force ){
				// Trigger the start event 
				this._trigger( 'start', originalEvent, { to: current, from: oldCurrent } );
				// run the animation and set a callback to trigger the stop event
				this.animationQueue.start( time, proxy( this, function( timeElapsed ){
						this._trigger( 'stop', originalEvent, { to: current, from: oldCurrent, time: timeElapsed} );
					} ) ); 
				
				this._trigger( 'change', originalEvent, { to: current, from: oldCurrent } );
			} else {
				this.animationQueue.start( time, nofn );
			}
			
			// Used to create the functions for creating AnimationSteps
			function stepFactory( el, css ){
				return function( ){
						el.css( css );
					};
			};
			
			
		},
	
	
	/**
	 * Get the item elements
	 *
	 * Returns the items based on the selector string found in options.items, if not defined, then
	 * the children of the jcoverflip element will be the items.
	 *
	 * @param reload - boolean flag to clear the cache of elements that are the items
	 *
	 * @return jQuery object of items
	 */
	items: function( reload ){
			if( this.itemsCache === undefined || !!reload ){
				if( this.options.items ){
					this.itemsCache = this.element.find( this.options.items );
				} else {
					this.itemsCache = this.element.children( );
				}
			}
			
			return this.itemsCache;
		},
	
	
	
	/**
	 * Get length
	 *
	 * Returns the number of items.
	 */
	length: function( ){
		var items = this.items( );
		return items.length;
	},
	
	
	
	/**
	 * Get offset object
	 *
	 * Returns an object that maps an item index to its position.
	 */
	getOffset: function( current ){
		var r = {}, 
		    length = this.length();
		
		if( !this.options.wrapItemsAround ){
			for( var i=0; i<length; ++i ){
				r[i] = i-current;
			}
		} else {
			var min = -1*this.options.wrapCenter,
			    minStart = ( current - this.options.wrapCenter + length ) % length,
			    max = length + min;
			
			for( var i=minStart, j=min; j<max; ++j, i=(i+1)%length ){
				r[i] = j;
			}
		}
		
		return r;
	},
	
	
	/**
	 * Copied from jQuery UI
	 */
	_trigger: function(type, event, data) {
		var callback = this.options[type],
			eventName = (type == 'jcoverflip'
				? type : 'jcoverflip' + type);

		event = $.Event(event);
		event.type = eventName;

		// copy original event properties over to the new event
		// this would happen if we could call $.event.fix instead of $.Event
		// but we don't have a way to force an event to be fixed multiple times
		if (event.originalEvent) {
			for (var i = $.event.props.length, prop; i;) {
				prop = $.event.props[--i];
				event[prop] = event.originalEvent[prop];
			}
		}

		this.element.trigger(event, data);

		return !($.isFunction(callback) && callback.call(this.element[0], event, data) === false
			|| event.isDefaultPrevented());
	}
	
	
	
};









var defaults = {
	items: '',
	
	/**
	 *	Controls the CSS/Animation for items that go from the start to the end
	 * 
	 *
	 * @param el jQuery element - the item element
	 * @param container jQuery element - the container element
	 * @param endOffset int - the offset of the item at the end (where the animation ends)
	 * @param startOffset int - the offset of the item at the start (where the animation starts)
	 */
	startToEndCss: function( el, container, endOffset, startOffset ){
		return [
				$.jcoverflip.animationElement( el, { left: ( container.width( )/2 + 110 + 110*endOffset )+'px', bottom: '20px' }, { } ),
				$.jcoverflip.animationElement( el.find( 'img' ), [
					{ opacity: 0.2, width: '50px' },
					{ opacity: 0.5, width: '100px' }
					], {} )
			];
		},
	
	/**
	 *	Controls the CSS/Animation for items that go from the end to the start
	 *
	 * @param el jQuery element - the item element
	 * @param container jQuery element - the container element
	 * @param startOffset int - the offset of the item at the start (where the animation ends)
	 * @param endOffset int - the offset of the item at the end (where the animation starts)
	 */
	endToStartCss: function( el, container, endOffset, startOffset ){ 
		return [
				$.jcoverflip.animationElement( el, { left: ( container.width( )/2 - 210 - 110*endOffset )+'px', bottom: '20px' }, { } ),
				$.jcoverflip.animationElement( el.find( 'img' ), [
					{ opacity: 0.2, width: '50px' },
					{ opacity: 0.5, width: '100px' }
					], {} )
			];
		},
	
	/**
	 * Controls the CSS/Animation for items before the current
	 *
	 * @param el jQuery element - the item element
	 * @param container jQuery element - the container element
	 * @param offset int - the offset of the item from the current starting with zero
	 */
	beforeCss: function( el, container, offset ){
		return [
			$.jcoverflip.animationElement( el, { left: ( container.width( )/2 - 210 - 110*offset )+'px', bottom: '20px' }, { } ),
			$.jcoverflip.animationElement( el.find( 'img' ), { opacity: 0.5, width: '100px' }, {} )
		];
	},
	
	/**
	 * Controls the CSS/Animation for items after the current
	 *
	 * @param el jQuery element - the item element
	 * @param container jQuery element - the container element
	 * @param offset int - the offset of the item from the current starting with zero
	 */
	afterCss: function( el, container, offset ){
		return [
			$.jcoverflip.animationElement( el, { left: ( container.width( )/2 + 110 + 110*offset )+'px', bottom: '20px' }, { } ),
			$.jcoverflip.animationElement( el.find( 'img' ), { opacity: 0.5, width: '100px' }, {} )
		];
	},
	
	/**
	 * Controls the CSS/Animation for item that is the current
	 *
	 * @param el jQuery element - the item element
	 * @param container jQuery element - the container element
	 * @param isFinal boolean - a flag if the item is going to stop as the current or if it is passing through the current place to its final location
	 */
	currentCss: function( el, container, isFinal ){
		if( isFinal ){
			return [
				$.jcoverflip.animationElement( el, { left: ( container.width( )/2 - 100 )+'px', bottom: 0 }, { } ),
				$.jcoverflip.animationElement( el.find( 'img' ), { opacity: 1, width: '200px' }, { } )
			];
		} else {
			return [
				$.jcoverflip.animationElement( el, { left: ( container.width( )/2 - 50 )+'px', bottom: '20px' }, { } ),
				$.jcoverflip.animationElement( el.find( 'img' ), { opacity: 0.5, width: '100px' }, { } )
			];
		}
	},
	time: 500, // half a second
	
	titles: {
		/** 
		 *
		 * @param el - item element
		 *
		 * @return jQuery element object of the title
		 *
		 * Order for finding the title
		 * 1) An element with a class of "title"
		 * 2) The title attribute of the item
		 * 3) The alt attribute of the item
		 * 4) The first title or alt attribute of a child element of the item
		 */
		create: function( el ){
			var titleText = '';
			var title = $( [] );
			var titleEl = el.find( '.title:first' );
			if( titleEl.size( ) == 1 ){
				title = titleEl.clone( true );
				titleEl.css( 'display', 'none' );
				title.data( 'jcoverflip__origin', 'cloned' );
				title.data( 'jcoverflip__source', titleEl );
			} else if( el.attr( 'title' ) ) {
				titleText = el.attr( 'title' );
			} else if( el.attr( 'alt' ) ) {
				titleText = el.attr( 'alt' );
			} else {
				titleEl = el.find( '[title], [alt]' ).eq( 0 );
				if( titleEl.size( ) == 1 ){
					titleText = titleEl.attr( 'title' ) || titleEl.attr( 'alt' ) || '';
				}
			}
			
			if( title.size( ) ){
				title.css( { 'opacity': 0, 'display': 'block' } );
			} else {
				title = $( '<span class="title">' + titleText + '</span>' );
				title.data( 'jcoverflip__origin', 'attribute' );
			}
			return title;
		},
		/**
		 * 
		 * @param el - title element
		 */
		destroy: function( el ){
			if( el.data( 'jcoverflip__origin' ) == 'cloned' ){
				el.data( 'jcoverflip__source' ).css( 'display', '' );
			}
			el.remove( );
		}
	},
	
	titleAnimateIn: function( titleElement, time, offset ){
		if( titleElement.css( 'display' ) == 'none' ){
			titleElement.css({opacity: 0, display: 'block'});
		}
		titleElement.stop( ).animate({opacity: 1}, time );
	},
	titleAnimateOut: function( titleElement, time, offset ){
		titleElement.stop( ).animate( {opacity: 0 }, time, function(){ 
			$(this).css('display', 'none'); 
		} );
	},
	controls: {
		/**
		 * @param containerElement - the jQuery object for the jcoverflip
		 * @param length - the number of items
		 */
		create: nofn,
		/**
		 * @param containerElement - the jQuery object for the jcoverflip
		 */
		destroy: nofn
	},
	current: 0
};


// specify  the getters
var getters = [ 'length', 'current'  ];


// Create the plugin
jQueryPluginFactory(jQuery, 'jcoverflip', methods, getters);



} )( jQuery );