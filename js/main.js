//wraps everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Nuclear", "Coal", "Natural Gas", "Peroleum", "Hydro", "Geothermal", "Solar", "Wind", "Biomass/Other"]; //list of attributes
var expressed = attrArray[0]; //initial attribute


var chartWidth = window.innerWidth * 0.425,
	chartHeight = 473,
	leftPadding = 25,
	rightPadding = 2,
	topBottomPadding = 5,
	chartInnerWidth = chartWidth - leftPadding - rightPadding,
	chartInnerHeight = chartHeight - topBottomPadding * 2,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

	//create a scale to size bars in relation to frame and axis
	var yScale = d3.scaleLinear()
		.range([463, 0])
		.domain([0, 110]);
		//used to fix problem of varibles with a space inbtween such as New York
		var NewYork = "New York";
		NewYork.replace(/ /g, "_")
//begin script when window loads
window.onload = setMap();
//set up choropleth map
function setMap(){

		//map frame dimensions
		var width = window.innerWidth * 0.5,
				height = 460;

		//create svg container
		var map = d3.select("body")
				.append("svg")
				.attr("class", "map")
				.attr("width", width)
				.attr("height", height)
				.attr("fill", "#488957");


		//create Albers equal area for the USA
		var projection = d3.geoAlbersUsa()

				.scale(990)
				.translate([width / 2, height / 2]);

		var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/ele_state_spatial.csv") //load attributes from csv
        .defer(d3.json, "data/states.topojson") //load choropleth spatial data
        .await(callback);

	  function callback(error, csvData, states){

		  	var colorScale = makeColorScale(csvData);

				//translate states TopoJSON
				var states = topojson.feature(states, states.objects.Export_Output).features;

				//join csv data to GeoJSON enumeration units
        states = joinData(states, csvData);

				//add enumeration units to the map
        setEnumerationUnits(states, map, path, colorScale);

				//add coordinated visualization to the map
        setChart(csvData, colorScale);

				createDropdown(csvData);
			};
}; //end of setMap()


function joinData(states, csvData){
		//loop through csv to assign each set of csv attribute values to geojson region
		for (var i=0; i<csvData.length; i++){
				var csvRegion = csvData[i]; //the current region
				var csvKey = csvRegion.name; //the CSV primary key

				//loop through geojson regions to find correct region
				for (var a=0; a<states.length; a++){

						var geojsonProps = states[a].properties; //the current region geojson properties
						var geojsonKey = geojsonProps.name; //the geojson primary key

						//where primary keys match, transfer csv data to geojson properties object
						if (geojsonKey == csvKey){

								//assign all attributes and values
								attrArray.forEach(function(attr){
										var val = parseFloat(csvRegion[attr]); //get csv attribute value
										geojsonProps[attr] = val; //assign attribute and value to geojson properties
								});
						};
				};
		};

    return states;
};

function setEnumerationUnits(states, map, path, colorScale){
		//add USA regions to map
		var regions = map.selectAll(".regions")
				.data(states)
				.enter()
				.append("path")
				.attr("class", function(d){
						return "regions " + d.properties.name.replace(/ /g, "_");
				})
				.attr("d", path)
				.style("fill", function(d){
					//console.log(d.properties[expressed], expressed);
            return choropleth(d.properties, colorScale);
							})
					.on("mouseover", function(d){
						highlight(d.properties);
					})
					.on("mouseout", function(d){
						dehighlight(d.properties);
					})
					.on("mousemove", moveLabel);

				//add style descriptor to each path
				var desc = regions.append("desc")
					.text('{"stroke": "#000", "stroke-width": "0.5px"}');
};


//Function to create color scale generator
function makeColorScale(data){
	//console.log(data);
    var colorClasses = [
        "#eff3ff",
				"#c6dbef",
        "#9ecae1",
				"#6baed6",
        "#4292c6",
        "#2171b5",
        "#084594"
    ];
		//create color scale generator
		    var colorScale = d3.scaleQuantile()
		        .range(colorClasses);

		    //build two-value array of minimum and maximum expressed attribute values
				var minmax = [
			 0.0001,
			 //d3.min(data, function(d) { return parseFloat(d.properties[expressed]); }),
			 d3.max(data, function(d) { return parseFloat(d[expressed]); })
	 ];
	    //assign two-value array as scale domain
	    colorScale.domain(minmax);

    return colorScale;

};


//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
				console.log(parseFloat(props[expressed]));
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && val > 0){
        return colorScale(val);
    } else {
        return "#fafafa";
    };
};


//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
					console.log(d);
            return "bar " + d.name.replace(/ /g, "_");
        })
				.attr("width", chartInnerWidth / csvData.length - 1)
				.on("mouseover", highlight)
				.on("mouseout", dehighlight)
				.on("mousemove", moveLabel);

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("% of Electrcity from " + expressed + " Power");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

		//add style descriptor to each rect
		var desc = bars.append("desc")
		.text('{"stroke": "none", "stroke-width": "0px"}');

		//set bar positions, heights, and colors
		updateChart(bars, csvData.length, colorScale);
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
				.attr("class", "dropdown")
				.on("change", function(){
						changeAttribute(this.value, csvData)
		});

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Energy Source");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    //recolor enumeration units
    var regions = d3.selectAll(".regions")
				.transition()
				.duration(1000)
				.style("fill", function(d){
					return choropleth(d.properties, colorScale)
				});
				//re-sort, resize, and recolor bars
		var bars = d3.selectAll(".bar")
				//re-sort bars
				.sort(function(a, b){
					return b[expressed] - a[expressed];
				})
				.transition() //add animation
				.delay(function(d, i){
					return i * 20
				})
				.duration(500);

		updateChart(bars, csvData.length, colorScale);

};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
	//position bars
	bars.attr("x", function(d, i){
			return i * (chartInnerWidth / n) + leftPadding;
		})
		//size/resize bars
		.attr("height", function(d, i){
			return 463 - yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d, i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
		//color/recolor bars
		.style("fill", function(d){
			return choropleth(d, colorScale);
		});

	//add text to chart title
	var chartTitle = d3.select(".chartTitle")
		.text("Percent of Electrcity from " + expressed + " Power");
};

//function to highlight enumeration units and bars
function highlight(props){
	//change stroke
	var selected = d3.selectAll("." + props.name.replace(/ /g, "_"))
		.style("stroke", "#EE7600")
		.style("stroke-width", "3");

	setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
	var selected = d3.selectAll("." + props.name.replace(/ /g, "_"))
		.style("stroke", function(){
			return getStyle(this, "stroke")
		})
		.style("stroke-width", function(){
			return getStyle(this, "stroke-width")
		});

	function getStyle(element, styleName){
		var styleText = d3.select(element)
			.select("desc")
			.text();

		var styleObject = JSON.parse(styleText);

		d3.select(".infolabel")
		.remove();

		return styleObject[styleName];
	};
};


//function to create dynamic label
function setLabel(props){
	//label content
	var labelAttribute = "<h1>" + props[expressed] + "%"
		"</h1>";

	//create info label div
	var infolabel = d3.select("body")
		.append("div")
		.attr("class", "infolabel")
		.attr("id", props.name + "_label")
		.html(labelAttribute);

	var regionName = infolabel.append("div")
		.attr("class", "labelname")
		.html(props.name);
};

//function to move info label with mouse
function moveLabel(){
	//get width of label
	var labelWidth = d3.select(".infolabel")
		.node()
		.getBoundingClientRect()
		.width;

	//use coordinates of mousemove event to set label coordinates
	var x1 = d3.event.clientX + 10,
		y1 = d3.event.clientY - 75,
		x2 = d3.event.clientX - labelWidth - 10,
		y2 = d3.event.clientY + 25;

	//horizontal label coordinate, testing for overflow
	var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
	//vertical label coordinate, testing for overflow
	var y = d3.event.clientY < 75 ? y2 : y1;

	d3.select(".infolabel")
		.style("left", x + "px")
		.style("top", y + "px");
};

})(); //last line of main.js
