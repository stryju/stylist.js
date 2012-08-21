window.stylist = ( function( doc, undefined ) {
	"use strict";

	var instantiated;

	//// debug
	var debug = true;
	function log() {
		if ( debug && "console" in window ) {
			window.console.log.apply( console, arguments );
		}
	}

	//// internals
	function isEmpty( object ) {
		if ( typeof object !== "object" ) {
			return true;
		}

		var prop;

		for ( prop in object ) {
			if ( object.hasOwnProperty( prop )) {
				return false;
			}
		}

		return true;
	}

	if ( ! ( "trim" in String )) {
		String.prototype.trim = function(){
			return this.replace( /^\s*|\s*$/g, '' );
		};
	}

	if ( ! ( "includes" in Array )) {
		Array.prototype.includes = function( obj ){
			return ~this.indexOf( obj );
		};
	}

	function merge_objects( obj1, obj2 ){
		var obj3 = {};
		var prop;

		for ( prop in obj1 ) {
			if ( obj1.hasOwnProperty( prop )) {
				obj3[ prop ] = obj1[ prop ];
			}
		}
		for ( prop in obj2 ) {
			if ( obj2.hasOwnProperty( prop )) {
				obj3[ prop ] = obj2[ prop ];
			}
		}

		return obj3;
	}

	//// global styles object
	var rulesets = {};

	var regexs = {
		color : /\s(#[0-9a-f]{3}|#[0-9a-f]{6}|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|rgba?\([0-9 ,.%]+\)|hsla?\([0-9 ,.%]\))|\s/i, // via http://www.w3.org/TR/css3-color/#colorunits
		units : /\s([0-9]+[0-9.]*(px|%|rem|em|mm|cm)?|\s)+/ig
	};

	var style_element;

	var size = 0;

	var dom = {
		add : function( css_class ){
			if ( !style_element ) {
				style_element = dom.init();
			}
			style_element.insertRule( [ ".", css.prefix, css_class, "{", ruleset.print( rulesets[ css_class ]), "}" ].join( "" ), css.dom_i++ );
		},
		remove : function( index ){
			if ( !style_element ) {
				style_element = dom.init();
			}
			style_element.deleteRule( index );
		},
		init : function(){
			var el = doc.createElement( "style" );
			el.setAttribute( "id", "stylist:style" );
			doc.getElementsByTagName( "head" )[ 0 ].appendChild( el );
			return doc.styleSheets[ doc.styleSheets.length - 1 ];
		}
	};

	// internal css object
	var css = {
		i : 0,
		dom_i : 0,
		prefix : "stylist\\:",
		shorthand : {
			__shared : {
				4321 : {
					parse : function( prop, str ){
						var rules = {};
						var match = ( " " + str + " " ).match( regexs.units );
						if ( match ) {
							var vals = match[ 0 ].split( " " );
							// get rid of 2 empty items
							vals.shift();
							vals.pop();
							// 1st value is always top
							rules.top    = vals[ 0 ];
							// now assign the rest values to rules
							switch ( vals.length ) {
								case 4:
									rules.right  = vals[ 1 ];
									rules.bottom = vals[ 2 ];
									rules.left   = vals[ 3 ];
									break;
								case 3:
									rules.right  = rules.left = vals[ 1 ];
									rules.bottom = vals[ 2 ];
									break;
								case 2:
									rules.right  = rules.left = vals[ 1 ];
									rules.bottom = vals[ 0 ];
									break;
							}
							log( "stylist :: css :: shorthand :: " + prop, [ str ], "parsed as", [ rules ] );
						}
						return rules;
					},
					print : function( prop, ruleset ){
						var out = [ prop, ":", ruleset.top ];

						if ( ruleset.bottom !== ruleset.top ) {
							out.push( " " );
							out.push( ruleset.right );
							out.push( " " );
							out.push( ruleset.bottom );
							if ( ruleset.right !== ruleset.left ) {
								out.push( " " );
								out.push( ruleset.left );
							}
						} else {
							if ( ruleset.right !== ruleset.left ) {
								out.push( " " );
								out.push( ruleset.right );
								out.push( " " );
								out.push( ruleset.bottom );
								out.push( " " );
								out.push( ruleset.left );
							} else if ( ruleset.right !== ruleset.top ) {
								out.push( " " );
								out.push( ruleset.right );
								out.push( " " );
								out.push( ruleset.bottom );
							} else if ( ruleset.left !== ruleset.top ) {
								out.push( " " );
								out.push( ruleset.right );
								out.push( " " );
								out.push( ruleset.bottom );
								out.push( " " );
								out.push( ruleset.left );
							}
						}

						return out.join( "" );
					}
				}
			},
			background : {
				parse : function( str ){
					var rules = {};
					var regex = {
						attachment : /\s(fixed|scroll|static)\s/i,
						image      : /\s(url\(.*\)|(-(webkit|moz|o|ms)-)(linear|radial)-gradient\(.*\))\s/i,
						color      : regexs.color,
						repeat     : /\s(no-repeat|repeat-x|repeat-y|repeat)\s/i,
						position   : /\s([0-9]+[0-9.]*(px|%|rem|em|mm|cm)?|top|bottom|right|left|center)([ ]+([0-9]+[0-9.]*(px|%|rem|em|mm|cm)?|top|bottom|right|left|center))?\s/i
					};
					var test, match;

					for ( test in regex ) {
						match = ( " " + str + " " ).match( regex[ test ] );
						if ( match ) {
							rules[ test ] = match[0].trim();
						}
					}

					log( "stylist :: css :: shorthand :: background", [ str ], "parsed as", [ rules ] );

					return rules;
				},
				print : function( ruleset ){
					var tpl = "{color} {image} {repeat} {position}";
					for ( var rule in ruleset ) {
						if ( ruleset.hasOwnProperty( rule )) {
							tpl = tpl.replace( [ "{", rule, "}" ].join(""), ruleset[ rule ]);
						}
					}
					return [ "background:", tpl.replace( /\{.*\}/g, "" ).replace( /\s\s+/g, " " ).trim() ].join( "" );
				}
			},
			margin : {
				parse : function( str ){
					return css.shorthand.__shared[ "4321" ].parse( "margin", str );
				},
				print : function( ruleset ) {
					return css.shorthand.__shared[ "4321" ].print( "margin", ruleset );
				}
			},
			padding : {
				parse : function( str ){
					return css.shorthand.__shared[ "4321" ].parse( "padding", str );
				},
				print : function( ruleset ) {
					return css.shorthand.__shared[ "4321" ].print( "padding", ruleset );
				}
			}
		}
	};

	var ruleset = {
		add : function( rules, css_class ){
			if ( !css_class ) {
				css_class = "class" + css.i++;
			}
			if ( css_class in rulesets ) {
				rulesets[ css_class ] = this.merge( rulesets[ css_class ], this.parse( rules ));
			} else {
				rulesets[ css_class ] = this.parse( rules );
			}
			rulesets[ css_class ].__index = dom.add( css_class );
			return ( css.prefix + css_class ).replace( /\\:/g, ":" );
		},
		remove : function( css_class ){
			dom.remove( rulesets[ css_class ].__index );
			delete rulesets[ css_class ];
		},
		print : function( css_class ){
			if ( css_class && typeof css_class === "object" ) {
				var rule;
				var buffer = [];
				var value;
				for ( rule in css_class ) {
					if ( rule !== "_index" ) {
						value = css_class[ rule ];
						if ( typeof value === "object" ) {
							value = css.shorthand[ rule ].print( value );
						} else {
							value = [ rule, value ].join( ":" );
						}
						buffer.push( value );
					}
				}
				return buffer.join( ";" );
			} else if ( css_class ) {
				log( "printing single class", [ css_class, rulesets[ css_class ]]);
				return rulesets[ css_class ];
			} else {
				log( "printing all classes", [ rulesets ]);
				return rulesets;
			}
		},
		merge : function(){},
		parse : function( rules ){
			if ( typeof rules === "string" ){
				log( "stylist :: parser :: rules from string", [ rules ] );
				var split = rules.split(";");
				var len = split.length;
				var i = 0;
				var prop_val;
				var prop;
				var val;

				rules = {};

				for (; i < len; i++) {
					if ( split[ i ]) {
						prop_val = split[ i ].split( ":" );
						prop = prop_val[ 0 ].trim().toLowerCase();
						val  = prop_val[ 1 ].trim();
						if ( prop in css.shorthand ) {
							rules[ prop ] = css.shorthand[ prop ].parse( val );
							log( css.shorthand[ prop ].print( rules[ prop ]));
						} else {
							rules[ prop ] = val;
						}
					}
				}
			}
			return rules;
		}
	};

	instantiated = instantiated||(function(){
		log( "stylist :: init" );
		return {
			add : function( rules, css_class ){
				if ( !rules || typeof rules !== "string" && isEmpty( rules ) ) {
					return false;
				}

				return ruleset.add( rules, css_class );
			},
			remove : function( css_class ){
				return ruleset.remove( css_class );
			},
			print : function( css_class ){
				return ruleset.print( css_class );
			}
		};
	})();

	return instantiated;
})( document );
