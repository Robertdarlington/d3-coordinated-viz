//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

		//map frame dimensions
		var width = 1415,
				height = 660;

		//create new svg container for the map
		var map = d3.select("body")
				.append("svg")
				.attr("class", "map")
				.attr("width", width)
				.attr("height", height)
				.attr("fill", "#488957");


		//create Albers equal area conic projection centered on France
		var projection = d3.geoAlbersUsa()

				.scale(1300)
				.translate([width / 2, height / 2]);

		var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/electrcity_production_per_state.csv") //load attributes from csv
        .defer(d3.json, "data/states.topojson") //load choropleth spatial data
        .await(callback);

	  function callback(error, csvData, states){
				//translate states TopoJSON
				var states = topojson.feature(states, states.objects.Export_Output).features;

				//add France regions to map
        var regions = map.selectAll(".regions")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.adm1_code;
            })
            .attr("d", path);

				//examine the results
				console.log(states);

					};



};
