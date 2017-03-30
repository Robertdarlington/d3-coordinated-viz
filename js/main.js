//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Nuclear", "Coal", "Natural Gas", "Peroleum", "Hydro", "Geothermal", "Solar", "Wind", "Biomass/Other"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

		//map frame dimensions
		var width = window.innerWidth * 0.5,
				height = 472;

		//create new svg container for the map
		var map = d3.select("body")
				.append("svg")
				.attr("class", "map")
				.attr("width", width)
				.attr("height", height)
				.attr("fill", "#488957");


		//create Albers equal area conic projection centered on France
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

				//translate states TopoJSON
				var states = topojson.feature(states, states.objects.Export_Output).features;

				//join csv data to GeoJSON enumeration units
        states = joinData(states, csvData);

				var colorScale = makeColorScale(states);

				//add enumeration units to the map
        setEnumerationUnits(states, map, path, colorScale);

				//add coordinated visualization to the map
        setChart(csvData, colorScale);

			};
}; //end of setMap()


function joinData(states, csvData){
    //...DATA JOIN LOOPS FROM EXAMPLE 1.1
		//variables for data join
		var attrArray = ["Nuclear", "Coal", "Natural Gas", "Peroleum", "Hydro", "Geothermal", "Solar", "Wind", "Biomass/Other"];

		//loop through csv to assign each set of csv attribute values to geojson region
		for (var i=0; i<csvData.length; i++){
				var csvRegion = csvData[i]; //the current region
				var csvKey = csvRegion.State; //the CSV primary key

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
    //...REGIONS BLOCK FROM MODULE 8
		//add USA regions to map
		var regions = map.selectAll(".regions")
				.data(states)
				.enter()
				.append("path")
				.attr("class", function(d){
						return "regions " + d.properties.name;
				})
				.attr("d", path)
				.style("fill", function(d){
					console.log(d.properties[expressed], expressed);
            return choropleth(d.properties, colorScale);
				});
};


//Example 1.4 line 11...function to create color scale generator
function makeColorScale(data){
	console.log(data);
    var colorClasses = [
        "#edf8fb",
				"#ccece6",
        "#99d8c9",
				"#66c2a4",
        "#41ae76",
        "#238b45",
        "#005824"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
				0.0001,
        //d3.min(data, function(d) { return parseFloat(d.properties[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d.properties[expressed]); })
    ];
		console.log(minmax);
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;

};


//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && val > 0){
        return colorScale(val);
    } else {
        return "#CFDDE3";
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

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.adm1_code;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("% of Electrcity from " + expressed + " Power in each State");

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
};








})(); //last line of main.js
